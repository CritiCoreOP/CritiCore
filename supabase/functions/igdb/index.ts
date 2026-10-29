import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeErrorMessage } from "../_shared/redact.ts";
import { fromCrawler } from "../_shared/crawler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowed IGDB read endpoints (Apicalypse POST bodies).
const ALLOWED_ENDPOINTS = [
  "/games",
  "/genres",
  "/platforms",
  "/companies",
  "/themes",
  "/keywords",
  "/popularity_primitives",
  "/game_time_to_beats",
];

function getCacheTTL(endpoint: string): number {
  // game detail (where id = ...) lives longer than discovery lists
  if (endpoint === "/popularity_primitives") return 30;
  if (endpoint === "/games") return 30;
  return 60 * 24; // genres/platforms etc. rarely change
}

// ── Twitch OAuth token (in-memory cache, survives warm invocations) ──
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(forceRefresh = false): Promise<string> {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID");
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET not configured");
  }

  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  // Credentials go in the body: a network error message quotes the URL, and it reaches the client
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Twitch token error [${res.status}]: ${JSON.stringify(data)}`);
  }

  cachedToken = {
    value: data.access_token,
    // expires_in is in seconds; refresh a little early
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientId = Deno.env.get("TWITCH_CLIENT_ID");
  if (!clientId) {
    return new Response(
      JSON.stringify({ error: "TWITCH_CLIENT_ID not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { endpoint, query } = await req.json();

    if (typeof endpoint !== "string" || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof query !== "string" || query.length === 0 || query.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid query" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = `igdb:${endpoint}:${query}`;

    // Check cache
    const { data: cached } = await sb
      .from("api_cache")
      .select("response_data, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.response_data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    // Fetch from IGDB (retry once on auth failure with a fresh token)
    const callIgdb = async (token: string) =>
      fetch(`https://api.igdb.com/v4${endpoint}`, {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "text/plain",
          "Accept": "application/json",
        },
        body: query,
      });

    let token = await getAccessToken();
    let response = await callIgdb(token);

    if (response.status === 401 || response.status === 403) {
      token = await getAccessToken(true);
      response = await callIgdb(token);
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`IGDB API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    // Store in cache (fire-and-forget); not for crawlers, see _shared/crawler.ts
    const ttlMinutes = getCacheTTL(endpoint);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    if (!fromCrawler(req)) {
      sb.from("api_cache")
        .upsert(
          { cache_key: cacheKey, response_data: data, created_at: new Date().toISOString(), expires_at: expiresAt },
          { onConflict: "cache_key" },
        )
        .then(() => {});
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
