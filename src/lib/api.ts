import { supabase } from "@/integrations/supabase/client";
import { callEdge } from "@/lib/edgeCall";
import i18n from "@/i18n";

export interface TmdbMovie {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: string;
}

export interface TmdbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TmdbReleaseDates {
  results?: {
    iso_3166_1: string;
    release_dates: { certification: string; type: number; release_date: string }[];
  }[];
}

export interface TmdbContentRatings {
  results?: { iso_3166_1: string; rating: string }[];
}

export interface TmdbMovieDetail extends TmdbMovie {
  genres: { id: number; name: string }[];
  runtime: number;
  tagline: string;
  status: string;
  imdb_id?: string | null;
  production_companies?: TmdbProductionCompany[];
  videos?: { results: { key: string; site: string; type: string; name: string }[] };
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
    /** Only the key jobs (director, writers, composer, camera); the full crew is on /credits */
    crew?: { id: number; name: string; job: string }[];
  };
  release_dates?: TmdbReleaseDates;
  original_title?: string;
  original_language?: string;
  budget?: number;
  revenue?: number;
  belongs_to_collection?: { id: number; name: string; poster_path: string | null } | null;
  production_countries?: { iso_3166_1: string; name: string }[];
  keywords?: { keywords: { id: number; name: string }[] };
  "watch/providers"?: { results: Record<string, TmdbWatchProviders> };
}

export interface TmdbSeriesDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  tagline: string;
  seasons?: { id: number; season_number: number; name: string; episode_count: number; air_date: string | null; poster_path: string | null; vote_average?: number }[];
  production_companies?: TmdbProductionCompany[];
  videos?: { results: { key: string; site: string; type: string; name: string }[] };
  credits?: { cast: { id: number; name: string; character: string; profile_path: string | null }[] };
  external_ids?: { imdb_id?: string | null };
  content_ratings?: TmdbContentRatings;
  type?: string;
  original_language?: string;
  popularity?: number;
  episode_run_time?: number[];
  created_by?: { id: number; name: string }[];
  networks?: { id: number; name: string; logo_path: string | null }[];
  last_episode_to_air?: TmdbEpisodeRef | null;
  next_episode_to_air?: TmdbEpisodeRef | null;
  keywords?: { results: { id: number; name: string }[] };
  "watch/providers"?: { results: Record<string, TmdbWatchProviders> };
  origin_country?: string[];
}

export interface TmdbEpisodeRef {
  season_number: number;
  episode_number: number;
  air_date: string | null;
  name?: string;
  runtime?: number | null;
}

/** Streaming offers for one country. Source: JustWatch via TMDB, which requires naming JustWatch. */
export interface TmdbWatchProviders {
  link?: string;
  flatrate?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
}

export interface RawgEsrbRating {
  id: number;
  name: string;
  slug: string;
}

export interface RawgGame {
  id: number;
  name: string;
  slug?: string;
  background_image: string | null;
  rating: number;
  released: string;
  genres: { id: number; name: string }[];
  short_screenshots: { id: number; image: string }[];
  platforms?: { platform: { id: number; name: string } }[];
  metacritic?: number;
  esrb_rating?: RawgEsrbRating | null;
  tags?: { id: number; name: string; slug: string }[];
}

export interface RawgGameDetail extends RawgGame {
  description_raw: string;
  description: string;
  website: string;
  developers: { id: number; name: string; logo?: string | null }[];
  publishers: { id: number; name: string; logo?: string | null }[];
  tags: { id: number; name: string; slug: string }[];
  clip?: { clip: string };
  /** IGDB "similar games" references, used by getSimilarGames. */
  similar_game_ids?: number[];
  /** Age ratings by organization, e.g. { system: "USK", rating: "16" } */
  age_ratings?: { system: string; rating: string }[];
  /** IGDB names in English ("Single player", "Co-operative"); the page translates them */
  game_modes?: string[];
  perspectives?: string[];
  series?: string | null;
  engines?: string[];
  /** Supported languages: locale ("de-DE") and how ("Audio", "Subtitles", "Interface") */
  languages?: { locale: string; type: string }[];
  /** Earliest release per platform, ISO date */
  platform_releases?: { platform: string; date: string }[];
  /** "Early access", "Alpha", "Offline" …; null for a normal release */
  release_status?: string | null;
  rating_count?: number;
}

