/**
 * Category slug → external TMDB discover mappings.
 *
 * Copied verbatim from the legacy ExplorePage.tsx (which stays untouched) so the
 * rebuilt Explore page can augment its category results with precise TMDB
 * discovery. All TMDB requests still go exclusively through the cached `tmdb`
 * edge function — these are only the filter parameters, never API keys.
 *
 * Example: `school-romance` → TMDB keyword `269719`.
 */

/** Movie genre IDs (TMDB /genre/movie/list). */
export const CATEGORY_TO_TMDB_GENRES: Record<string, string> = {
  action: "28",
  "martial-arts": "28",
  military: "10752",
  superhero: "28",
  romantik: "10749",
  yaoi: "10749",
  yuri: "10749",
  "school-romance": "10749",
  "sci-fi": "878",
  cyberpunk: "878",
  "space-opera": "878",
  dystopie: "878",
  mecha: "878",
  horror: "27",
  slasher: "27",
  psychological: "27",
  "psychological-horror": "27",
  supernatural: "27",
  splatter: "27",
  "survival-horror": "27",
  "slice-of-life": "18",
  comedy: "35",
  drama: "18",
  fantasy: "14",
  thriller: "53",
  animation: "16",
  dokumentation: "99",
  krimi: "80",
  abenteuer: "12",
  musik: "10402",
  mystery: "9648",
  krieg: "10752",
  familie: "10751",
  historie: "36",
  western: "37",
};

/**
 * TV genre IDs (TMDB /genre/tv/list). TV has no horror, thriller, romance, music or history genre:
 * those used to point at "Mystery" (horror turned up Gravity Falls) or at movie-only ids that
 * return a handful of random shows. They are covered by CATEGORY_TO_TV_KEYWORDS instead.
 */
export const CATEGORY_TO_TV_GENRES: Record<string, string> = {
  action: "10759",
  "martial-arts": "10759",
  military: "10768",
  superhero: "10759",
  "sci-fi": "10765",
  cyberpunk: "10765",
  "space-opera": "10765",
  dystopie: "10765",
  mecha: "10765",
  "slice-of-life": "18",
  comedy: "35",
  drama: "18",
  fantasy: "10765",
  animation: "16",
  dokumentation: "99",
  krimi: "80",
  abenteuer: "10759",
  mystery: "9648",
  krieg: "10768",
  familie: "10751",
  western: "37",
};

/**
 * TMDB keyword IDs for series where TV has no matching genre. Checked against /discover/tv
 * (vote_count >= 20): horror -> Stranger Things, American Horror Story; thriller -> Breaking Bad,
 * Dark; historical drama -> Vikings, The Crown. Wins over CATEGORY_TO_TMDB_KEYWORDS for series.
 * "a|b" is TMDB's OR, used where the precise keyword alone has almost no shows.
 */
export const CATEGORY_TO_TV_KEYWORDS: Record<string, string> = {
  horror: "315058",
  slasher: "12339",
  splatter: "315058",
  "survival-horror": "50009|315058",
  psychological: "12565",
  thriller: "316362",
  // romance alone brings Better Call Saul; romantic drama | romantic comedy | love triangle fits
  romantik: "304976|383992|128",
  musik: "4344",
  historie: "192772",
};

/** TMDB keyword IDs for niche categories (precise discovery). */
export const CATEGORY_TO_TMDB_KEYWORDS: Record<string, string> = {
  "martial-arts": "779",
  yaoi: "353318",
  yuri: "214564",
  "school-romance": "269719",
  cyberpunk: "4565",
  "space-opera": "161176",
  dystopie: "4565",
  mecha: "10046",
  supernatural: "6152",
  "psychological-horror": "295907",
  splatter: "344603",
  "survival-horror": "50009",
};

/** IGDB genre IDs (IGDB /genres). */
export const CATEGORY_TO_RAWG_GENRES: Record<string, string> = {
  action: "5,4,25",
  "martial-arts": "4",
  military: "5",
  superhero: "25",
  romantik: "34",
  "school-romance": "34",
  "sci-fi": "5",
  cyberpunk: "12",
  "space-opera": "5",
  dystopie: "5",
  mecha: "5",
  horror: "31",
  slasher: "31",
  psychological: "31",
  "psychological-horror": "31",
  supernatural: "31",
  splatter: "31",
  "survival-horror": "31",
  "slice-of-life": "13",
  comedy: "33",
  drama: "34",
  fantasy: "12",
  thriller: "31",
  animation: "33",
  dokumentation: "13",
  krimi: "31",
  abenteuer: "31",
  musik: "7",
  mystery: "2",
  krieg: "15",
  familie: "35",
  historie: "15",
  western: "5",
};

