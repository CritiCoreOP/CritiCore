import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fromCrawler } from "../_shared/crawler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cache TTL in minutes per endpoint pattern. A crawler walks thousands of detail pages once each,
// so the long tail stays short; shared lists and static lookups live longer.
function getCacheTTL(endpoint: string): number {
  if (endpoint.startsWith('/genre') || endpoint.startsWith('/configuration')) return 7 * 24 * 60;
  if (endpoint.startsWith('/search')) return 15;
  if (endpoint.startsWith('/trending') || endpoint.startsWith('/discover')) return 60;
  if (/\/(popular|top_rated|now_playing|upcoming|on_the_air|airing_today)$/.test(endpoint)) return 60;
  // Details, credits, seasons, similar titles
  return 180;
}

// Only what the app reads is kept (types in src/lib/api.ts). Full answers averaged 4 KB per cache row:
// 20 similar titles with plot texts, the whole crew, every country's age ratings and providers.
const SIMILAR_LIMIT = 12; // getSimilarMovies/getSimilarSeries show 12
const DETAIL_CAST_LIMIT = 20; // detail pages show 12
const RATING_REGIONS = new Set(['DE']); // FSK badge
const PROVIDER_REGIONS = new Set(['DE', 'US', 'FR', 'ES', 'TH']); // one per site language
const LIST_ITEM_FIELDS = [
  'id', 'title', 'name', 'poster_path', 'backdrop_path', 'vote_average', 'vote_count',
  'release_date', 'first_air_date', 'genre_ids', 'media_type', 'original_language', 'popularity', 'adult',
];
// roles/jobs/total_episode_count belong to /tv/{id}/aggregate_credits
const CREDIT_FIELDS = [
  'id', 'name', 'profile_path', 'character', 'order', 'job', 'department', 'known_for_department',
  'roles', 'jobs', 'total_episode_count',
];
// Detail pages name these from the crew; the full crew stays on /credits
const KEY_CREW_JOBS = new Set(['Director', 'Screenplay', 'Writer', 'Novel', 'Original Music Composer', 'Director of Photography']);

type Json = Record<string, unknown>;

function pick(item: unknown, keys: string[]): Json {
  const src = (item ?? {}) as Json;
  const out: Json = {};
  for (const k of keys) if (k in src) out[k] = src[k];
  return out;
}

const pickAll = (list: unknown, keys: string[], limit?: number) =>
  Array.isArray(list) ? list.slice(0, limit).map((i) => pick(i, keys)) : list;

function slimResponse(endpoint: string, data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const d = data as Json;

  if (/^\/(movie|tv)\/\d+\/(similar|recommendations)$/.test(endpoint)) {
    return { ...d, results: pickAll(d.results, LIST_ITEM_FIELDS, SIMILAR_LIMIT) };
  }
  if (/^\/tv\/\d+\/season\/\d+$/.test(endpoint) && Array.isArray(d.episodes)) {
    // Every episode carries its full crew and guest stars; the season page shows neither
    return { ...d, episodes: d.episodes.map(({ crew: _c, guest_stars: _g, ...ep }: Json) => ep) };
  }
  if (/^\/(movie|tv)\/\d+\/(credits|aggregate_credits)$/.test(endpoint)) {
    return { ...d, cast: pickAll(d.cast, CREDIT_FIELDS), crew: pickAll(d.crew, CREDIT_FIELDS) };
  }
  if (/^\/(movie|tv)\/\d+$/.test(endpoint)) {
    const out: Json = { ...d };
    const credits = d.credits as Json | undefined;
    if (credits) {
      const crew = Array.isArray(credits.crew) ? credits.crew.filter((m: Json) => KEY_CREW_JOBS.has(String(m.job))) : [];
      out.credits = {
        cast: pickAll(credits.cast, CREDIT_FIELDS, DETAIL_CAST_LIMIT),
        crew: pickAll(crew, ['id', 'name', 'job']),
      };
    }
    for (const key of ['release_dates', 'content_ratings']) {
      const block = d[key] as { results?: { iso_3166_1?: string }[] } | undefined;
      if (Array.isArray(block?.results)) {
        out[key] = { results: block.results.filter((r) => RATING_REGIONS.has(r.iso_3166_1 ?? '')) };
      }
    }
    const providers = d['watch/providers'] as { results?: Json } | undefined;
    if (providers?.results) {
      out['watch/providers'] = {
        results: Object.fromEntries(Object.entries(providers.results).filter(([region]) => PROVIDER_REGIONS.has(region))),
      };
    }
    return out;
  }
  return d;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
  if (!TMDB_API_KEY) {
    return new Response(JSON.stringify({ error: 'TMDB_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { endpoint, params, language } = await req.json();
    const lang = language || 'de-DE';

    // Restrict the proxy to known TMDB read endpoints so it can't be abused as a
    // general-purpose proxy to arbitrary upstream paths.
    const ALLOWED_PREFIXES = ['/movie', '/tv', '/discover', '/search', '/trending', '/genre', '/person', '/configuration', '/find'];
    if (typeof endpoint !== 'string' || !ALLOWED_PREFIXES.some((p) => endpoint.startsWith(p))) {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build cache key from endpoint + sorted params + language
    const paramStr = params ? Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&') : '';
    const cacheKey = `tmdb:${endpoint}:${lang}:${paramStr}`;

    // Check cache
    const { data: cached } = await sb
      .from('api_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.response_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    // Fetch from TMDB
    const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
    url.searchParams.set('api_key', TMDB_API_KEY);
    url.searchParams.set('language', lang);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    }

    const response = await fetch(url.toString());
    const raw = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `TMDB API error [${response.status}]`, status: response.status, details: raw }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = slimResponse(endpoint, raw);

    // Store in cache (fire-and-forget, don't block response); not for crawlers, see _shared/crawler.ts
    const ttlMinutes = getCacheTTL(endpoint);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    if (!fromCrawler(req)) {
      sb.from('api_cache')
        .upsert(
          { cache_key: cacheKey, response_data: data, created_at: new Date().toISOString(), expires_at: expiresAt },
          { onConflict: 'cache_key' }
        )
        .then(() => {});
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