export interface GameTimeToBeat {
  /** Seconds, averaged over IGDB user submissions */
  hastily?: number;
  normally?: number;
  completely?: number;
  count?: number;
}

const TMDB_IMG = "https://image.tmdb.org/t/p";

export const tmdbImage = (path: string | null, size = "w342") =>
  path ? `${TMDB_IMG}/${size}${path}` : null;

export const tmdbBackdrop = (path: string | null, size: "w780" | "w1280" = "w1280") =>
  tmdbImage(path, size);

/**
 * Resize a game image URL. IGDB images are served from images.igdb.com with a
 * size token (`t_cover_big`, `t_720p`, `t_1080p`); we pick the closest one for
 * the requested width. Non-IGDB URLs are returned unchanged.
 */
export const rawgImageResize = (url: string | null, width = 420): string | null => {
  if (!url) return null;
  if (!url.includes("images.igdb.com")) return url;
  const size = width <= 300 ? "t_cover_small" : width <= 480 ? "t_cover_big" : width <= 900 ? "t_720p" : "t_1080p";
  return url.replace(/\/t_[a-z0-9_]+\//, `/${size}/`);
};

/** Content tag/theme slugs that indicate sexually explicit content. */
const EXPLICIT_TAG_SLUGS = new Set([
  "nsfw",
  "sexual-content",
  "nudity",
  "hentai",
  "adult",
  "erotic",
  "eroge",
  "porn",
  "pornographic",
  "mature",
]);


/**
 * Detects sexually explicit games via their ESRB rating (Adults Only) or
 * explicit RAWG content tags, so their covers can be blurred.
 */
export const isExplicitGame = (game: {
  esrb_rating?: RawgEsrbRating | null;
  tags?: { slug: string }[];
}): boolean => {
  if (game.esrb_rating?.slug === "adults-only") return true;
  return (game.tags ?? []).some(tag => EXPLICIT_TAG_SLUGS.has(tag.slug));
};

const tmdbLocaleMap: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  th: "th-TH",
};

const EDGE_RETRY_ATTEMPTS = 3;
const EDGE_RETRY_BASE_DELAY_MS = 300;
const EDGE_FIRST_ATTEMPT_TIMEOUT_MS = 10000;
const EDGE_RETRY_TIMEOUT_MS = 8000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Edge invoke timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

