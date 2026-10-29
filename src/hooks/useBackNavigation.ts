import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface BackNav {
  label: string;
  path: string;
}

const ROUTE_KEYS: Record<string, { i18nKey: string; fallbackPath: string }> = {
  explore: { i18nKey: "details.backToExplore", fallbackPath: "/entdecken" },
  movies: { i18nKey: "details.backToMovies", fallbackPath: "/filme" },
  series: { i18nKey: "details.backToSeries", fallbackPath: "/serien" },
  games: { i18nKey: "details.backToGames", fallbackPath: "/games" },
  anime: { i18nKey: "details.backToAnime", fallbackPath: "/anime" },
  news: { i18nKey: "article.backToNews", fallbackPath: "/news" },
  profile: { i18nKey: "details.backToProfile", fallbackPath: "/profil" },
  search: { i18nKey: "details.backToSearch", fallbackPath: "/suche" },
};

/**
 * Returns a contextual "back to X" label and path based on
 * `location.state.from` (set by the originating page's <Link>).
 *
 * @param defaultKey – which ROUTE_KEYS entry to use when no state is present
 */
export function useBackNavigation(defaultKey: string): BackNav {
  const { t } = useTranslation();
  const location = useLocation();
  const state = location.state as { from?: string; fromPath?: string } | null;

  const key = state?.from && ROUTE_KEYS[state.from] ? state.from : defaultKey;
  const entry = ROUTE_KEYS[key] ?? ROUTE_KEYS[defaultKey];

  return {
    label: t(entry.i18nKey),
    path: state?.fromPath ?? entry.fallbackPath,
  };
}
