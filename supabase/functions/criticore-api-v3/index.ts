import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

type ApiKeyRecord = {
  id: string;
  key_hash: string;
  key_prefix: string;
  rate_limit: number;
  requests_today: number;
  requests_total: number | null;
  last_request_at: string | null;
  last_reset_at: string;
  active: boolean;
  api_version?: string;
  tier?: string;
};

type TmdbMovieResult = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
};

type TmdbSeriesResult = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
};

type RawgGameResult = {
  id: number;
  name: string;
  slug?: string;
  background_image: string | null;
  released: string;
  rating: number;
  ratings_count?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const V3_TIERS: Record<string, { daily: number; header: string }> = {
  starter: { daily: 1000, header: "starter" },
  pro_v3: { daily: 25000, header: "pro_v3" },
  enterprise: { daily: 250000, header: "enterprise" },
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

function envelope(data: unknown, meta: Record<string, unknown> = {}) {
  return {
    data,
    meta: {
      version: "3.0",
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

function getTmdbLanguage(url: URL) {
  return url.searchParams.get("language") || "de-DE";
}

function parseLimit(url: URL, defaultValue = 10, maxValue = 20) {
  const value = Number(url.searchParams.get("limit") || defaultValue);
  if (!Number.isFinite(value) || value < 1) return defaultValue;
  return Math.min(value, maxValue);
}

function tmdbImage(path: string | null, size = "original") {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

async function hashKey(key: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function authenticate(req: Request, url: URL, sb: ReturnType<typeof createClient>) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return { error: json(envelope(null, { error: "Missing API key. Pass via the x-api-key header." }), 401) };
  }

  const prefix = apiKey.substring(0, 8);
  const keyHash = await hashKey(apiKey);

  const { data, error } = await sb
    .from("api_keys")
    .select("*")
    .eq("key_prefix", prefix)
    .eq("key_hash", keyHash)
    .eq("active", true)
    .eq("api_version", "v3")
    .maybeSingle();

  if (error || !data) {
    return { error: json(envelope(null, { error: "Invalid, inactive, or non-v3 API key." }), 401) };
  }

  const keyData = data as ApiKeyRecord;
  const tierName = keyData.tier && V3_TIERS[keyData.tier] ? keyData.tier : resolveTierFromRateLimit(keyData.rate_limit);
  const limits = V3_TIERS[tierName] || V3_TIERS.starter;

  const now = new Date();
  const lastReset = new Date(keyData.last_reset_at);
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / 3_600_000;
  let requestsToday = keyData.requests_today ?? 0;

  if (hoursSinceReset >= 24) {
    requestsToday = 0;
    await sb.from("api_keys").update({ requests_today: 0, last_reset_at: now.toISOString() }).eq("id", keyData.id);
  }

  if (requestsToday >= limits.daily) {
    return {
      error: json(envelope(null, { error: "Rate limit exceeded" }), 429, {
        "X-RateLimit-Limit": String(limits.daily),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Tier": limits.header,
      }),
    };
  }

  await sb.from("api_keys").update({
    requests_today: requestsToday + 1,
    requests_total: (keyData.requests_total || 0) + 1,
    last_request_at: now.toISOString(),
  }).eq("id", keyData.id);

  return {
    rateLimitHeaders: {
      "X-RateLimit-Limit": String(limits.daily),
      "X-RateLimit-Remaining": String(Math.max(0, limits.daily - requestsToday - 1)),
      "X-RateLimit-Tier": limits.header,
    },
  };
}

function resolveTierFromRateLimit(rateLimit: number) {
  if (rateLimit >= 250000) return "enterprise";
  if (rateLimit >= 25000) return "pro_v3";
  return "starter";
}

async function getCache(sb: ReturnType<typeof createClient>, cacheKey: string) {
  const { data } = await sb
    .from("api_cache")
    .select("response_data, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return data?.response_data ?? null;
}

async function setCache(sb: ReturnType<typeof createClient>, cacheKey: string, responseData: unknown, ttlMinutes: number) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  await sb.from("api_cache").upsert({
    cache_key: cacheKey,
    response_data: responseData,
    created_at: now,
    expires_at: expiresAt,
  }, { onConflict: "cache_key" });
}

async function fetchTmdb(endpoint: string, language: string, params?: Record<string, string>) {
  const apiKey = Deno.env.get("TMDB_API_KEY");
  if (!apiKey) throw new Error("TMDB_API_KEY not configured");

  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", language);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const response = await fetch(url.toString());
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`TMDB API error [${response.status}]: ${JSON.stringify(data)}`);
  }

  return data;
}

async function fetchRawg(endpoint: string, params?: Record<string, string>) {
  const apiKey = Deno.env.get("RAWG_API_KEY");
  if (!apiKey) throw new Error("RAWG_API_KEY not configured");

  const url = new URL(`https://api.rawg.io/api${endpoint}`);
  url.searchParams.set("key", apiKey);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const response = await fetch(url.toString());
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`RAWG API error [${response.status}]: ${JSON.stringify(data)}`);
  }

  return data;
}

async function fetchOmdbByImdbId(imdbId: string | null | undefined) {
  const apiKey = Deno.env.get("OMDB_API_KEY");
  if (!apiKey || !imdbId) return null;

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("i", imdbId);
  url.searchParams.set("plot", "full");

  const response = await fetch(url.toString());
  const data = await response.json();
  if (data?.Response === "False") return null;
  return data;
}

function normalizeMovie(detail: any, omdb: any) {
  return {
    id: detail.id,
    type: "movie",
    title: detail.title,
    original_title: detail.original_title,
    overview: detail.overview,
    tagline: detail.tagline,
    status: detail.status,
    release_date: detail.release_date,
    runtime: detail.runtime,
    original_language: detail.original_language,
    genres: detail.genres || [],
    production_companies: detail.production_companies || [],
    production_countries: detail.production_countries || [],
    spoken_languages: detail.spoken_languages || [],
    ratings: {
      tmdb: {
        average: detail.vote_average ?? null,
        count: detail.vote_count ?? null,
      },
      imdb: omdb?.imdbRating ? Number(omdb.imdbRating) : null,
      metascore: omdb?.Metascore ? Number(omdb.Metascore) : null,
    },
    images: {
      poster: tmdbImage(detail.poster_path),
      backdrop: tmdbImage(detail.backdrop_path),
      posters: (detail.images?.posters || []).map((item: any) => ({
        file_path: item.file_path,
        url: tmdbImage(item.file_path),
        width: item.width,
        height: item.height,
      })),
      backdrops: (detail.images?.backdrops || []).map((item: any) => ({
        file_path: item.file_path,
        url: tmdbImage(item.file_path),
        width: item.width,
        height: item.height,
      })),
      logos: (detail.images?.logos || []).map((item: any) => ({
        file_path: item.file_path,
        url: tmdbImage(item.file_path),
        width: item.width,
        height: item.height,
      })),
    },
    videos: detail.videos?.results || [],
    credits: detail.credits || { cast: [], crew: [] },
    keywords: detail.keywords?.keywords || [],
    external_ids: {
      imdb_id: detail.imdb_id || null,
    },
  };
}

function normalizeSeries(detail: any, omdb: any) {
  return {
    id: detail.id,
    type: "series",
    title: detail.name,
    original_title: detail.original_name,
    overview: detail.overview,
    tagline: detail.tagline,
    status: detail.status,
    first_air_date: detail.first_air_date,
    last_air_date: detail.last_air_date,
    number_of_seasons: detail.number_of_seasons,
    number_of_episodes: detail.number_of_episodes,
    episode_run_time: detail.episode_run_time || [],
    original_language: detail.original_language,
    genres: detail.genres || [],
    production_companies: detail.production_companies || [],
    production_countries: detail.production_countries || [],
    spoken_languages: detail.spoken_languages || [],
    content_ratings: detail.content_ratings?.results || [],
    seasons: detail.seasons || [],
    ratings: {
      tmdb: {
        average: detail.vote_average ?? null,
        count: detail.vote_count ?? null,
      },
      imdb: omdb?.imdbRating ? Number(omdb.imdbRating) : null,
      metascore: omdb?.Metascore ? Number(omdb.Metascore) : null,
    },
    images: {
      poster: tmdbImage(detail.poster_path),
      backdrop: tmdbImage(detail.backdrop_path),
      posters: (detail.images?.posters || []).map((item: any) => ({
        file_path: item.file_path,
        url: tmdbImage(item.file_path),
        width: item.width,
        height: item.height,
      })),
      backdrops: (detail.images?.backdrops || []).map((item: any) => ({
        file_path: item.file_path,
        url: tmdbImage(item.file_path),
        width: item.width,
        height: item.height,
      })),
      logos: (detail.images?.logos || []).map((item: any) => ({
        file_path: item.file_path,
        url: tmdbImage(item.file_path),
        width: item.width,
        height: item.height,
      })),
    },
    videos: detail.videos?.results || [],
    credits: detail.credits || { cast: [], crew: [] },
    keywords: detail.keywords?.results || [],
    external_ids: detail.external_ids || {},
  };
}

function normalizeGame(detail: any, screenshots: any[]) {
  return {
    id: detail.id,
    type: "game",
    title: detail.name,
    original_title: detail.name_original,
    slug: detail.slug,
    overview: detail.description_raw || detail.description || "",
    released: detail.released,
    updated: detail.updated,
    website: detail.website,
    rating: detail.rating,
    ratings_count: detail.ratings_count,
    metacritic: detail.metacritic,
    playtime: detail.playtime,
    background_image: detail.background_image,
    background_image_additional: detail.background_image_additional,
    genres: detail.genres || [],
    tags: detail.tags || [],
    developers: detail.developers || [],
    publishers: detail.publishers || [],
    platforms: detail.platforms || [],
    stores: detail.stores || [],
    esrb_rating: detail.esrb_rating || null,
    clip: detail.clip || null,
    ratings: {
      rawg: {
        average: detail.rating ?? null,
        count: detail.ratings_count ?? null,
      },
      metacritic: detail.metacritic ?? null,
    },
    images: {
      cover: detail.background_image || null,
      additional: detail.background_image_additional || null,
      screenshots: screenshots.map((item: any) => ({
        id: item.id,
        image: item.image,
        width: item.width,
        height: item.height,
      })),
    },
  };
}

async function handleMedia(sb: ReturnType<typeof createClient>, url: URL, mediaType?: string, mediaId?: string) {
  if (!mediaType || !mediaId) {
    return json(envelope(null, { error: "Use /v3/media/{movie|series|game}/{id}" }), 400);
  }

  const language = getTmdbLanguage(url);
  const normalizedType = mediaType.toLowerCase();
  const cacheKey = `criticore-api-v3:media:${normalizedType}:${mediaId}:${language}`;
  const cached = await getCache(sb, cacheKey);

  if (cached) {
    return json(cached, 200, { "X-Cache": "HIT" });
  }

  let payload: ReturnType<typeof envelope>;

  if (normalizedType === "movie") {
    const detail = await fetchTmdb(`/movie/${mediaId}`, language, {
      append_to_response: "videos,credits,images,keywords,release_dates,external_ids",
      include_image_language: "en,null",
    });
    const omdb = await fetchOmdbByImdbId(detail.imdb_id);

    payload = envelope({
      type: "movie",
      id: detail.id,
      normalized: normalizeMovie(detail, omdb),
      providers: {
        tmdb: detail,
        omdb,
      },
    }, { cached: false, language, aggregated: true });
  } else if (normalizedType === "series") {
    const detail = await fetchTmdb(`/tv/${mediaId}`, language, {
      append_to_response: "videos,credits,images,keywords,content_ratings,external_ids",
      include_image_language: "en,null",
    });
    const omdb = await fetchOmdbByImdbId(detail.external_ids?.imdb_id);

    payload = envelope({
      type: "series",
      id: detail.id,
      normalized: normalizeSeries(detail, omdb),
      providers: {
        tmdb: detail,
        omdb,
      },
    }, { cached: false, language, aggregated: true });
  } else if (normalizedType === "game") {
    const [detail, screenshotsResponse] = await Promise.all([
      fetchRawg(`/games/${mediaId}`),
      fetchRawg(`/games/${mediaId}/screenshots`).catch(() => ({ results: [] })),
    ]);

    payload = envelope({
      type: "game",
      id: detail.id,
      normalized: normalizeGame(detail, screenshotsResponse.results || []),
      providers: {
        rawg: {
          ...detail,
          screenshots: screenshotsResponse.results || [],
        },
      },
    }, { cached: false, aggregated: true });
  } else {
    return json(envelope(null, { error: `Unsupported media type: ${mediaType}` }), 400);
  }

  await setCache(sb, cacheKey, payload, 120);
  return json(payload, 200, { "X-Cache": "MISS" });
}

async function handleSearch(url: URL) {
  const q = url.searchParams.get("q")?.trim();
  const type = (url.searchParams.get("type") || "all").toLowerCase();
  const limit = parseLimit(url, 10, 20);
  const language = getTmdbLanguage(url);

  if (!q) {
    return json(envelope(null, { error: "q is required" }), 400);
  }

  const searches: Promise<any>[] = [];
  const labels: string[] = [];

  if (type === "all" || type === "movie") {
    labels.push("movies");
    searches.push(fetchTmdb("/search/movie", language, { query: q, page: "1" }));
  }
  if (type === "all" || type === "series") {
    labels.push("series");
    searches.push(fetchTmdb("/search/tv", language, { query: q, page: "1" }));
  }
  if (type === "all" || type === "game") {
    labels.push("games");
    searches.push(fetchRawg("/games", { search: q, search_precise: "true", page_size: String(limit) }));
  }

  if (searches.length === 0) {
    return json(envelope(null, { error: "type must be one of all, movie, series, game" }), 400);
  }

  const results = await Promise.all(searches);
  const mapped = Object.fromEntries(labels.map((label, index) => [label, results[index]]));

  const movies = (mapped.movies?.results || []).slice(0, limit).map((item: TmdbMovieResult) => ({
    id: item.id,
    type: "movie",
    title: item.title,
    overview: item.overview,
    release_date: item.release_date,
    poster: tmdbImage(item.poster_path),
    backdrop: tmdbImage(item.backdrop_path),
    vote_average: item.vote_average,
    provider: "tmdb",
  }));

  const series = (mapped.series?.results || []).slice(0, limit).map((item: TmdbSeriesResult) => ({
    id: item.id,
    type: "series",
    title: item.name,
    overview: item.overview,
    first_air_date: item.first_air_date,
    poster: tmdbImage(item.poster_path),
    backdrop: tmdbImage(item.backdrop_path),
    vote_average: item.vote_average,
    provider: "tmdb",
  }));

  const games = (mapped.games?.results || []).slice(0, limit).map((item: RawgGameResult) => ({
    id: item.id,
    type: "game",
    title: item.name,
    slug: item.slug,
    released: item.released,
    image: item.background_image,
    rating: item.rating,
    provider: "rawg",
  }));

  return json(envelope({
    query: q,
    type,
    results: { movies, series, games },
    combined: [...movies, ...series, ...games],
  }, { language }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json(envelope(null, { error: "Method not allowed" }), 405);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/criticore-api-v3\/?/, "");
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === "v3")) {
    return json(envelope({
      name: "CritiCore API",
      version: "3.0",
      endpoints: [
        "GET /v3/media/{movie|series|game}/{id}",
        "GET /v3/search?q=...&type=all|movie|series|game",
      ],
      docs: "https://criticore.cc/developers",
    }));
  }

  if (segments[0] !== "v3") {
    return json(envelope(null, { error: "Not found. Use /v3/{endpoint}" }), 404);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  const auth = await authenticate(req, url, sb);
  if ("error" in auth && auth.error) return auth.error;

  const rateLimitHeaders = auth.rateLimitHeaders;

  try {
    let response: Response;

    if (segments[1] === "media") {
      response = await handleMedia(sb, url, segments[2], segments[3]);
    } else if (segments[1] === "search") {
      response = await handleSearch(url);
    } else {
      response = json(envelope(null, { error: `Unknown endpoint: ${segments[1]}` }), 404);
    }

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers.entries()), ...rateLimitHeaders },
    });
  } catch (error) {
    console.error("API v3 error:", error);
    return json(envelope(null, { error: "Internal server error" }), 500);
  }
});