async function invokeEdgeWithRetry<T>(
  functionName: "tmdb" | "igdb" | "omdb" | "tvdb" | "tvdb-link",
  body: Record<string, unknown>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < EDGE_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const timeout = attempt === 0 ? EDGE_FIRST_ATTEMPT_TIMEOUT_MS : EDGE_RETRY_TIMEOUT_MS;
      // Through the shared cache: memory first, then Cloudflare, Supabase only on a miss
      return await withTimeout(callEdge<T>(functionName, body), timeout);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status && status >= 400 && status < 500) throw error;
      lastError = error;
    }

    if (attempt < EDGE_RETRY_ATTEMPTS - 1) {
      await wait(EDGE_RETRY_BASE_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Edge function request failed");
}


/** `lang` overrides the page language, e.g. for a graphic in another language */
export async function fetchTmdb<T>(endpoint: string, params?: Record<string, string>, lang = tmdbLocaleMap[i18n.language] || "de-DE"): Promise<T> {
  return invokeEdgeWithRetry<T>("tmdb", { endpoint, params, language: lang });
}

/* -------------------------------------------------------------------------- */
/*  IGDB (api.igdb.com/v4) — game provider (replaces RAWG)                     */
/*  All calls go through the cached `igdb` edge function (Apicalypse bodies);   */
/*  Twitch client id/secret stay server-side.                                  */
/* -------------------------------------------------------------------------- */

export async function fetchIgdb<T>(endpoint: string, query: string): Promise<T> {
  return invokeEdgeWithRetry<T>("igdb", { endpoint, query });
}

interface IgdbImageRef { id?: number; image_id?: string }
interface IgdbNamed { id: number; name: string; slug?: string }

interface IgdbGameRaw {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  cover?: IgdbImageRef;
  screenshots?: IgdbImageRef[];
  first_release_date?: number;
  total_rating?: number;
  rating?: number;
  aggregated_rating?: number;
  genres?: IgdbNamed[];
  themes?: IgdbNamed[];
  keywords?: IgdbNamed[];
  platforms?: IgdbNamed[];
  websites?: { id: number; url: string }[];
  videos?: { id: number; video_id: string }[];
  involved_companies?: {
    id: number;
    developer?: boolean;
    publisher?: boolean;
    company?: { id: number; name: string; logo?: { id: number; image_id: string } };
  }[];
  similar_games?: number[];
  age_ratings?: { organization?: { name: string }; rating_category?: { rating: string } }[];
  game_modes?: IgdbNamed[];
  player_perspectives?: IgdbNamed[];
  franchises?: IgdbNamed[];
  collections?: IgdbNamed[];
  game_engines?: IgdbNamed[];
  language_supports?: { language?: { locale?: string }; language_support_type?: { name: string } }[];
  release_dates?: { date?: number; platform?: { abbreviation?: string; name?: string } }[];
  game_status?: { status: string };
  total_rating_count?: number;
}

/** Build an IGDB CDN image URL from an image_id. */
export const igdbImage = (imageId: string | null | undefined, size = "t_cover_big") =>
  imageId ? `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg` : null;

/** Company logos need PNG to keep transparency. */
export const igdbLogo = (imageId: string | null | undefined, size = "t_logo_med") =>
  imageId ? `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.png` : null;

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const IGDB_SUMMARY_FIELDS =
  "fields name,slug,cover.image_id,screenshots.image_id,first_release_date,total_rating,rating," +
  "aggregated_rating,genres.name,genres.slug,themes.name,themes.slug,platforms.name";

const IGDB_DETAIL_FIELDS =
  IGDB_SUMMARY_FIELDS +
  ",summary,storyline,keywords.name,keywords.slug,websites.url,videos.video_id," +
  "involved_companies.developer,involved_companies.publisher,involved_companies.company.name," +
  "involved_companies.company.logo.image_id,similar_games," +
  "age_ratings.organization.name,age_ratings.rating_category.rating,game_modes.name," +
  "player_perspectives.name,franchises.name,collections.name,game_engines.name," +
  "language_supports.language.locale,language_supports.language_support_type.name," +
  "release_dates.date,release_dates.platform.abbreviation,game_status.status,total_rating_count";

/** Map an IGDB game onto the app's game shape (0–5 rating, RAWG-compatible). */
function mapIgdbGame(g: IgdbGameRaw): RawgGame {
  const score100 = g.total_rating ?? g.rating ?? 0;
  const tags = [...(g.themes ?? []), ...(g.keywords ?? [])].map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug || slugify(t.name),
  }));
  const explicit = tags.some((t) => EXPLICIT_TAG_SLUGS.has(t.slug));
  return {
    id: g.id,
    name: g.name,
    slug: g.slug,
    // Poster/cover first — grids and cards expect a portrait key art, not a screenshot.
    background_image:
      igdbImage(g.cover?.image_id, "t_cover_big") ?? igdbImage(g.screenshots?.[0]?.image_id, "t_720p"),
    rating: score100 > 0 ? Math.round((score100 / 20) * 100) / 100 : 0,
    released: g.first_release_date
      ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
      : "",
    genres: (g.genres ?? []).map((x) => ({ id: x.id, name: x.name })),
    short_screenshots: (g.screenshots ?? []).map((s, i) => ({
      id: s.id ?? i,
      image: igdbImage(s.image_id, "t_screenshot_big") ?? "",
    })),
    platforms: (g.platforms ?? []).map((p) => ({ platform: { id: p.id, name: p.name } })),
    metacritic: g.aggregated_rating ? Math.round(g.aggregated_rating) : undefined,
    esrb_rating: explicit ? { id: 5, name: "Adults Only", slug: "adults-only" } : null,
    tags,
  };
}

