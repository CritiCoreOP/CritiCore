// AniList GraphQL proxy with allowlisted operations + 24h cache.
// AniList requires no API key. Endpoint: https://graphql.anilist.co
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fromCrawler } from "../_shared/crawler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANILIST_URL = "https://graphql.anilist.co";

/* ── Allowlisted GraphQL operations ──────────────────────────────────────── */

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native userPreferred }
  coverImage { extraLarge large medium color }
  bannerImage
  format
  status
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  episodes
  duration
  averageScore
  meanScore
  popularity
  genres
  isAdult
  siteUrl
`;

const OPS: Record<string, string> = {
  trending: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage currentPage total }
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${MEDIA_FIELDS} }
      }
    }
  `,
  popular: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage currentPage total }
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) { ${MEDIA_FIELDS} }
      }
    }
  `,
  seasonal: `
    query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage currentPage total }
        media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, isAdult: false) { ${MEDIA_FIELDS} }
      }
    }
  `,
  search: `
    query ($search: String!, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage currentPage total }
        media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) { ${MEDIA_FIELDS} }
      }
    }
  `,
  detail: `
    query ($id: Int!) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
        description(asHtml: false)
        source
        countryOfOrigin
        nextAiringEpisode { airingAt episode }
        rankings { rank type allTime context season year }
        studios(isMain: true) { nodes { id name siteUrl } }
        trailer { id site thumbnail }
        characters(sort: [ROLE, RELEVANCE], perPage: 12) {
          edges {
            role
            node { id name { full native userPreferred } image { large medium } }
            voiceActors(language: JAPANESE) { id name { full } image { medium } language: languageV2 }
          }
        }
        relations {
          edges {
            relationType
            node { id type title { romaji english userPreferred } coverImage { medium } format }
          }
        }
        recommendations(sort: RATING_DESC, perPage: 10) {
          nodes { mediaRecommendation { id title { romaji english userPreferred } coverImage { large } averageScore } }
        }
        tags { id name rank isAdult isGeneralSpoiler isMediaSpoiler }
        externalLinks { id url site type }
      }
    }
  `,
};

const ALLOWED_VARS: Record<string, Set<string>> = {
  trending: new Set(["page", "perPage"]),
  popular: new Set(["page", "perPage"]),
  seasonal: new Set(["page", "perPage", "season", "seasonYear"]),
  search: new Set(["search", "page", "perPage"]),
  detail: new Set(["id"]),
};

/* ── Cache helpers ───────────────────────────────────────────────────────── */

// Bump when a query gains fields, so cached answers without them are not served for a week
const QUERY_VERSION: Record<string, number> = { detail: 2 };

function cacheKey(op: string, vars: Record<string, unknown>): string {
  const keys = Object.keys(vars).sort();
  const norm = keys.map((k) => `${k}=${JSON.stringify(vars[k])}`).join("&");
  if (QUERY_VERSION[op]) return `anilist:${op}.v${QUERY_VERSION[op]}?${norm}`;
  return `anilist:${op}?${norm}`;
}

async function readCache(admin: ReturnType<typeof createClient>, key: string, ignoreExpiry = false) {
  const { data } = await admin
    .from("api_cache")
    .select("response_data, expires_at")
    .eq("cache_key", key)
    .maybeSingle();
  if (!data) return null;
  if (!ignoreExpiry && new Date(data.expires_at as unknown as string).getTime() < Date.now()) return null;
  return (data as { response_data: unknown }).response_data;
}

async function writeCache(
  admin: ReturnType<typeof createClient>,
  key: string,
  data: unknown,
  ttlSeconds = 24 * 60 * 60,
) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await admin.from("api_cache").upsert(
    { cache_key: key, response_data: data, expires_at: expiresAt },
    { onConflict: "cache_key" },
  );
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // AniList is a public API; anonymous access allowed. Cache protects against abuse.


    const body = await req.json().catch(() => ({})) as {
      op?: string;
      variables?: Record<string, unknown>;
    };
    const op = body.op;
    const variables = body.variables ?? {};

    if (!op || !OPS[op]) {
      return new Response(
        JSON.stringify({ error: "Unknown or missing 'op'", allowed: Object.keys(OPS) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Strip any variable not in the allowlist for this op
    const allowed = ALLOWED_VARS[op];
    const cleanVars: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(variables)) {
      if (allowed.has(k)) cleanVars[k] = v;
    }
    // Sensible defaults / caps
    if ("perPage" in cleanVars) {
      const n = Number(cleanVars.perPage);
      cleanVars.perPage = Number.isFinite(n) ? Math.max(1, Math.min(50, Math.floor(n))) : 24;
    }
    if ("page" in cleanVars) {
      const n = Number(cleanVars.page);
      cleanVars.page = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const key = cacheKey(op, cleanVars);
    const cached = await readCache(admin, key);
    if (cached) {
      return new Response(JSON.stringify({ data: cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gqlRes = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: OPS[op], variables: cleanVars }),
    });

    if (!gqlRes.ok) {
      const text = await gqlRes.text();
      console.error(`AniList request failed [${gqlRes.status}]: ${text}`);
      // On rate limit or upstream errors, serve stale cache if available
      if (gqlRes.status === 429 || gqlRes.status >= 500) {
        const stale = await readCache(admin, key, true);
        if (stale) {
          return new Response(JSON.stringify({ data: stale, cached: true, stale: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      const retryAfter = gqlRes.headers.get("retry-after");
      return new Response(
        JSON.stringify({ error: "AniList request failed", status: gqlRes.status, details: text }),
        {
          status: gqlRes.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            ...(retryAfter ? { "Retry-After": retryAfter } : {}),
          },
        },
      );
    }

    const json = await gqlRes.json();
    if (json.errors) {
      console.error("AniList GraphQL errors:", JSON.stringify(json.errors));
      return new Response(
        JSON.stringify({ error: "GraphQL errors", details: json.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cache detail responses longer than list views; airing shows only a day (next episode, score)
    const airing = json.data?.Media?.status === "RELEASING";
    const ttl = op === "detail" && !airing ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
    // Not for crawlers, see _shared/crawler.ts
    if (!fromCrawler(req)) await writeCache(admin, key, json.data, ttl);

    return new Response(JSON.stringify({ data: json.data, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("anilist function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
