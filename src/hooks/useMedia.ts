import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getTrendingMovies, getPopularGames, getTrendingSeries,
  getMovieDetail, getSeriesDetail, getGameDetail,
  searchMovies, searchSeries, searchGames,
  getMovieGenres, getSeriesGenres, globalSearch, getWatchProviders,
  getSeasonDetail, getEpisodeDetail, getOmdbData,
  getMovieAlternativeTitles, getSeriesAlternativeTitles,
  getMovieCredits, getSeriesCredits, getPersonDetail,
  getSimilarMovies, getSimilarSeries, getSimilarGames, getGameTimeToBeat,
} from "@/lib/api";

export const useOmdbData = (imdbId: string | null | undefined) =>
  useQuery({
    queryKey: ["omdb", imdbId],
    queryFn: () => getOmdbData(imdbId!),
    enabled: !!imdbId,
    staleTime: 1000 * 60 * 60,
  });

export const useTrendingMovies = (page = 1) => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["trending-movies", i18n.language, page], queryFn: () => getTrendingMovies(page), staleTime: 1000 * 60 * 10, placeholderData: keepPreviousData });
};

export const usePopularGames = (page = 1) =>
  useQuery({ queryKey: ["popular-games", page], queryFn: () => getPopularGames(page), staleTime: 1000 * 60 * 10, placeholderData: keepPreviousData });

export const useTrendingSeries = (page = 1) => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["trending-series", i18n.language, page], queryFn: () => getTrendingSeries(page), staleTime: 1000 * 60 * 10, placeholderData: keepPreviousData });
};

export const useMovieDetail = (id: string) => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["movie", id, i18n.language], queryFn: () => getMovieDetail(id), enabled: !!id, staleTime: 1000 * 60 * 30 });
};

export const useSeriesDetail = (id: string) => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["series", id, i18n.language], queryFn: () => getSeriesDetail(id), enabled: !!id, staleTime: 1000 * 60 * 30 });
};

export const useGameDetail = (id: string) =>
  useQuery({ queryKey: ["game", id], queryFn: () => getGameDetail(id), enabled: !!id, staleTime: 1000 * 60 * 30 });

export const useSeasonDetail = (seriesId: string, seasonNumber: number) => {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ["season", seriesId, seasonNumber, i18n.language],
    queryFn: () => getSeasonDetail(seriesId, seasonNumber),
    enabled: !!seriesId && seasonNumber >= 0,
    staleTime: 1000 * 60 * 30,
  });
};

export const useEpisodeDetail = (seriesId: string, seasonNumber: number, episodeNumber: number) => {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ["episode", seriesId, seasonNumber, episodeNumber, i18n.language],
    queryFn: () => getEpisodeDetail(seriesId, seasonNumber, episodeNumber),
    enabled: !!seriesId && seasonNumber >= 0 && episodeNumber > 0,
  });
};

export const useSearchMovies = (query: string) => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["search-movies", query, i18n.language], queryFn: () => searchMovies(query), enabled: query.length >= 2 });
};

export const useSearchSeries = (query: string) => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["search-series", query, i18n.language], queryFn: () => searchSeries(query), enabled: query.length >= 2 });
};

export const useSearchGames = (query: string) =>
  useQuery({ queryKey: ["search-games", query], queryFn: () => searchGames(query), enabled: query.length >= 2 });

export const useMovieGenres = () => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["movie-genres", i18n.language], queryFn: getMovieGenres, staleTime: 1000 * 60 * 60 });
};

export const useSeriesGenres = () => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["series-genres", i18n.language], queryFn: getSeriesGenres, staleTime: 1000 * 60 * 60 });
};

export const useWatchProviders = (region?: string) => {
  const { i18n } = useTranslation();
  const regionMap: Record<string, string> = { de: "DE", en: "US", fr: "FR", es: "ES", th: "TH" };
  const r = region || regionMap[i18n.language?.split("-")[0]] || "DE";
  return useQuery({ queryKey: ["watch-providers", r], queryFn: () => getWatchProviders(r), staleTime: 1000 * 60 * 60 });
};

export const useGlobalSearch = (query: string) => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["global-search", query, i18n.language], queryFn: () => globalSearch(query), enabled: query.length >= 2 });
};

export const useMovieAlternativeTitles = (id: string) =>
  useQuery({ queryKey: ["movie-alt-titles", id], queryFn: () => getMovieAlternativeTitles(id), enabled: !!id, staleTime: 1000 * 60 * 60 });

export const useSeriesAlternativeTitles = (id: string) =>
  useQuery({ queryKey: ["series-alt-titles", id], queryFn: () => getSeriesAlternativeTitles(id), enabled: !!id, staleTime: 1000 * 60 * 60 });

export const useMovieCredits = (id: string) =>
  useQuery({ queryKey: ["movie-credits", id], queryFn: () => getMovieCredits(id), enabled: !!id, staleTime: 1000 * 60 * 60 });

export const useSeriesCredits = (id: string) =>
  useQuery({ queryKey: ["series-credits", id], queryFn: () => getSeriesCredits(id), enabled: !!id, staleTime: 1000 * 60 * 60 });

export const usePersonDetail = (id: number | null) =>
  useQuery({ queryKey: ["person-detail", id], queryFn: () => getPersonDetail(id!), enabled: id != null, staleTime: 1000 * 60 * 60 });

export const useSimilarMovies = (id: string) => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["similar-movies", id, i18n.language], queryFn: () => getSimilarMovies(id), enabled: !!id, staleTime: 1000 * 60 * 30 });
};

export const useSimilarSeries = (id: string) => {
  const { i18n } = useTranslation();
  return useQuery({ queryKey: ["similar-series", id, i18n.language], queryFn: () => getSimilarSeries(id), enabled: !!id, staleTime: 1000 * 60 * 30 });
};

export const useSimilarGames = (id: string) =>
  useQuery({ queryKey: ["similar-games", id], queryFn: () => getSimilarGames(id), enabled: !!id, staleTime: 1000 * 60 * 30 });

// IGDB answers 400 for this endpoint until the igdb function allows it; no retry, the page just hides the fact
export const useGameTimeToBeat = (id: string) =>
  useQuery({ queryKey: ["game-time-to-beat", id], queryFn: () => getGameTimeToBeat(id), enabled: !!id, staleTime: 1000 * 60 * 60 * 24, retry: false });