function mapIgdbGameDetail(g: IgdbGameRaw): RawgGameDetail {
  const base = mapIgdbGame(g);
  const companies = g.involved_companies ?? [];
  return {
    ...base,
    description_raw: g.summary || g.storyline || "",
    description: g.summary || g.storyline || "",
    website: g.websites?.[0]?.url || "",
    developers: companies
      .filter((c) => c.developer && c.company)
      .map((c) => ({ id: c.company!.id, name: c.company!.name, logo: igdbLogo(c.company!.logo?.image_id) })),
    publishers: companies
      .filter((c) => c.publisher && c.company)
      .map((c) => ({ id: c.company!.id, name: c.company!.name, logo: igdbLogo(c.company!.logo?.image_id) })),
    tags: base.tags ?? [],
    clip: g.videos?.[0] ? { clip: `https://www.youtube.com/watch?v=${g.videos[0].video_id}` } : undefined,
    similar_game_ids: g.similar_games ?? [],
    age_ratings: (g.age_ratings ?? [])
      .filter((r) => r.organization?.name && r.rating_category?.rating)
      .map((r) => ({ system: r.organization!.name, rating: r.rating_category!.rating })),
    game_modes: (g.game_modes ?? []).map((m) => m.name),
    perspectives: (g.player_perspectives ?? []).map((p) => p.name),
    // A franchise ("The Witcher") reads better than a collection ("The Witcher Trilogy")
    series: g.franchises?.[0]?.name ?? g.collections?.[0]?.name ?? null,
    engines: (g.game_engines ?? []).map((e) => e.name),
    languages: (g.language_supports ?? [])
      .filter((l) => l.language?.locale && l.language_support_type?.name)
      .map((l) => ({ locale: l.language!.locale!, type: l.language_support_type!.name })),
    platform_releases: earliestReleasePerPlatform(g.release_dates),
    release_status: g.game_status?.status ?? null,
    rating_count: g.total_rating_count,
  };
}

function earliestReleasePerPlatform(dates: IgdbGameRaw["release_dates"]) {
  const first = new Map<string, number>();
  for (const d of dates ?? []) {
    const platform = d.platform?.abbreviation || d.platform?.name;
    if (!platform || !d.date) continue;
    if (!first.has(platform) || d.date < first.get(platform)!) first.set(platform, d.date);
  }
  return [...first.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([platform, ts]) => ({ platform, date: new Date(ts * 1000).toISOString().slice(0, 10) }));
}

