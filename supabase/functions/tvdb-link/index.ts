// TMDB → TVDB link resolver with 7-day server-side cache in `api_cache`.
// Runs one TVDB `/search` per TMDB id per week and returns the resolved
// TVDB series id (or null if no confident match).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TVDB_BASE = "https://api4.thetvdb.com/v4";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTvdbToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const apikey = Deno.env.get("TVDB_API_KEY");
  if (!apikey) throw new Error("TVDB_API_KEY is not configured");
  const res = await fetch(`${TVDB_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey }),
  });
  if (!res.ok) throw new Error(`TVDB login failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const token = json?.data?.token as string | undefined;
  if (!token) throw new Error("TVDB login returned no token");
  cachedToken = { token, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  return token;
}

interface TvdbSearchHit {
  tvdb_id?: string | number;
  id?: string | number;
  name?: string;
  year?: string | number;
  primary_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({})) as {
      tmdb_type?: string;
      tmdb_id?: string;
      name?: string;
      year?: string | number | null;
    };
    const { tmdb_type, tmdb_id, name } = body;
    const year = body.year != null ? String(body.year).slice(0, 4) : null;

    if (tmdb_type !== "series" || !tmdb_id || !name) {
      return new Response(
        JSON.stringify({ error: "Missing tmdb_type='series', tmdb_id or name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const cacheKey = `tvdb-link:series:${tmdb_id}`;

    const { data: cached } = await supabase
      .from("api_cache")
      .select("response_data")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached.response_data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fresh lookup via TVDB /search
    const token = await getTvdbToken();
    const qs = new URLSearchParams({ query: name, type: "series" });
    if (year) qs.set("year", year);
    const upstream = await fetch(`${TVDB_BASE}/search?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const upstreamText = await upstream.text();
    if (!upstream.ok) {
      // Cache the "no match" for 24h so a broken match doesn't hammer TVDB.
      const payload = { tvdb_id: null, reason: `tvdb-search-${upstream.status}` };
      await supabase.from("api_cache").upsert(
        {
          cache_key: cacheKey,
          response_data: payload,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "cache_key" },
      );
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let hits: TvdbSearchHit[] = [];
    try {
      const parsed = JSON.parse(upstreamText);
      hits = Array.isArray(parsed?.data) ? parsed.data : [];
    } catch {
      hits = [];
    }

    // Prefer exact year match, then first result.
    const pick = year
      ? hits.find((h) => String(h.year ?? "").slice(0, 4) === year) ?? hits[0]
      : hits[0];
    const rawId = pick?.tvdb_id ?? pick?.id ?? null;
    const tvdb_id_num = rawId != null ? Number(rawId) : null;
    const payload = {
      tvdb_id: Number.isFinite(tvdb_id_num) && tvdb_id_num! > 0 ? tvdb_id_num : null,
    };

    await supabase.from("api_cache").upsert(
      {
        cache_key: cacheKey,
        response_data: payload,
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      },
      { onConflict: "cache_key" },
    );

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("tvdb-link error:", (error as Error).message, (error as Error).stack);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
