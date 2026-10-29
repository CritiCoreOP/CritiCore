import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { redactUrls, safeErrorMessage } from "../_shared/redact.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Check = {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down" | "unconfigured";
  latency_ms: number | null;
  detail?: string;
};

const TIMEOUT_MS = 12000;

// The status banner asks on every page view. Without a snapshot each request ran six upstream
// checks (Twitch token, OMDb quota, TVDB login …) plus three database requests.
const SNAPSHOT_KEY = "api-status:snapshot";
const SNAPSHOT_TTL_MS = 3 * 60 * 1000;

async function timed(
  id: string,
  name: string,
  fn: () => Promise<{ ok: boolean; detail?: string }>,
): Promise<Check> {
  const started = Date.now();
  try {
    const res = await Promise.race([
      fn(),
      new Promise<{ ok: boolean; detail?: string }>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
      ),
    ]);
    const latency = Date.now() - started;
    const slow = latency > 2500;
    return {
      id,
      name,
      status: res.ok ? (slow ? "degraded" : "operational") : "down",
      latency_ms: latency,
      detail: res.detail ? redactUrls(res.detail) : undefined,
    };
  } catch (e) {
    return {
      id,
      name,
      status: "down",
      latency_ms: Date.now() - started,
      // The detail is shown on the public status page
      detail: safeErrorMessage(e),
    };
  }
}

function unconfigured(id: string, name: string): Check {
  return { id, name, status: "unconfigured", latency_ms: null, detail: "API key missing" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const respond = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  // A failing read falls through to a fresh check, which then reports the database as down
  const { data: snapshot } = await createClient(supabaseUrl, serviceKey)
    .from("api_cache")
    .select("response_data")
    .eq("cache_key", SNAPSHOT_KEY)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()
    .then((r) => r, () => ({ data: null }));
  if (snapshot) return respond(snapshot.response_data);

  const TMDB = Deno.env.get("TMDB_READ_TOKEN") || Deno.env.get("TMDB_API_KEY");
  const TWITCH_ID = Deno.env.get("TWITCH_CLIENT_ID");
  const TWITCH_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET");
  const OMDB = Deno.env.get("OMDB_API_KEY");
  const TVDB = Deno.env.get("TVDB_API_KEY");

  const tasks: Promise<Check>[] = [
    timed("database", "Datenbank", async () => {
      const sb = createClient(supabaseUrl, serviceKey);
      const { error } = await sb.from("api_cache").select("cache_key").limit(1);
      return { ok: !error, detail: error?.message };
    }),
    timed("auth", "Authentifizierung", async () => {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
    }),
    timed("anilist", "AniList (Anime)", async () => {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ Media(id: 1) { id } }" }),
      });
      return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
    }),
  ];

  tasks.push(
    TMDB
      ? timed("tmdb", "TMDB (Filme & Serien)", async () => {
          // v4 read tokens are JWTs (Bearer), v3 keys go in the query string.
          const isToken = TMDB.split(".").length === 3;
          const url = new URL("https://api.themoviedb.org/3/configuration");
          if (!isToken) url.searchParams.set("api_key", TMDB);
          const res = await fetch(url.toString(), {
            headers: isToken ? { Authorization: `Bearer ${TMDB}` } : {},
          });
          return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
        })
      : Promise.resolve(unconfigured("tmdb", "TMDB (Filme & Serien)")),
  );

  tasks.push(
    TWITCH_ID && TWITCH_SECRET
      ? timed("igdb", "IGDB (Games)", async () => {
          // Credentials go in the body: a network error message quotes the URL
          const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
            method: "POST",
            body: new URLSearchParams({
              client_id: TWITCH_ID,
              client_secret: TWITCH_SECRET,
              grant_type: "client_credentials",
            }),
          });
          const tokenJson = await tokenRes.json().catch(() => null);
          if (!tokenRes.ok || !tokenJson?.access_token) {
            return { ok: false, detail: `Twitch auth HTTP ${tokenRes.status}` };
          }
          const res = await fetch("https://api.igdb.com/v4/games", {
            method: "POST",
            headers: {
              "Client-ID": TWITCH_ID,
              Authorization: `Bearer ${tokenJson.access_token}`,
              "Content-Type": "text/plain",
            },
            body: "fields id; limit 1;",
          });
          return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
        })
      : Promise.resolve(unconfigured("igdb", "IGDB (Games)")),
  );

  tasks.push(
    OMDB
      ? timed("omdb", "OMDb", async () => {
          const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB}&i=tt0111161`);
          const json = await res.json().catch(() => null);
          const ok = res.ok && json?.Response !== "False";
          return { ok, detail: ok ? undefined : json?.Error || `HTTP ${res.status}` };
        })
      : Promise.resolve(unconfigured("omdb", "OMDb")),
  );

  tasks.push(
    TVDB
      ? timed("tvdb", "TVDB", async () => {
          const res = await fetch("https://api4.thetvdb.com/v4/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apikey: TVDB }),
          });
          return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
        })
      : Promise.resolve(unconfigured("tvdb", "TVDB")),
  );

  const checks = await Promise.all(tasks);
  const relevant = checks.filter((c) => c.status !== "unconfigured");
  const overall = relevant.some((c) => c.status === "down")
    ? "down"
    : relevant.some((c) => c.status === "degraded")
      ? "degraded"
      : "operational";

  const now = new Date().toISOString();

  // Persist status transitions so the status page can render an incident timeline.
  try {
    const sb = createClient(supabaseUrl, serviceKey);
    const { data: open } = await sb
      .from("api_status_events")
      .select("id, service_id, status")
      .is("ended_at", null);

    const openById = new Map((open ?? []).map((e) => [e.service_id as string, e]));

    for (const c of checks) {
      const current = openById.get(c.id);
      if (current && current.status === c.status) continue;
      if (current) {
        await sb.from("api_status_events").update({ ended_at: now }).eq("id", current.id);
      }
      await sb.from("api_status_events").insert({
        service_id: c.id,
        service_name: c.name,
        status: c.status,
        detail: c.detail ?? null,
        latency_ms: c.latency_ms,
        started_at: now,
      });
    }
  } catch (e) {
    console.error("failed to record status events", e);
  }

  const body = { overall, checked_at: now, checks };
  await createClient(supabaseUrl, serviceKey)
    .from("api_cache")
    .upsert(
      { cache_key: SNAPSHOT_KEY, response_data: body, expires_at: new Date(Date.now() + SNAPSHOT_TTL_MS).toISOString() },
      { onConflict: "cache_key" },
    )
    .then(() => {}, () => {});

  return respond(body);
});