/** Escape a free-text term for an Apicalypse string literal. */
const igdbTerm = (value: string) => value.replace(/["\\]/g, "").slice(0, 80);

// Search hits: games, expansions, remakes, remasters and ports. Without it skin packs and DLC
// (IGDB game_type 1, 3, 5, 6, 7, 12-14) came first: "batman" started with three Arkham skin packs.
const IGDB_SEARCH_WHERE = "where version_parent = null & game_type = (0,2,4,8,9,10,11)";


// Movies
export const getTrendingMovies = (page = 1) =>
  fetchTmdb<{ results: TmdbMovie[]; total_pages: number }>("/trending/movie/week", { page: String(page) }).then(d => ({ results: d.results, total_pages: d.total_pages }));

export const getMovieDetail = (id: string) =>
  fetchTmdb<TmdbMovieDetail>(`/movie/${id}`, { append_to_response: "videos,credits,keywords,release_dates,watch/providers" });

export const searchMovies = (query: string) =>
  fetchTmdb<{ results: TmdbMovie[] }>("/search/movie", { query }).then(d => d.results);

export const getMoviesByGenre = (genreId: string) =>
  fetchTmdb<{ results: TmdbMovie[] }>("/discover/movie", { with_genres: genreId, sort_by: "popularity.desc" }).then(d => d.results);

// Discover endpoints with filters
export interface DiscoverFilters {
  sort?: string;
  genre?: string;
  provider?: string;
  from?: string;
  to?: string;
  keyword?: string;
  withoutGenres?: string;
  tags?: string;
  search?: string;
  /** Minimum vote count — useful to surface genuinely popular titles. */
  minVotes?: number;
}

function tmdbSortKey(sort: string | undefined): string {
  switch (sort) {
    case "rating": return "vote_average.desc";
    case "newest": return "primary_release_date.desc";
    case "oldest": return "primary_release_date.asc";
    case "trending": return "popularity.desc";
    default: return "popularity.desc";
  }
}

function tvSortKey(sort: string | undefined): string {
  switch (sort) {
    case "rating": return "vote_average.desc";
    case "newest": return "first_air_date.desc";
    case "oldest": return "first_air_date.asc";
    case "trending": return "popularity.desc";
    default: return "popularity.desc";
  }
}

export const discoverMovies = (filters: DiscoverFilters, page = 1) => {
  const params: Record<string, string> = {
    sort_by: tmdbSortKey(filters.sort),
    page: String(page),
    "vote_count.gte": String(filters.minVotes ?? (filters.sort === "rating" ? 50 : 0)),
  };
  if (filters.genre) params.with_genres = filters.genre;
  if (filters.withoutGenres) params.without_genres = filters.withoutGenres;
  if (filters.keyword) params.with_keywords = filters.keyword;
  if (filters.provider) params.with_watch_providers = filters.provider;
  if (filters.provider) params.watch_region = "DE";
  if (filters.from) params["primary_release_date.gte"] = filters.from;
  if (filters.to) params["primary_release_date.lte"] = filters.to;
  return fetchTmdb<{ results: TmdbMovie[]; total_pages: number }>("/discover/movie", params);
};

export const discoverSeries = (filters: DiscoverFilters, page = 1) => {
  const params: Record<string, string> = {
    sort_by: tvSortKey(filters.sort),
    page: String(page),
    "vote_count.gte": String(filters.minVotes ?? (filters.sort === "rating" ? 50 : 0)),
  };
  if (filters.genre) params.with_genres = filters.genre;
  if (filters.withoutGenres) params.without_genres = filters.withoutGenres;
  if (filters.keyword) params.with_keywords = filters.keyword;
  if (filters.provider) params.with_watch_providers = filters.provider;
  if (filters.provider) params.watch_region = "DE";
  if (filters.from) params["first_air_date.gte"] = filters.from;
  if (filters.to) params["first_air_date.lte"] = filters.to;
  return fetchTmdb<{ results: TmdbMovie[]; total_pages: number }>("/discover/tv", params);
};

const IGDB_PAGE_SIZE = 18;

const igdbSort = (sort?: string) => {
  switch (sort) {
    case "rating": return "sort total_rating desc;";
    case "newest": return "sort first_release_date desc;";
    case "oldest": return "sort first_release_date asc;";
    case "trending": return "sort total_rating_count desc;";
    default: return "sort total_rating desc;";
  }
};

const unixOf = (date: string) => Math.floor(new Date(date).getTime() / 1000);

export const discoverGames = (filters: DiscoverFilters, page = 1) => {
  const where: string[] = ["cover != null", "version_parent = null"];
  if (filters.sort === "rating") where.push("total_rating_count >= 20");
  if (filters.genre) where.push(`genres = (${filters.genre})`);
  if (filters.tags) where.push(`themes.slug = "${igdbTerm(filters.tags)}"`);
  if (filters.from) where.push(`first_release_date >= ${unixOf(filters.from)}`);
  if (filters.to) where.push(`first_release_date <= ${unixOf(filters.to)}`);

  const offset = (page - 1) * IGDB_PAGE_SIZE;
  const query = filters.search
    ? `${IGDB_SUMMARY_FIELDS}; search "${igdbTerm(filters.search)}"; where ${where.join(" & ")}; limit ${IGDB_PAGE_SIZE}; offset ${offset};`
    : `${IGDB_SUMMARY_FIELDS}; where ${where.join(" & ")}; ${igdbSort(filters.sort)} limit ${IGDB_PAGE_SIZE}; offset ${offset};`;

  return fetchIgdb<IgdbGameRaw[]>("/games", query).then((rows) => ({
    results: (rows ?? []).map(mapIgdbGame),
    count: (rows ?? []).length,
    next: (rows ?? []).length === IGDB_PAGE_SIZE ? String(page + 1) : null,
  }));
};


// Series
export const getTrendingSeries = (page = 1) =>
  fetchTmdb<{ results: TmdbMovie[]; total_pages: number }>("/trending/tv/week", { page: String(page) }).then(d => ({ results: d.results, total_pages: d.total_pages }));

export const getSeriesDetail = (id: string) =>
  fetchTmdb<TmdbSeriesDetail>(`/tv/${id}`, { append_to_response: "videos,credits,external_ids,keywords,content_ratings,watch/providers" });

export const searchSeries = (query: string) =>
  fetchTmdb<{ results: TmdbMovie[] }>("/search/tv", { query }).then(d => d.results);

// Season & Episode details
export interface TmdbSeason {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  episodes: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  vote_average: number;
  runtime: number | null;
}

export const getSeasonDetail = (seriesId: string, seasonNumber: number) =>
  fetchTmdb<TmdbSeason>(`/tv/${seriesId}/season/${seasonNumber}`);

export const getEpisodeDetail = (seriesId: string, seasonNumber: number, episodeNumber: number) =>
  fetchTmdb<TmdbEpisode>(`/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`);

// Games (IGDB)
// Real trending games: IGDB popularity_primitives (live popularity signals),
// popularity_type 5 = Steam 24hr peak players (live "what people play right now").
export const getPopularGames = async (page = 1) => {
  const limit = 12;
  const offset = (page - 1) * limit;

  const fallback = () => {
    const now = new Date();
    const from = Math.floor(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime() / 1000);
    const to = Math.floor(new Date(now.getFullYear(), now.getMonth() + 2, now.getDate()).getTime() / 1000);
    const query =
      `${IGDB_SUMMARY_FIELDS}; where cover != null & version_parent = null & ` +
      `first_release_date >= ${from} & first_release_date <= ${to}; ` +
      `sort total_rating_count desc; limit ${limit}; offset ${offset};`;
    return fetchIgdb<IgdbGameRaw[]>("/games", query).then((rows) => ({
      results: (rows ?? []).map(mapIgdbGame),
      hasMore: (rows ?? []).length === limit,
    }));
  };

  try {
    const prims = await fetchIgdb<{ game_id: number; value: number }[]>(
      "/popularity_primitives",
      `fields game_id,value,popularity_type; where popularity_type = 5; sort value desc; limit ${limit * 3}; offset ${offset * 3};`,
    );
    const ids = Array.from(new Set((prims ?? []).map((p) => p.game_id))).filter(Boolean);
    if (!ids.length) return fallback();

    const rows = await fetchIgdb<IgdbGameRaw[]>(
      "/games",
      `${IGDB_SUMMARY_FIELDS}; where id = (${ids.join(",")}) & cover != null & version_parent = null; limit ${ids.length};`,
    );
    const rank = new Map(ids.map((id, i) => [id, i]));
    const ordered = (rows ?? [])
      .sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999))
      .slice(0, limit);
    if (!ordered.length) return fallback();
    return { results: ordered.map(mapIgdbGame), hasMore: ids.length > limit };
  } catch {
    return fallback();
  }
};

