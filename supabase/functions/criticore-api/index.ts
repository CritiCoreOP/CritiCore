import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  requests_today: number;
  rate_limit: number;
  last_reset_at: string;
  active: boolean;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path: /criticore-api/v1/{resource}
  // pathParts after function name: ["v1", "{resource}"] or similar
  // The edge function path is /criticore-api, so we parse after that
  const path = url.pathname.replace(/^\/criticore-api\/?/, "");
  const segments = path.split("/").filter(Boolean);

  // Root endpoint - API info
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "v1")) {
    return json({
      name: "CritiCore API",
      version: "1.0",
      endpoints: [
        "GET /v1/reviews?media_type=movie&media_id=123",
        "GET /v1/reviews/:id",
        "GET /v1/scores?media_type=movie&media_id=123",
        "GET /v1/media-metadata?media_type=movie&media_id=123",
        "GET /v1/categories",
        "GET /v1/tags",
      ],
      docs: "https://criticore.cc/developers",
    });
  }

  // All v1 endpoints require API key
  if (segments[0] !== "v1" || segments.length < 2) {
    return json({ error: "Not found. Use /v1/{endpoint}" }, 404);
  }

  // Validate API key — header only (query params leak in logs/history/Referer)
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return json({ error: "Missing API key. Pass via the x-api-key header." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Look up key by prefix (first 8 chars)
  const prefix = apiKey.substring(0, 8);
  const keyHash = await hashKey(apiKey);

  const { data: keyData, error: keyError } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_prefix", prefix)
    .eq("key_hash", keyHash)
    .eq("active", true)
    .single();

  if (keyError || !keyData) {
    return json({ error: "Invalid or inactive API key." }, 401);
  }

  const apiKeyRecord = keyData as ApiKey;

  // Rate limiting - reset daily
  const now = new Date();
  const lastReset = new Date(apiKeyRecord.last_reset_at);
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  let requestsToday = apiKeyRecord.requests_today;
  if (hoursSinceReset >= 24) {
    requestsToday = 0;
    await supabase
      .from("api_keys")
      .update({ requests_today: 0, last_reset_at: now.toISOString() })
      .eq("id", apiKeyRecord.id);
  }

  if (requestsToday >= apiKeyRecord.rate_limit) {
    return json(
      {
        error: "Rate limit exceeded",
        limit: apiKeyRecord.rate_limit,
        resets_in: `${Math.ceil(24 - hoursSinceReset)} hours`,
      },
      429
    );
  }

  // Increment request counter
  await supabase
    .from("api_keys")
    .update({
      requests_today: requestsToday + 1,
      requests_total: (keyData.requests_total || 0) + 1,
      last_request_at: now.toISOString(),
    })
    .eq("id", apiKeyRecord.id);

  // Route to endpoint
  const resource = segments[1];
  const resourceId = segments[2];

  try {
    switch (resource) {
      case "reviews":
        return await handleReviews(supabase, url, resourceId);
      case "scores":
        return await handleScores(supabase, url);
      case "media-metadata":
        return await handleMediaMetadata(supabase, url);
      case "categories":
        return await handleCategories(supabase, url);
      case "tags":
        return await handleTags(supabase, url);
      default:
        return json({ error: `Unknown endpoint: ${resource}` }, 404);
    }
  } catch (err) {
    console.error("API error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

async function handleReviews(supabase: any, url: URL, id?: string) {
  if (id) {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, media_id, media_type, score, title, content, is_critic_review, season_number, episode_number, created_at, updated_at")
      .eq("id", id)
      .single();
    if (error) return json({ error: "Review not found" }, 404);
    return json({ data });
  }

  const mediaType = url.searchParams.get("media_type");
  const mediaId = url.searchParams.get("media_id");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let query = supabase
    .from("reviews")
    .select("id, media_id, media_type, score, title, content, is_critic_review, season_number, episode_number, created_at, updated_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (mediaType) query = query.eq("media_type", mediaType);
  if (mediaId) query = query.eq("media_id", mediaId);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ data, count: data?.length || 0, limit, offset });
}

async function handleScores(supabase: any, url: URL) {
  const mediaType = url.searchParams.get("media_type");
  const mediaId = url.searchParams.get("media_id");

  if (!mediaType || !mediaId) {
    return json({ error: "media_type and media_id are required" }, 400);
  }

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("score, is_critic_review")
    .eq("media_type", mediaType)
    .eq("media_id", mediaId);

  if (error) return json({ error: error.message }, 500);

  const allScores = reviews?.map((r: any) => r.score) || [];
  const criticScores = reviews?.filter((r: any) => r.is_critic_review).map((r: any) => r.score) || [];
  const userScores = reviews?.filter((r: any) => !r.is_critic_review).map((r: any) => r.score) || [];

  const avg = (arr: number[]) => (arr.length ? +(arr.reduce((a: number, b: number) => a + b, 0) / arr.length).toFixed(1) : null);

  return json({
    data: {
      media_type: mediaType,
      media_id: mediaId,
      overall: { average: avg(allScores), count: allScores.length },
      critics: { average: avg(criticScores), count: criticScores.length },
      users: { average: avg(userScores), count: userScores.length },
    },
  });
}

async function handleMediaMetadata(supabase: any, url: URL) {
  const mediaType = url.searchParams.get("media_type");
  const mediaId = url.searchParams.get("media_id");

  let query = supabase
    .from("media_metadata")
    .select("id, media_id, media_type, meta_key, meta_value, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (mediaType) query = query.eq("media_type", mediaType);
  if (mediaId) query = query.eq("media_id", mediaId);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ data, count: data?.length || 0 });
}

async function handleCategories(supabase: any, _url: URL) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, parent_id, sort_order")
    .order("sort_order", { ascending: true });

  if (error) return json({ error: error.message }, 500);
  return json({ data, count: data?.length || 0 });
}

async function handleTags(supabase: any, _url: URL) {
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, slug")
    .eq("status", "approved")
    .order("name", { ascending: true });

  if (error) return json({ error: error.message }, 500);
  return json({ data, count: data?.length || 0 });
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-RateLimit-Info": "100 requests per 24h",
    },
  });
}