/** IGDB theme slugs for niche categories (matched via `themes.slug`). */
export const CATEGORY_TO_RAWG_TAGS: Record<string, string> = {
  action: "action",
  horror: "horror",
  slasher: "horror",
  psychological: "horror",
  "psychological-horror": "horror",
  supernatural: "fantasy",
  splatter: "horror",
  "survival-horror": "survival",
  "sci-fi": "science-fiction",
  cyberpunk: "science-fiction",
  "space-opera": "science-fiction",
  dystopie: "science-fiction",
  mecha: "science-fiction",
  fantasy: "fantasy",
  thriller: "thriller",
  comedy: "comedy",
  drama: "drama",
  krieg: "warfare",
  historie: "historical",
  krimi: "mystery",
  mystery: "mystery",
  dokumentation: "non-fiction",
  familie: "kids",
};

/** IGDB free-text search fallbacks for categories without a clean genre/theme. */
export const CATEGORY_TO_RAWG_SEARCH: Record<string, string> = {
  yaoi: "yaoi",
  yuri: "yuri",
  "school-romance": "school romance",
  "martial-arts": "martial arts",
  "slice-of-life": "slice of life",
  western: "western",
};


/**
 * Subcategories that describe a niche best matched by a TMDB keyword rather than
 * a broad genre. When active, prefer keyword-only discovery on TMDB so results
 * stay precise instead of drowning in the parent genre.
 * (Ported verbatim from the legacy ExplorePage.tsx before its removal.)
 */
export const KEYWORD_ONLY_SUBCATEGORIES = new Set<string>([
  "yaoi",
  "yuri",
  "school-romance",
  "cyberpunk",
  "space-opera",
  "dystopie",
  "mecha",
  "supernatural",
  "psychological-horror",
  "splatter",
  "survival-horror",
]);


/** True when the slug has any TMDB movie/tv/keyword mapping. */
export function hasTmdbMapping(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return (
    slug in CATEGORY_TO_TMDB_GENRES ||
    slug in CATEGORY_TO_TV_GENRES ||
    slug in CATEGORY_TO_TMDB_KEYWORDS
  );
}

/** True when the slug has any RAWG genre/tag/search mapping. */
export function hasRawgMapping(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return (
    slug in CATEGORY_TO_RAWG_GENRES ||
    slug in CATEGORY_TO_RAWG_TAGS ||
    slug in CATEGORY_TO_RAWG_SEARCH
  );
}

/** True when the slug maps to any external discovery source (TMDB or RAWG). */
export function hasExternalMapping(slug: string | null | undefined): boolean {
  return hasTmdbMapping(slug) || hasRawgMapping(slug);
}

/* -------------------------------------------------------------------------- */
/*  External API → ExploreMediaItem normalizers                                */
/*                                                                            */
/*  One pure function per source so the mapping is testable in isolation. Each */
/*  produces the exact same shape as our DB media items, so ExploreMediaCard   */
/*  renders external results identically (title, poster, score, N/A).         */
/* -------------------------------------------------------------------------- */

import type { TmdbMovie, RawgGame } from "@/lib/api";
import type { ExploreMediaItem } from "@/components/explore/types";

/** TMDB poster paths ("/abc.jpg") resolve against the image CDN at w500. */
const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500";

/** A rating of 0 (or missing) means "unrated" → null → the card shows N/A. */
function normalizeRating(value: number | null | undefined): number | null {
  return value && value > 0 ? value : null;
}

/** Released only when a valid date exists and is in the past. */
function isReleased(date: string | null | undefined): boolean {
  return !!date && new Date(date).getTime() <= Date.now();
}

function yearOf(date: string | null | undefined): string | undefined {
  return date ? date.slice(0, 4) : undefined;
}

/** TMDB movie discover/trending result → ExploreMediaItem. */
export function normalizeTmdbMovie(item: TmdbMovie): ExploreMediaItem {
  const date = item.release_date;
  return {
    id: String(item.id),
    type: "movie",
    title: item.title || String(item.id),
    image: item.poster_path ? `${TMDB_POSTER_BASE}${item.poster_path}` : null,
    subtitle: yearOf(date),
    score: normalizeRating(item.vote_average),
    released: isReleased(date),
  };
}

/** TMDB TV/series discover/trending result → ExploreMediaItem (title = name!). */
export function normalizeTmdbTv(item: TmdbMovie): ExploreMediaItem {
  const date = item.first_air_date || item.release_date;
  return {
    id: String(item.id),
    type: "series",
    title: item.name || item.title || String(item.id),
    image: item.poster_path ? `${TMDB_POSTER_BASE}${item.poster_path}` : null,
    subtitle: yearOf(date),
    score: normalizeRating(item.vote_average),
    released: isReleased(date),
  };
}

/** RAWG game result → ExploreMediaItem (background_image is already a full URL).
 *  RAWG rates 0–5; we scale to 0–10 so games sit on the same scale as TMDB. */