export const getGameDetail = (id: string) =>
  fetchIgdb<IgdbGameRaw[]>("/games", `${IGDB_DETAIL_FIELDS}; where id = ${Number(id) || 0}; limit 1;`).then((rows) => {
    if (!rows?.length) throw new Error("Game not found");
    return mapIgdbGameDetail(rows[0]);
  });

/** Average play time from IGDB (players' submissions); null when nobody submitted one */
export const getGameTimeToBeat = (id: string) =>
  fetchIgdb<GameTimeToBeat[]>(
    "/game_time_to_beats",
    `fields hastily,normally,completely,count; where game_id = ${Number(id) || 0}; limit 1;`,
  ).then((rows) => rows?.[0] ?? null);

export const searchGames = (query: string) =>
  fetchIgdb<IgdbGameRaw[]>(
    "/games",
    `${IGDB_SUMMARY_FIELDS}; search "${igdbTerm(query)}"; ${IGDB_SEARCH_WHERE}; limit 12;`,
  ).then((rows) => (rows ?? []).map(mapIgdbGame));

export const getGamesByGenre = (genre: string) =>
  fetchIgdb<IgdbGameRaw[]>(
    "/games",
    `${IGDB_SUMMARY_FIELDS}; where genres = (${genre}) & cover != null & version_parent = null; sort total_rating desc; limit 12;`,
  ).then((rows) => (rows ?? []).map(mapIgdbGame));


// Similar content
export const getSimilarMovies = (id: string) =>
  fetchTmdb<{ results: TmdbMovie[] }>(`/movie/${id}/similar`).then(d => d.results.slice(0, 12));

// Recommendations (what viewers of this show also watch) fit far better than /similar, which matches
// on genre keywords only (Arcane → Pokémon). /similar stays as fallback for shows without recommendations.
export const getSimilarSeries = async (id: string) => {
  const recs = await fetchTmdb<{ results: TmdbMovie[] }>(`/tv/${id}/recommendations`);
  if (recs.results.length >= 4) return recs.results.slice(0, 12);
  const similar = await fetchTmdb<{ results: TmdbMovie[] }>(`/tv/${id}/similar`);
  return similar.results.slice(0, 12);
};

