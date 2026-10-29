import { callEdge } from "@/lib/edgeCall";

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface AnilistTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
  userPreferred: string | null;
}

export interface AnilistDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface AnilistMedia {
  id: number;
  idMal: number | null;
  title: AnilistTitle;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    medium: string | null;
    color: string | null;
  };
  bannerImage: string | null;
  format: string | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  startDate: AnilistDate;
  endDate: AnilistDate;
  episodes: number | null;
  duration: number | null;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  genres: string[] | null;
  isAdult: boolean;
  siteUrl: string | null;
}

export interface AnilistMediaDetail extends AnilistMedia {
  description: string | null;
  studios: { nodes: { id: number; name: string; siteUrl: string | null }[] } | null;
  trailer: { id: string; site: string; thumbnail: string | null } | null;
  characters: {
    edges: {
      role: string;
      node: {
        id: number;
        name: { full: string | null; native: string | null; userPreferred: string | null };
        image: { large: string | null; medium: string | null };
      };
      voiceActors: {
        id: number;
        name: { full: string | null };
        image: { medium: string | null };
        language: string;
      }[];
    }[];
  } | null;
  relations: {
    edges: {
      relationType: string;
      node: {
        id: number;
        type: string;
        title: AnilistTitle;
        coverImage: { medium: string | null };
        format: string | null;
      };
    }[];
  } | null;
  recommendations: {
    nodes: {
      mediaRecommendation: {
        id: number;
        title: AnilistTitle;
        coverImage: { large: string | null };
        averageScore: number | null;
      } | null;
    }[];
  } | null;
  tags: { id: number; name: string; rank?: number; isAdult: boolean; isGeneralSpoiler: boolean; isMediaSpoiler?: boolean }[] | null;
  externalLinks: { id: number; url: string; site: string; type: string | null }[] | null;
  // Optional: older cached answers (before 2026-10-03) do not carry them
  /** MANGA, LIGHT_NOVEL, ORIGINAL, VIDEO_GAME … */
  source?: string | null;
  /** ISO country code: JP, KR, CN, TW */
  countryOfOrigin?: string | null;
  /** Unix seconds */
  nextAiringEpisode?: { airingAt: number; episode: number } | null;
  rankings?: { rank: number; type: "RATED" | "POPULAR"; allTime: boolean; context: string; season: string | null; year: number | null }[] | null;
}

export interface AnilistPageResult {
  Page: {
    pageInfo: { hasNextPage: boolean; currentPage: number; total: number };
    media: AnilistMedia[];
  };
}

/* ── Client ──────────────────────────────────────────────────────────────── */

async function callAnilist<T>(op: string, variables: Record<string, unknown> = {}): Promise<T> {
  const data = await callEdge<{ data?: T }>("anilist", { op, variables });
  if (!data?.data) throw new Error("Empty AniList response");
  return data.data;
}

export const getAnilistTrending = (page = 1, perPage = 24) =>
  callAnilist<AnilistPageResult>("trending", { page, perPage });

export const getAnilistPopular = (page = 1, perPage = 24) =>
  callAnilist<AnilistPageResult>("popular", { page, perPage });

export const getAnilistSeasonal = (
  season: "WINTER" | "SPRING" | "SUMMER" | "FALL",
  seasonYear: number,
  page = 1,
  perPage = 24,
) => callAnilist<AnilistPageResult>("seasonal", { season, seasonYear, page, perPage });

export const searchAnilist = (search: string, page = 1, perPage = 24) =>
  callAnilist<AnilistPageResult>("search", { search, page, perPage });

export const getAnilistDetail = (id: number) =>
  callAnilist<{ Media: AnilistMediaDetail }>("detail", { id });

/* ── Title preference ─────────────────────────────────────────────────────── */

export type AnimeTitleLang = "romaji" | "english" | "native";

/** Pick the best available title based on user preference, with graceful fallback. */
export function pickTitle(title: AnilistTitle | null | undefined, pref: AnimeTitleLang = "romaji"): string {
  if (!title) return "";
  const primary = title[pref];
  if (primary) return primary;
  return title.romaji || title.english || title.userPreferred || title.native || "";
}

/** Current season derived from month. */
export function currentSeason(date = new Date()): {
  season: "WINTER" | "SPRING" | "SUMMER" | "FALL";
  year: number;
} {
  const m = date.getUTCMonth() + 1;
  const y = date.getUTCFullYear();
  if (m <= 3) return { season: "WINTER", year: y };
  if (m <= 6) return { season: "SPRING", year: y };
  if (m <= 9) return { season: "SUMMER", year: y };
  return { season: "FALL", year: y };
}
