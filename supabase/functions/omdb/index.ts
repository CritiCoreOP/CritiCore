import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OMDB_API_KEY = Deno.env.get("OMDB_API_KEY");
    if (!OMDB_API_KEY) {
      // Answer like an OMDb miss: a 500 made every detail page retry this call six times
      return new Response(JSON.stringify({ Response: "False", Error: "OMDb not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imdb_id, title, year, type, plot } = await req.json();

    // Build query params for the API call (includes API key)
    const params = new URLSearchParams({ apikey: OMDB_API_KEY });
    if (imdb_id) {
      params.set("i", imdb_id);
    } else if (title) {
      params.set("t", title);
    } else {
      throw new Error("Either imdb_id or title is required");
    }
    if (year) params.set("y", year);
    if (type) params.set("type", type);
    if (plot) params.set("plot", plot);

    // Build cache key WITHOUT the API key to prevent credential leakage
    const cacheParams = new URLSearchParams();
    if (imdb_id) cacheParams.set("i", imdb_id);
    else if (title) cacheParams.set("t", title);
    if (year) cacheParams.set("y", year);
    if (type) cacheParams.set("type", type);
    if (plot) cacheParams.set("plot", plot);
    const cacheKey = `omdb:${cacheParams.toString()}`;

    // Check cache first
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Fetch from OMDB
    const url = `https://www.omdbapi.com/?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    // OMDb answers 200 even for errors. "Movie not found!" is a normal answer and is cached too, so
    // the free key (1 000 calls a day) is not spent on the same miss again. Limits are not cached.
    const missing = data.Response === "False";
    if (missing && !/not found/i.test(String(data.Error))) {
      console.error("OMDB returned error:", data.Error);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ratings and awards change slowly
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("api_cache").upsert(
      { cache_key: cacheKey, response_data: missing ? { Response: "False", Error: data.Error } : data, expires_at: expiresAt },
      { onConflict: "cache_key" }
    );

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OMDB function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
