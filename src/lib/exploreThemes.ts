/**
 * Themed shortcut sections for the Explore page.
 *
 * Each theme is a curated preset that maps to the existing filter model
 * (category slug + optional tag slugs + optional media-type restriction).
 * Selecting a theme just rewrites the same URL params the manual filter bar
 * already writes, so results stay consistent with normal browsing and no new
 * data pipeline is needed.
 *
 * German labels are preferred by default (with an English fallback) because
 * the project's primary audience is German-speaking.
 */

import type { ExploreTypeFilter } from "@/hooks/useExploreMedia";

export interface ExploreTheme {
  /** Stable slug — used as chip key and analytics label. */
  slug: string;
  /** German (primary) label rendered on the chip. */
  label: string;
  /** Optional english label for i18n fallback. */
  labelEn?: string;
  /** Category slug (root or sub) to apply. */
  categorySlug?: string;
  /** Extra tag slugs to combine (AND-semantics like manual chips). */
  tagSlugs?: string[];
  /** Restrict to a media type; defaults to "all". */
  mediaType?: ExploreTypeFilter;
}

/**
 * Static curated list. Kept short and opinionated on purpose — themes are a
 * discovery aid, not an exhaustive taxonomy (that lives in categories/tags).
 */
export const EXPLORE_THEMES: ExploreTheme[] = [
  {
    slug: "cozy-evening",
    label: "Gemütlicher Abend",
    labelEn: "Cozy evening",
    categorySlug: "slice-of-life",
  },
  {
    slug: "edge-of-seat",
    label: "Nervenkitzel",
    labelEn: "Edge of seat",
    categorySlug: "thriller",
  },
  {
    slug: "sci-fi-worlds",
    label: "Sci-Fi Welten",
    labelEn: "Sci-Fi worlds",
    categorySlug: "sci-fi",
  },
  {
    slug: "dark-vibes",
    label: "Düstere Stimmung",
    labelEn: "Dark vibes",
    categorySlug: "horror",
  },
  {
    slug: "feel-good",
    label: "Zum Wohlfühlen",
    labelEn: "Feel good",
    categorySlug: "comedy",
  },
  {
    slug: "epic-adventure",
    label: "Grosses Abenteuer",
    labelEn: "Epic adventure",
    categorySlug: "abenteuer",
  },
  {
    slug: "true-story",
    label: "Wahre Geschichten",
    labelEn: "True stories",
    categorySlug: "dokumentation",
  },
  {
    slug: "series-marathon",
    label: "Serien-Marathon",
    labelEn: "Series marathon",
    mediaType: "series",
  },
  {
    slug: "indie-games",
    label: "Indie Games",
    labelEn: "Indie games",
    mediaType: "game",
    categorySlug: "abenteuer",
  },
];