export const getSimilarGames = (id: string) =>
  fetchIgdb<IgdbGameRaw[]>("/games", `fields similar_games; where id = ${Number(id) || 0}; limit 1;`)
    .then((rows) => {
      const ids = rows?.[0]?.similar_games ?? [];
      if (!ids.length) return [] as RawgGame[];
      return fetchIgdb<IgdbGameRaw[]>(
        "/games",
        `${IGDB_SUMMARY_FIELDS}; where id = (${ids.slice(0, 12).join(",")}); limit 12;`,
      ).then((games) => (games ?? []).map(mapIgdbGame));
    })
    .catch(() => [] as RawgGame[]);


// TMDB Genres
export const getMovieGenres = () =>
  fetchTmdb<{ genres: { id: number; name: string }[] }>("/genre/movie/list").then(d => d.genres);

export const getSeriesGenres = () =>
  fetchTmdb<{ genres: { id: number; name: string }[] }>("/genre/tv/list").then(d => d.genres);

// TMDB Watch Providers
export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export const getWatchProviders = (region = "DE") =>
  fetchTmdb<{ results: TmdbWatchProvider[] }>(`/watch/providers/movie?watch_region=${region}`).then(d =>
    d.results.sort((a, b) => a.display_priority - b.display_priority).slice(0, 30)
  );


// Person credits (cast member filmography)
export interface TmdbPersonCredits {
  id: number;
  cast: {
    id: number;
    title?: string;
    name?: string;
    media_type: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    character?: string;
  }[];
}

export const getPersonCredits = (personId: number) =>
  fetchTmdb<TmdbPersonCredits>(`/person/${personId}/combined_credits`);

// Company movies/series (discover by company)
export interface TmdbDiscoverResult {
  results: TmdbMovie[];
  total_results: number;
  total_pages: number;
  page: number;
}

export const getMoviesByCompany = (companyId: number, page = 1) =>
  fetchTmdb<TmdbDiscoverResult>("/discover/movie", { with_companies: String(companyId), sort_by: "popularity.desc", page: String(page) });

export const getSeriesByCompany = (companyId: number, page = 1) =>
  fetchTmdb<TmdbDiscoverResult>("/discover/tv", { with_companies: String(companyId), sort_by: "popularity.desc", page: String(page) });

// OMDB
export interface OmdbData {
  Title?: string;
  imdbRating?: string;
  imdbVotes?: string;
  Metascore?: string;
  Ratings?: { Source: string; Value: string }[];
  Rated?: string;
  Awards?: string;
  BoxOffice?: string;
  Response?: string;
}

export const getOmdbData = (imdbId: string) =>
  invokeEdgeWithRetry<OmdbData>("omdb", { imdb_id: imdbId });

// TMDB Images
export interface TmdbImageResult {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  vote_average: number;
}

export interface TmdbImagesResponse {
  backdrops: TmdbImageResult[];
  posters: TmdbImageResult[];
  logos: TmdbImageResult[];
}

export const getMovieImages = (id: string) =>
  fetchTmdb<TmdbImagesResponse>(`/movie/${id}/images`, { include_image_language: "en,null" });

export const getSeriesImages = (id: string) =>
  fetchTmdb<TmdbImagesResponse>(`/tv/${id}/images`, { include_image_language: "en,null" });

// Alternative Titles
export interface TmdbAlternativeTitle {
  iso_3166_1: string;
  title: string;
  type: string;
}

export const getMovieAlternativeTitles = (id: string) =>
  fetchTmdb<{ id: number; titles: TmdbAlternativeTitle[] }>(`/movie/${id}/alternative_titles`).then(d => d.titles);

export const getSeriesAlternativeTitles = (id: string) =>
  fetchTmdb<{ id: number; results: TmdbAlternativeTitle[] }>(`/tv/${id}/alternative_titles`).then(d => d.results);

// Full Credits (cast + crew)
export interface TmdbCrewMember {
  id: number;
  name: string;
  profile_path: string | null;
  department: string;
  job: string;
  known_for_department: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  known_for_department: string;
}

