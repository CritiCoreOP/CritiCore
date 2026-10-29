import { useMemo } from "react";
import { usePopularGames, useTrendingMovies, useTrendingSeries } from "@/hooks/useMedia";
import { useAnimeTitleLang, useAnimeTrending } from "@/hooks/useAnime";
import { tmdbBackdrop, tmdbImage } from "@/lib/api";
import { pickTitle } from "@/lib/anilist";

export type World = "games" | "movies" | "series" | "anime";

export const WORLDS: World[] = ["games", "movies", "series", "anime"];

export interface PoolItem {
  key: string;
  world: World;
  title: string;
  poster: string;
  /** Landscape picture for the world cards; null when the source has none */
  backdrop: string | null;
  /** Canonical (German) path of the detail page */
  to: string;
}

/**
 * Real titles for the about page: what is trending right now in each of the four worlds, from the
 * same sources and caches as the rest of the site. Adult titles stay out.
 */
export function useMediaPool(perWorld = 4) {
  const movies = useTrendingMovies();
  const series = useTrendingSeries();
  const games = usePopularGames();
  const anime = useAnimeTrending(12);
  const titleLang = useAnimeTitleLang();

  const byWorld = useMemo<Record<World, PoolItem[]>>(() => {
    const movieItems: PoolItem[] = (movies.data?.results ?? [])
      .filter((m) => m.poster_path)
      .map((m) => ({
        key: `movie-${m.id}`,
        world: "movies",
        title: m.title || m.name || "",
        poster: tmdbImage(m.poster_path, "w342")!,
        backdrop: tmdbBackdrop(m.backdrop_path, "w780"),
        to: `/filme/${m.id}`,
      }));
    const seriesItems: PoolItem[] = (series.data?.results ?? [])
      .filter((s) => s.poster_path)
      .map((s) => ({
        key: `series-${s.id}`,
        world: "series",
        title: s.name || s.title || "",
        poster: tmdbImage(s.poster_path, "w342")!,
        backdrop: tmdbBackdrop(s.backdrop_path, "w780"),
        to: `/serien/${s.id}`,
      }));
    const gameItems: PoolItem[] = (games.data?.results ?? [])
      .filter((g) => g.background_image && g.esrb_rating?.slug !== "adults-only")
      .map((g) => ({
        key: `game-${g.id}`,
        world: "games",
        title: g.name,
        poster: g.background_image!,
        backdrop: g.short_screenshots?.[0]?.image || null,
        to: `/games/${g.id}`,
      }));
    const animeItems: PoolItem[] = (anime.data?.pages[0]?.Page.media ?? [])
      .filter((a) => !a.isAdult && (a.coverImage.extraLarge || a.coverImage.large))
      .map((a) => ({
        key: `anime-${a.id}`,
        world: "anime",
        title: pickTitle(a.title, titleLang),
        poster: (a.coverImage.extraLarge || a.coverImage.large)!,
        backdrop: a.bannerImage,
        to: `/anime/${a.id}`,
      }));
    return {
      games: gameItems.slice(0, perWorld),
      movies: movieItems.slice(0, perWorld),
      series: seriesItems.slice(0, perWorld),
      anime: animeItems.slice(0, perWorld),
    };
  }, [movies.data, series.data, games.data, anime.data, titleLang, perWorld]);

  // Interleaved, so neighbours on the ring come from different worlds
  const mixed = useMemo(() => {
    const out: PoolItem[] = [];
    for (let i = 0; i < perWorld; i++) {
      for (const world of WORLDS) {
        const item = byWorld[world][i];
        if (item) out.push(item);
      }
    }
    return out;
  }, [byWorld, perWorld]);

  const isLoading = movies.isLoading || series.isLoading || games.isLoading || anime.isLoading;

  return { byWorld, mixed, isLoading };
}
