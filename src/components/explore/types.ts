export type ExploreMediaType = "movie" | "series" | "game";

export interface ExploreMediaItem {
  id: string;
  type: ExploreMediaType;
  title: string;
  /** Full poster image URL, or null if none available */
  image: string | null;
  /** Small line under the title, e.g. release year / genre */
  subtitle?: string;
  /** Aggregated score (0–10), or null for unreleased / unrated titles */
  score: number | null;
  /** Whether the title has been released. Unreleased → badge shows "N/A" */
  released?: boolean;
}

/** Sort orders the discover endpoints of TMDB and IGDB both support */
export type ExploreSort = "trending" | "rating" | "newest";
export const EXPLORE_SORTS: readonly ExploreSort[] = ["trending", "rating", "newest"];

/** Release periods as URL values; the date bounds live in usePeriodBounds */
export type ExplorePeriod = "2020s" | "2010s" | "2000s" | "1990s" | "older";
export const EXPLORE_PERIODS: readonly ExplorePeriod[] = ["2020s", "2010s", "2000s", "1990s", "older"];

export function periodBounds(period: ExplorePeriod | null): { from?: string; to?: string } {
  switch (period) {
    case "2020s": return { from: "2020-01-01" };
    case "2010s": return { from: "2010-01-01", to: "2019-12-31" };
    case "2000s": return { from: "2000-01-01", to: "2009-12-31" };
    case "1990s": return { from: "1990-01-01", to: "1999-12-31" };
    case "older": return { to: "1989-12-31" };
    default: return {};
  }
}
