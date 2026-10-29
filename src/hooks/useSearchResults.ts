import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  searchGamesPage,
  searchMoviesPage,
  searchSeriesPage,
  type RawgGame,
  type SearchResultPage,
  type TmdbMovie,
} from "@/lib/api";
import { searchAnilist, type AnilistMedia } from "@/lib/anilist";
import { searchArticles, type ArticleSearchHit } from "@/lib/articleSearch";

export type SearchKind = "movies" | "series" | "games" | "anime" | "articles";
export const SEARCH_KINDS: readonly SearchKind[] = ["movies", "series", "games", "anime", "articles"];

export interface SearchResultMap {
  movies: TmdbMovie;
  series: TmdbMovie;
  games: RawgGame;
  anime: AnilistMedia;
  articles: ArticleSearchHit;
}

const ANIME_PAGE_SIZE = 24;

const searchAnimePage = (query: string, page: number): Promise<SearchResultPage<AnilistMedia>> =>
  searchAnilist(query, page, ANIME_PAGE_SIZE).then((d) => ({
    results: d.Page.media ?? [],
    total: d.Page.pageInfo.total ?? null,
    hasMore: d.Page.pageInfo.hasNextPage,
  }));

const FETCHERS: { [K in SearchKind]: (query: string, page: number) => Promise<SearchResultPage<SearchResultMap[K]>> } = {
  movies: searchMoviesPage,
  series: searchSeriesPage,
  games: searchGamesPage,
  anime: searchAnimePage,
  articles: searchArticles,
};

/** One source of the search results page, loaded page by page */
export function useSearchSource<K extends SearchKind>(kind: K, query: string) {
  const { i18n } = useTranslation();
  // TMDB answers in the UI language; the other sources do not depend on it
  const lang = kind === "movies" || kind === "series" ? i18n.language : null;
  return useInfiniteQuery({
    queryKey: ["search-page", kind, query, lang],
    queryFn: ({ pageParam }) => FETCHERS[kind](query, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.hasMore ? all.length + 1 : undefined),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
