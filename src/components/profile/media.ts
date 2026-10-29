import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { fetchTmdb, getGameDetail, tmdbImage } from "@/lib/api";

/** Media a profile can show: reviews, saves, seen/played and list entries all use these types */
export type MediaKind = "movie" | "series" | "game";

export const isMediaKind = (type: string): type is MediaKind => type === "movie" || type === "series" || type === "game";

export interface MediaInfo {
  title: string;
  poster: string | null;
  year: string;
}

/** Canonical (German) path; the locale router turns it into the current language */
export function mediaPath(type: string, id: string, season?: number | null): string {
  if (type === "movie") return `/filme/${id}`;
  if (type === "series") return season ? `/serien/${id}/staffel/${season}` : `/serien/${id}`;
  return `/games/${id}`;
}

export function mediaTypeLabel(t: TFunction, type: string): string {
  if (type === "movie") return t("explore.typeMovie");
  if (type === "series") return t("explore.typeSeries");
  if (type === "game") return t("explore.typeGame");
  return type;
}

/** Plural label for filter chips */
export function mediaTypePlural(t: TFunction, type: MediaKind): string {
  if (type === "movie") return t("explore.filters.movies");
  if (type === "series") return t("explore.filters.series");
  return t("explore.filters.games");
}

async function loadMediaInfo(type: MediaKind, id: string): Promise<MediaInfo> {
  if (type === "game") {
    const g = await getGameDetail(id);
    return { title: g.name, poster: g.background_image, year: (g.released || "").slice(0, 4) };
  }
  const d = await fetchTmdb<{ title?: string; name?: string; poster_path?: string | null; release_date?: string; first_air_date?: string }>(
    type === "movie" ? `/movie/${id}` : `/tv/${id}`,
  );
  return {
    title: d.title || d.name || `#${id}`,
    poster: tmdbImage(d.poster_path ?? null, "w185"),
    year: (d.release_date || d.first_air_date || "").slice(0, 4),
  };
}

/**
 * Title, poster and year of one title. Shared cache per title and language, so a film that is both
 * reviewed and saved is fetched once, and switching tabs back and forth fetches nothing again.
 */
export function useMediaInfo(type: string, id: string, enabled = true) {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ["media-info", type, id, i18n.language],
    queryFn: () => loadMediaInfo(type as MediaKind, id),
    enabled: enabled && isMediaKind(type) && /^\d+$/.test(id),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}