export function normalizeRawgGame(item: RawgGame): ExploreMediaItem {
  const date = item.released;
  const rawScore = item.rating;
  const scaledScore =
    rawScore && rawScore > 0 ? Math.round(rawScore * 2 * 10) / 10 : null;
  return {
    id: String(item.id),
    type: "game",
    title: item.name || String(item.id),
    image: item.background_image || null,
    subtitle: yearOf(date),
    score: scaledScore,
    released: isReleased(date),
  };
}

/* -------------------------------------------------------------------------- */
/*  TVDB series → ExploreMediaItem                                            */
/*                                                                            */
/*  TVDB v4 series score ranges vary; we treat it as already 0–10 and only    */
/*  keep it when present and > 0. `image` is an absolute CDN URL from TVDB.   */
/* -------------------------------------------------------------------------- */

import type { TvdbSeries } from "@/lib/api";

export function normalizeTvdbSeries(item: TvdbSeries): ExploreMediaItem {
  const date = item.firstAired || (item.year ? `${item.year}-01-01` : null);
  const score =
    typeof item.score === "number" && item.score > 0 && item.score <= 10
      ? item.score
      : null;
  return {
    id: String(item.id),
    type: "series",
    title: item.name || String(item.id),
    image: item.image || null,
    subtitle: yearOf(date),
    score,
    released: isReleased(date),
  };
}

/* -------------------------------------------------------------------------- */
/*  Cross-source merge & tag normalization                                    */
/* -------------------------------------------------------------------------- */

/** Loose title-normalization key for cross-source dedupe. */
export function titleKey(title: string | null | undefined): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Merge two source arrays by (a) same "type:id" and (b) normalized title.
 *
 * `primary` wins on conflicts (used for TMDB movies / TVDB series).
 * Items missing a poster in the primary are enriched from a secondary match.
 * Errors in either source are the caller's responsibility — this helper is pure.
 */
export function mergeMediaSources(
  primary: ExploreMediaItem[],
  secondary: ExploreMediaItem[],
): ExploreMediaItem[] {
  const out: ExploreMediaItem[] = [];
  const seenId = new Set<string>();
  const seenTitle = new Set<string>();
  const secondaryByTitle = new Map<string, ExploreMediaItem>();
  for (const s of secondary) {
    const tk = `${s.type}|${titleKey(s.title)}`;
    if (tk && !secondaryByTitle.has(tk)) secondaryByTitle.set(tk, s);
  }
  const push = (item: ExploreMediaItem) => {
    const idKey = `${item.type}:${item.id}`;
    const tk = `${item.type}|${titleKey(item.title)}`;
    if (seenId.has(idKey)) return;
    if (tk && seenTitle.has(tk)) return;
    seenId.add(idKey);
    if (tk) seenTitle.add(tk);
    out.push(item);
  };
  for (const p of primary) {
    const tk = `${p.type}|${titleKey(p.title)}`;
    const alt = secondaryByTitle.get(tk);
    // Backfill image/score from secondary if primary lacks it.
    if (alt && (!p.image || p.score == null)) {
      push({
        ...p,
        image: p.image ?? alt.image,
        score: p.score ?? alt.score,
      });
    } else {
      push(p);
    }
  }
  for (const s of secondary) push(s);
  return out;
}

/**
 * Small English → German genre/tag rewrite map so cross-source labels feel
 * native. Only entries that actually appear in TVDB/TMDB genre lists are
 * listed; anything unmapped falls through unchanged.
 */
const GENRE_DE: Record<string, string> = {
  action: "Action",
  adventure: "Abenteuer",
  animation: "Animation",
  comedy: "Komödie",
  crime: "Krimi",
  documentary: "Dokumentation",
  drama: "Drama",
  family: "Familie",
  fantasy: "Fantasy",
  history: "Historie",
  horror: "Horror",
  music: "Musik",
  mystery: "Mystery",
  romance: "Romantik",
  "science-fiction": "Sci-Fi",
  "sci-fi": "Sci-Fi",
  thriller: "Thriller",
  war: "Krieg",
  western: "Western",
  "martial-arts": "Kampfsport",
  supernatural: "Übernatürlich",
  suspense: "Spannung",
  children: "Kinder",
  anime: "Anime",
  news: "Nachrichten",
  reality: "Reality",
  soap: "Soap",
  talk: "Talk",
  "game-show": "Spielshow",
  "mini-series": "Mini-Serie",
};

/** Normalize a genre/tag label to its German equivalent when possible. */
export function normalizeGenreLabel(label: string | null | undefined): string {
  if (!label) return "";
  const key = label.trim().toLowerCase().replace(/\s+/g, "-");
  return GENRE_DE[key] ?? label;
}

/** Combine and dedupe genre lists from multiple sources (German-preferred). */
export function mergeGenres(
  ...lists: Array<Array<string | { name?: string } | null | undefined>>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list) {
      const label = typeof raw === "string" ? raw : raw?.name;
      const norm = normalizeGenreLabel(label);
      const key = norm.toLowerCase();
      if (!norm || seen.has(key)) continue;
      seen.add(key);
      out.push(norm);
    }
  }
  return out;
}


