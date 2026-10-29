import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/* ── Rate-limit tiers ── */
const TIERS: Record<string, { daily: number; perMinute: number }> = {
  free:  { daily: 100,   perMinute: 10 },
  pro:   { daily: 5000,  perMinute: 60 },
  admin: { daily: 50000, perMinute: 300 },
};

/* ── Helpers ── */
function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

function envelope(
  data: unknown,
  meta: Record<string, unknown> = {},
  pagination?: { cursor?: string | null; has_more: boolean; total?: number },
) {
  return { data, meta: { version: "2.0", timestamp: new Date().toISOString(), ...meta }, ...(pagination ? { pagination } : {}) };
}

async function hashKey(key: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function parseIntParam(url: URL, name: string, def: number, max?: number): number {
  const v = parseInt(url.searchParams.get(name) || String(def));
  const val = isNaN(v) ? def : v;
  return max ? Math.min(val, max) : val;
}

/* ── Auth & Rate Limiting ── */
async function authenticate(req: Request, url: URL, supabase: ReturnType<typeof createClient>) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return { error: json(envelope(null, { error: "Missing API key. Pass via the x-api-key header." }), 401) };

  const prefix = apiKey.substring(0, 8);
  const keyHash = await hashKey(apiKey);

  const { data: keyData, error: keyError } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_prefix", prefix)
    .eq("key_hash", keyHash)
    .eq("active", true)
    .single();

  if (keyError || !keyData) return { error: json(envelope(null, { error: "Invalid or inactive API key." }), 401) };

  // Determine tier from rate_limit
  const tier = keyData.rate_limit >= 50000 ? "admin" : keyData.rate_limit >= 5000 ? "pro" : "free";
  const limits = TIERS[tier];

  // Daily reset
  const now = new Date();
  const lastReset = new Date(keyData.last_reset_at);
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / 3_600_000;
  let requestsToday = keyData.requests_today;

  if (hoursSinceReset >= 24) {
    requestsToday = 0;
    await supabase.from("api_keys").update({ requests_today: 0, last_reset_at: now.toISOString() }).eq("id", keyData.id);
  }

  if (requestsToday >= limits.daily) {
    const resetIn = Math.ceil(24 - hoursSinceReset);
    return {
      error: json(envelope(null, { error: "Rate limit exceeded" }), 429, {
        "X-RateLimit-Limit": String(limits.daily),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetIn),
      }),
    };
  }

  // Increment
  await supabase.from("api_keys").update({
    requests_today: requestsToday + 1,
    requests_total: (keyData.requests_total || 0) + 1,
    last_request_at: now.toISOString(),
  }).eq("id", keyData.id);

  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(limits.daily),
    "X-RateLimit-Remaining": String(Math.max(0, limits.daily - requestsToday - 1)),
    "X-RateLimit-Tier": tier,
  };

  return { keyData, tier, rateLimitHeaders };
}

/* ── Endpoint handlers ── */

