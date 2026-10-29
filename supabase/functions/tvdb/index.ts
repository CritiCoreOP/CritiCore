import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TVDB_BASE = "https://api4.thetvdb.com/v4";

// In-memory JWT cache (per worker). TVDB tokens are valid for ~30 days.
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
  if (!res.ok) {
    throw new Error(`TVDB login failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const token = json?.data?.token as string | undefined;
  if (!token) throw new Error("TVDB login returned no token");

  // Cache for 24h (safe margin under the 30d expiry).
  cachedToken = { token, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  return token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: reject anonymous callers (function is public but requires a valid user JWT)
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

    const { path, query } = await req.json() as {
      path?: string;
      query?: Record<string, string | number | boolean>;
    };

    if (!path || typeof path !== "string" || !path.startsWith("/")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'path' (must start with /)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Whitelist: only the endpoints explicitly allowed by project spec
    const ALLOWED = [
      /^\/login$/,
      /^\/search$/,
      /^\/series\/\d+(\/extended)?$/,
      /^\/movies\/\d+(\/extended)?$/,
      /^\/genres$/,
    ];
    const cleanPath = path.split("?")[0];
    if (!ALLOWED.some((re) => re.test(cleanPath))) {
      return new Response(
        JSON.stringify({ error: `Endpoint not allowed: ${cleanPath}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build URL + cache key
    const qs = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      }
    }
    const qsStr = qs.toString();
    const cacheKey = `tvdb:${path}${qsStr ? `?${qsStr}` : ""}`;

    // Cache lookup
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
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

    // Fetch from TVDB (retry once on 401 with fresh token)
    const doFetch = async (token: string) =>
      fetch(`${TVDB_BASE}${path}${qsStr ? `?${qsStr}` : ""}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

    let token = await getTvdbToken();
    let upstream = await doFetch(token);
    if (upstream.status === 401) {
      cachedToken = null;
      token = await getTvdbToken();
      upstream = await doFetch(token);
    }

    const body = await upstream.text();
    let data: unknown;
    try { data = JSON.parse(body); } catch { data = { raw: body }; }

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "TVDB error", status: upstream.status, data }), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache successful GETs for 24h
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("api_cache").upsert(
      { cache_key: cacheKey, response_data: data, expires_at: expiresAt },
      { onConflict: "cache_key" },
    );

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("TVDB function error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