export interface TmdbFullCredits {
  id: number;
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export const getMovieCredits = (id: string) =>
  fetchTmdb<TmdbFullCredits>(`/movie/${id}/credits`);

export const getSeriesCredits = (id: string) =>
  fetchTmdb<TmdbFullCredits>(`/tv/${id}/aggregate_credits`);

// Person detail
export interface TmdbPersonDetail {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  also_known_as: string[];
}

export const getPersonDetail = (id: number) =>
  fetchTmdb<TmdbPersonDetail>(`/person/${id}`);

// Search results page: one page per source, with what is known about the rest
export interface SearchResultPage<T> {
  results: T[];
  /** Total number of hits, when the source reports it (IGDB does not) */
  total: number | null;
  hasMore: boolean;
}

export const searchMoviesPage = (query: string, page = 1): Promise<SearchResultPage<TmdbMovie>> =>
  fetchTmdb<{ results: TmdbMovie[]; total_results: number; total_pages: number }>("/search/movie", { query, page: String(page) })
    .then((d) => ({ results: d.results ?? [], total: d.total_results ?? null, hasMore: page < (d.total_pages ?? 0) }));

export const searchSeriesPage = (query: string, page = 1): Promise<SearchResultPage<TmdbMovie>> =>
  fetchTmdb<{ results: TmdbMovie[]; total_results: number; total_pages: number }>("/search/tv", { query, page: String(page) })
    .then((d) => ({ results: d.results ?? [], total: d.total_results ?? null, hasMore: page < (d.total_pages ?? 0) }));

export const GAME_SEARCH_PAGE_SIZE = 24;

export const searchGamesPage = (query: string, page = 1): Promise<SearchResultPage<RawgGame>> =>
  fetchIgdb<IgdbGameRaw[]>(
    "/games",
    `${IGDB_SUMMARY_FIELDS}; search "${igdbTerm(query)}"; ${IGDB_SEARCH_WHERE}; limit ${GAME_SEARCH_PAGE_SIZE}; offset ${(page - 1) * GAME_SEARCH_PAGE_SIZE};`,
  ).then((rows) => {
    const results = (rows ?? []).map(mapIgdbGame);
    // The igdb function does not allow /games/count, so a full page is the only hint that more exist
    return { results, total: null, hasMore: results.length === GAME_SEARCH_PAGE_SIZE };
  });

// Global search
export const globalSearch = async (query: string) => {
  const [movies, series, games] = await Promise.all([
    searchMovies(query).catch(() => []),
    searchSeries(query).catch(() => []),
    searchGames(query).catch(() => []),
  ]);
  return { movies, series, games };
};

// ---------------------------------------------------------------------------
// TVDB (v4) — second-source provider for series (and enrichment for movies).
// All calls go through the cached `tvdb` edge function; API key stays server-side.
// ---------------------------------------------------------------------------

export interface TvdbSeries {
  id: number;
  name: string;
  slug?: string;
  image?: string | null;
  firstAired?: string | null;
  year?: string | null;
  score?: number | null;
  overview?: string | null;
  aliases?: Array<{ language: string; name: string }>;
  genres?: Array<{ id: number; name: string; slug?: string }>;
  tags?: Array<{ id: number; name: string; helpText?: string | null }>;
  tagOptions?: Array<{ id: number; name: string; helpText?: string | null }>;
  remoteIds?: Array<{ id: string; type: number; sourceName: string }>;
}

export async function fetchTvdb<T>(
  path: string,
  query?: Record<string, string | number | boolean>,
): Promise<T> {
  return invokeEdgeWithRetry<T>("tvdb", { path, query });
}

/** Series details incl. genres, aliases and remoteIds (imdb, tmdb…). */
export const getTvdbSeriesDetail = (id: string | number) =>
  fetchTvdb<{ data: TvdbSeries }>(`/series/${id}/extended`).then((d) => d.data);

/** Free-text series search on TVDB (used for TMDB↔TVDB linking by title). */
export const searchTvdbSeries = (query: string) =>
  fetchTvdb<{ data: TvdbSeries[] }>("/search", { query, type: "series" }).then(
    (d) => d.data ?? [],
  );

/**
 * Resolve a TMDB series → TVDB series id (server-side cached for 7 days).
 * Uses the `tvdb-link` edge function so the /search call is executed at most
 * once per week per TMDB id, keeping enrichment cheap on detail pages.
 */
export const getTvdbSeriesLink = (params: {
  tmdbId: string | number;
  name: string;
  year?: string | number | null;
}) =>
  invokeEdgeWithRetry<{ tvdb_id: number | null }>("tvdb-link", {
    tmdb_type: "series",
    tmdb_id: String(params.tmdbId),
    name: params.name,
    year: params.year ?? null,
  });