async function handleReviews(sb: any, url: URL, id?: string) {
  if (id) {
    const { data, error } = await sb
      .from("reviews")
      .select("id, media_id, media_type, score, title, content, is_critic_review, season_number, episode_number, created_at, updated_at")
      .eq("id", id)
      .single();
    if (error) return json(envelope(null, { error: "Review not found" }), 404);
    return json(envelope(data));
  }

  const limit = parseIntParam(url, "limit", 20, 100);
  const cursor = url.searchParams.get("cursor"); // created_at cursor
  const mediaType = url.searchParams.get("media_type");
  const mediaId = url.searchParams.get("media_id");
  const minScore = url.searchParams.get("min_score");
  const maxScore = url.searchParams.get("max_score");
  const sort = url.searchParams.get("sort") || "newest"; // newest | oldest | score_desc | score_asc
  const criticOnly = url.searchParams.get("critic_only") === "true";

  let query = sb
    .from("reviews")
    .select("id, media_id, media_type, score, title, content, is_critic_review, season_number, episode_number, created_at, updated_at", { count: "exact" });

  if (mediaType) query = query.eq("media_type", mediaType);
  if (mediaId) query = query.eq("media_id", mediaId);
  if (criticOnly) query = query.eq("is_critic_review", true);
  if (minScore) query = query.gte("score", parseFloat(minScore));
  if (maxScore) query = query.lte("score", parseFloat(maxScore));

  // Sort
  if (sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (sort === "score_desc") query = query.order("score", { ascending: false });
  else if (sort === "score_asc") query = query.order("score", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  // Cursor pagination
  if (cursor) {
    if (sort === "oldest") query = query.gt("created_at", cursor);
    else query = query.lt("created_at", cursor);
  }

  query = query.limit(limit + 1); // fetch one extra to check has_more

  const { data, error, count } = await query;
  if (error) return json(envelope(null, { error: error.message }), 500);

  const hasMore = (data?.length || 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data || []);
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return json(envelope(items, {}, { cursor: nextCursor, has_more: hasMore, total: count ?? undefined }));
}

async function handleScores(sb: any, url: URL) {
  const mediaType = url.searchParams.get("media_type");
  const mediaId = url.searchParams.get("media_id");
  if (!mediaType || !mediaId) return json(envelope(null, { error: "media_type and media_id are required" }), 400);

  const { data: reviews, error } = await sb
    .from("reviews")
    .select("score, is_critic_review")
    .eq("media_type", mediaType)
    .eq("media_id", mediaId);

  if (error) return json(envelope(null, { error: error.message }), 500);

  const allScores = reviews?.map((r: any) => r.score) || [];
  const criticScores = reviews?.filter((r: any) => r.is_critic_review).map((r: any) => r.score) || [];
  const userScores = reviews?.filter((r: any) => !r.is_critic_review).map((r: any) => r.score) || [];
  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

  return json(envelope({
    media_type: mediaType,
    media_id: mediaId,
    overall: { average: avg(allScores), count: allScores.length },
    critics: { average: avg(criticScores), count: criticScores.length },
    users: { average: avg(userScores), count: userScores.length },
  }));
}

async function handleMediaMetadata(sb: any, url: URL) {
  const mediaType = url.searchParams.get("media_type");
  const mediaId = url.searchParams.get("media_id");
  const limit = parseIntParam(url, "limit", 50, 100);
  const cursor = url.searchParams.get("cursor");

  let query = sb
    .from("media_metadata")
    .select("id, media_id, media_type, meta_key, meta_value, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (mediaType) query = query.eq("media_type", mediaType);
  if (mediaId) query = query.eq("media_id", mediaId);
  if (cursor) query = query.lt("created_at", cursor);
  query = query.limit(limit + 1);

  const { data, error, count } = await query;
  if (error) return json(envelope(null, { error: error.message }), 500);

  const hasMore = (data?.length || 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data || []);
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return json(envelope(items, {}, { cursor: nextCursor, has_more: hasMore, total: count ?? undefined }));
}

async function handleCategories(sb: any) {
  const { data, error } = await sb
    .from("categories")
    .select("id, name, slug, description, parent_id, sort_order")
    .order("sort_order", { ascending: true });
  if (error) return json(envelope(null, { error: error.message }), 500);
  return json(envelope(data));
}

async function handleTags(sb: any, url: URL) {
  const search = url.searchParams.get("search");
  const limit = parseIntParam(url, "limit", 50, 200);
  const cursor = url.searchParams.get("cursor");

  let query = sb
    .from("tags")
    .select("id, name, slug", { count: "exact" })
    .eq("status", "approved")
    .order("name", { ascending: true });

  if (search) query = query.ilike("name", `%${search}%`);
  if (cursor) query = query.gt("name", cursor);
  query = query.limit(limit + 1);

  const { data, error, count } = await query;
  if (error) return json(envelope(null, { error: error.message }), 500);

  const hasMore = (data?.length || 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data || []);
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].name : null;

  return json(envelope(items, {}, { cursor: nextCursor, has_more: hasMore, total: count ?? undefined }));
}

async function handleUsers(sb: any, url: URL, userId?: string) {
  if (userId) {
    const { data, error } = await sb
      .from("profiles")
      .select("user_id, username, display_name, avatar_url, bio, post_karma, comment_karma, is_official, created_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();
    if (error) return json(envelope(null, { error: "User not found" }), 404);
    return json(envelope(data));
  }

  const limit = parseIntParam(url, "limit", 20, 50);
  const cursor = url.searchParams.get("cursor");
  const search = url.searchParams.get("search");

  let query = sb
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, bio, post_karma, comment_karma, is_official, created_at", { count: "exact" })
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (search) {
    // Strip PostgREST filter-grammar characters to prevent OR-filter injection.
    const safe = search.replace(/[,()\\]/g, " ");
    query = query.or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`);
  }
  if (cursor) query = query.lt("created_at", cursor);
  query = query.limit(limit + 1);

  const { data, error, count } = await query;
  if (error) return json(envelope(null, { error: error.message }), 500);

  const hasMore = (data?.length || 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data || []);
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

  return json(envelope(items, {}, { cursor: nextCursor, has_more: hasMore, total: count ?? undefined }));
}

async function handleLists(sb: any, url: URL, listId?: string) {
  if (listId) {
    const { data: list, error } = await sb
      .from("custom_lists")
      .select("id, name, description, cover_image_url, is_public, created_at, updated_at, user_id")
      .eq("id", listId)
      .eq("is_public", true)
      .single();
    if (error) return json(envelope(null, { error: "List not found or not public" }), 404);

    // Include items
    const { data: items } = await sb
      .from("custom_list_items")
      .select("id, media_id, media_type, media_title, media_poster, sort_order, added_at")
      .eq("list_id", listId)
      .order("sort_order", { ascending: true });

    return json(envelope({ ...list, items: items || [] }));
  }

  const limit = parseIntParam(url, "limit", 20, 50);
  const cursor = url.searchParams.get("cursor");
  const userId = url.searchParams.get("user_id");

  let query = sb
    .from("custom_lists")
    .select("id, name, description, cover_image_url, is_public, created_at, updated_at, user_id", { count: "exact" })
    .eq("is_public", true)
    .order("updated_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);
  if (cursor) query = query.lt("updated_at", cursor);
  query = query.limit(limit + 1);

  const { data, error, count } = await query;
  if (error) return json(envelope(null, { error: error.message }), 500);

  const hasMore = (data?.length || 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data || []);
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].updated_at : null;

  return json(envelope(items, {}, { cursor: nextCursor, has_more: hasMore, total: count ?? undefined }));
}



/* ── Main Router ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json(envelope(null, { error: "Method not allowed" }), 405);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/criticore-api-v2\/?/, "");
  const segments = path.split("/").filter(Boolean);

  // Root
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "v2")) {
    return json(envelope({
      name: "CritiCore API",
      version: "2.0",
      changelog: [
        "Cursor-based pagination on all list endpoints",
        "Consistent envelope response format {data, meta, pagination}",
        "New filtering: min_score, max_score, sort, critic_only, search",
        "New endpoints: /v2/users, /v2/lists",
        "Tiered rate limits with X-RateLimit-* headers",
        "Tags search support",
      ],
      endpoints: [
        "GET /v2/reviews?media_type=movie&media_id=123&sort=newest&limit=20",
        "GET /v2/reviews/:id",
        "GET /v2/scores?media_type=movie&media_id=123",
        "GET /v2/media-metadata?media_type=movie&media_id=123",
        "GET /v2/categories",
        "GET /v2/tags?search=action",
        "GET /v2/users?search=john",
        "GET /v2/users/:user_id",
        "GET /v2/lists?user_id=...",
        "GET /v2/lists/:id",
      ],
      docs: "https://criticore.cc/developers",
    }));
  }

  if (segments[0] !== "v2" || segments.length < 2) {
    return json(envelope(null, { error: "Not found. Use /v2/{endpoint}" }), 404);
  }

  // Authenticate
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const auth = await authenticate(req, url, supabase);
  if ("error" in auth && auth.error) return auth.error;

  const { rateLimitHeaders } = auth as { rateLimitHeaders: Record<string, string> };

  const resource = segments[1];
  const resourceId = segments[2];

  try {
    let response: Response;
    switch (resource) {
      case "reviews":   response = await handleReviews(supabase, url, resourceId); break;
      case "scores":    response = await handleScores(supabase, url); break;
      case "media-metadata": response = await handleMediaMetadata(supabase, url); break;
      case "categories": response = await handleCategories(supabase); break;
      case "tags":       response = await handleTags(supabase, url); break;
      case "users":      response = await handleUsers(supabase, url, resourceId); break;
      case "lists":      response = await handleLists(supabase, url, resourceId); break;
      case "activity":   response = json(envelope(null, { error: "The activity endpoint has been removed: user activity is private (friends-only) and cannot be exposed via the public API." }), 410); break;
      default:
        response = json(envelope(null, { error: `Unknown endpoint: ${resource}` }), 404);
    }

    // Inject rate limit headers
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers.entries()), ...rateLimitHeaders },
    });
  } catch (err) {
    console.error("API v2 error:", err);
    return json(envelope(null, { error: "Internal server error" }), 500);
  }
});
