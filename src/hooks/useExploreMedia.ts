import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";
import {
  tmdbImage,
  discoverMovies,
  discoverSeries,
  discoverGames,
  getTrendingMovies,
  getTrendingSeries,
  getPopularGames,
  getMovieDetail,
  getSeriesDetail,
  getGameDetail,
  type TmdbMovie,
  type RawgGame,
} from "@/lib/api";
import {
  CATEGORY_TO_TMDB_GENRES,
  CATEGORY_TO_TV_GENRES,
  CATEGORY_TO_TMDB_KEYWORDS,
  CATEGORY_TO_TV_KEYWORDS,
  CATEGORY_TO_RAWG_GENRES,
  CATEGORY_TO_RAWG_TAGS,
  CATEGORY_TO_RAWG_SEARCH,
  normalizeTmdbMovie,
  normalizeTmdbTv,
  normalizeRawgGame,
} from "@/lib/exploreMappings";

import type {
  ExploreMediaItem,
  ExploreMediaType,
  ExploreSort,
} from "@/components/explore/types";

export const EXPLORE_PAGE_SIZE = 24;

export type ExploreTypeFilter = ExploreMediaType | "all";


const VALID_TYPES: ExploreMediaType[] = ["movie", "series", "game"];

function normalizeType(type: string): ExploreMediaType {
  return VALID_TYPES.includes(type as ExploreMediaType)
    ? (type as ExploreMediaType)
    : "movie";
}

/** Resolve a poster reference (TMDB path, absolute URL, or storage path) to a URL. */
function resolvePoster(poster: string | null): string | null {
  if (!poster) return null;
  if (poster.startsWith("http://") || poster.startsWith("https://")) return poster;
  if (poster.startsWith("/")) return tmdbImage(poster);
  // Otherwise treat it as a storage path in the public media-images bucket.
  return supabase.storage.from("media-images").getPublicUrl(poster).data.publicUrl;
}

function toItem(
  media_id: string,
  media_type: string,
  title: string | null,
  poster_path: string | null,
  score: number | null,
  release_date: string | null,
): ExploreMediaItem {
  const released =
    !!release_date && new Date(release_date).getTime() <= Date.now();
  const year = release_date ? release_date.slice(0, 4) : undefined;
  return {
    id: media_id,
    type: normalizeType(media_type),
    title: title || media_id,
    image: resolvePoster(poster_path),
    subtitle: year,
    score,
    released,
  };
}


/**
 * Infinite discovery feed for the unfiltered / type-only "Alle" view.
 *
 * Historically this read from the `explore_media_feed` RPC, whose media universe
 * is built purely from `media_metadata` / `media_images` / `media_releases`.
 * Those tables are empty (media in this project lives only as category/tag
 * associations pointing at external TMDB/RAWG ids), so the RPC always returned
 * zero rows and the grid fell straight into the empty state — even though the
 * Games/Movies/Series pages show plenty of content.
 *
 * Those pages source their content from the external TMDB/RAWG APIs (via the
 * cached edge functions), not the DB. This feed now does the same: it pulls
 * trending movies + series (TMDB) and popular games (RAWG), interleaves them,
 * and paginates infinitely. Each page keeps the same `ExploreMediaItem[]` shape
 * the UI already flattens, so nothing downstream changes.
 */
export function useExploreMedia(mediaType: ExploreTypeFilter = "all", enabled = true) {
  const lang = i18n.language;
  const wantMovie = mediaType === "movie" || mediaType === "all";
  const wantSeries = mediaType === "series" || mediaType === "all";
  const wantGame = mediaType === "game" || mediaType === "all";

  return useInfiniteQuery({
    queryKey: ["explore-media-feed", mediaType, lang],
    // Off while a genre, sort or period is chosen: the page shows the discover results then
    enabled,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 10,
    queryFn: async ({ pageParam }): Promise<ExploreMediaItem[]> => {
      const page = pageParam as number;
      // Error-tolerant per source: a failing source contributes nothing rather
      // than breaking the whole grid. Series discovery is TMDB-only — TVDB has
      // no legal "list series" endpoint in our whitelist; TVDB enrichment is
      // done lazily on detail pages via getTvdbSeriesLink (7-day cached).
      const [movies, tmdbSeries, games] = await Promise.all([
        wantMovie
          ? getTrendingMovies(page).catch(() => ({ results: [] as TmdbMovie[] }))
          : Promise.resolve({ results: [] as TmdbMovie[] }),
        wantSeries
          ? getTrendingSeries(page).catch(() => ({ results: [] as TmdbMovie[] }))
          : Promise.resolve({ results: [] as TmdbMovie[] }),
        wantGame
          ? getPopularGames(page).catch(() => ({ results: [] as RawgGame[] }))
          : Promise.resolve({ results: [] as RawgGame[] }),
      ]);

      const movieItems = (movies.results ?? []).map((m) => tmdbToItem(m, "movie"));
      const seriesItems = (tmdbSeries.results ?? []).map((m) => tmdbToItem(m, "series"));
      const gameItems = (games.results ?? []).map((g) => rawgToItem(g));
      return interleaveDedupe([movieItems, seriesItems, gameItems]);
    },
    // Keep advancing while the last page still produced results.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length > 0 ? allPages.length + 1 : undefined,
  });
}


/**
 * Filtered discovery: media matching an (optional) category AND all selected tags.
 * Category is exclusive (single), tags are combined with AND. Results are enriched
 * with title/poster/score/release from our own DB and optionally narrowed by type.
 *
 * Tag membership mirrors useMediaByTag (media_tags table); category membership
 * mirrors useMediaByCategory (media_categories table).
 */
export function useExploreFilteredMedia(
  categoryId: string | null,
  tagIds: string[],
  mediaType: ExploreTypeFilter = "all",
) {
  const hasCategory = !!categoryId;
  const hasTags = tagIds.length > 0;
  const isActive = hasCategory || hasTags;
  const tagKey = useMemo(() => [...tagIds].sort().join(","), [tagIds]);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["explore-filtered-media", categoryId ?? "", tagKey, mediaType],
    enabled: isActive,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<ExploreMediaItem[]> => {
      // 1. Resolve membership sets.
      let categorySet: Set<string> | null = null;
      if (hasCategory) {
        const { data, error } = await supabase
          .from("media_categories")
          .select("media_id, media_type")
          .eq("category_id", categoryId!);
        if (error) throw error;
        categorySet = new Set(
          (data ?? []).map((m) => `${m.media_type}:${m.media_id}`),
        );
      }

      let tagSet: Set<string> | null = null;
      if (hasTags) {
        const { data, error } = await supabase
          .from("media_tags")
          .select("media_id, media_type, tag_id")
          .in("tag_id", tagIds);
        if (error) throw error;
        // AND-combine: keep media that carry every selected tag.
        const perMedia = new Map<string, Set<string>>();
        for (const r of data ?? []) {
          const k = `${r.media_type}:${r.media_id}`;
          if (!perMedia.has(k)) perMedia.set(k, new Set());
          perMedia.get(k)!.add(r.tag_id);
        }
        tagSet = new Set(
          [...perMedia.entries()]
            .filter(([, tset]) => tset.size === tagIds.length)
            .map(([k]) => k),
        );
      }

      // 2. Intersect category and tag sets (whichever are active).
      let keys: string[];
      if (categorySet && tagSet) {
        keys = [...categorySet].filter((k) => tagSet!.has(k));
      } else {
        keys = [...(categorySet ?? tagSet ?? new Set<string>())];
      }

      // 3. Narrow by media type.
      const filteredKeys = keys.filter(
        (k) => mediaType === "all" || k.split(":")[0] === mediaType,
      );
      if (filteredKeys.length === 0) return [];

      // 4. Enrich with metadata / releases.
      const ids = Array.from(
        new Set(filteredKeys.map((k) => k.split(":").slice(1).join(":"))),
      );

      const [{ data: meta }, { data: rels }] = await Promise.all([
        supabase
          .from("media_metadata")
          .select("media_id, media_type, meta_key, meta_value")
          .in("media_id", ids),
        supabase
          .from("media_releases")
          .select("media_id, media_type, release_date")
          .in("media_id", ids),
      ]);

      type Agg = {
        title: string | null;
        poster: string | null;
        score: number | null;
        release: string | null;
      };
      const map = new Map<string, Agg>();
      const get = (k: string) => {
        if (!map.has(k))
          map.set(k, { title: null, poster: null, score: null, release: null });
        return map.get(k)!;
      };

      for (const r of meta ?? []) {
        const k = `${r.media_type}:${r.media_id}`;
        const agg = get(k);
        if (["title", "name"].includes(r.meta_key)) agg.title = r.meta_value;
        else if (["poster_path", "poster", "poster_url", "image"].includes(r.meta_key))
          agg.poster = r.meta_value;
        else if (["score", "vote_average", "rating"].includes(r.meta_key)) {
          let n = Number(r.meta_value);
          if (!Number.isNaN(n)) {
            // RAWG stores game ratings on a 0–5 scale (key = "rating").
            // Scale to 0–10 so DB games match TMDB movies/series.
            if (r.media_type === "game" && r.meta_key === "rating" && n > 0) {
              n = Math.round(n * 2 * 10) / 10;
            }
            agg.score = n;
          }
        }
      }
      for (const r of rels ?? []) {
        const k = `${r.media_type}:${r.media_id}`;
        const agg = get(k);
        if (r.release_date && (!agg.release || r.release_date < agg.release))
          agg.release = r.release_date;
      }

      const baseItems = filteredKeys.map((k) => {
        const [type, ...rest] = k.split(":");
        const id = rest.join(":");
        const agg = map.get(k) ?? {
          title: null,
          poster: null,
          score: null,
          release: null,
        };
        return toItem(id, type, agg.title, agg.poster, agg.score, agg.release);
      });

      // Our DB stores media only as external id references (TMDB / RAWG ids)
      // with no local metadata, so tag-filtered items often arrive without a
      // title or poster. Enrich every incomplete item from the cached external
      // APIs in small batches so all tags render proper cards instead of
      // falling through to the empty state.
      const needsEnrich = baseItems.filter(
        (it) => it.title === it.id || !it.image,
      );
      if (needsEnrich.length > 0) {
        const enriched = await enrichItemsFromExternal(needsEnrich, queryClient);
        const byKey = new Map(
          enriched
            .filter((e): e is ExploreMediaItem => !!e)
            .map((e) => [`${e.type}:${e.id}`, e]),
        );
        return baseItems
          .map((it) => byKey.get(`${it.type}:${it.id}`) ?? it)
          // Drop items that still have no real data (external lookup failed or
          // returned no title) — a numeric-id card is worse than a shorter grid.
          .filter((it) => it.title !== it.id);
      }

      return baseItems;
    },
  });


  return {
    items: query.data ?? [],
    isLoading: isActive && query.isLoading,
    isError: query.isError,
  };
}

/**
 * Enrich a filtered DB item that lacks local metadata by fetching its details
 * from the external API by id + type (movie/series → TMDB, game → RAWG).
 *
 * All lookups are routed through the TanStack Query cache via
 * `queryClient.fetchQuery`, keyed by `["explore-detail", type, id, lang]`. This
 * means the same item is fetched at most once per (long) stale window and is
 * shared across every tag/category view — repeatedly opening or switching
 * filters no longer re-hits the edge functions for items already resolved.
 * Requests still go through the cached edge functions; on failure we return null
 * so the caller can drop the item instead of rendering a blank card.
 */
async function enrichFromExternal(
  item: ExploreMediaItem,
  queryClient: QueryClient,
): Promise<ExploreMediaItem | null> {
  const lang = i18n.language;
  try {
    return await queryClient.fetchQuery({
      queryKey: ["explore-detail", item.type, item.id, lang],
      // Details are effectively immutable; keep them fresh for a full day and
      // retained long enough to survive navigation between views.
      staleTime: 1000 * 60 * 60 * 24,
      gcTime: 1000 * 60 * 60 * 24,
      queryFn: async (): Promise<ExploreMediaItem | null> => {
        if (item.type === "movie") {
          const d = await getMovieDetail(item.id);
          return normalizeTmdbMovie(d as unknown as TmdbMovie);
        }
        if (item.type === "series") {
          const d = await getSeriesDetail(item.id);
          return normalizeTmdbTv(d as unknown as TmdbMovie);
        }
        const d = await getGameDetail(item.id);
        return normalizeRawgGame(d as unknown as RawgGame);
      },
    });
  } catch {
    return null;
  }
}

async function enrichItemsFromExternal(
  items: ExploreMediaItem[],
  queryClient: QueryClient,
): Promise<(ExploreMediaItem | null)[]> {
  const CONCURRENCY = 8;
  const results: (ExploreMediaItem | null)[] = [];

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    results.push(
      ...(await Promise.all(chunk.map((it) => enrichFromExternal(it, queryClient)))),
    );
  }

  return results;
}



/** Map a TMDB discover/trending result to an ExploreMediaItem via the shared,
 *  testable normalizers in exploreMappings.ts. */
function tmdbToItem(m: TmdbMovie, type: "movie" | "series"): ExploreMediaItem {
  return type === "series" ? normalizeTmdbTv(m) : normalizeTmdbMovie(m);
}

/** Map a RAWG discover result to an ExploreMediaItem via the shared normalizer. */
function rawgToItem(g: RawgGame): ExploreMediaItem {
  return normalizeRawgGame(g);
}


/** Round-robin interleave several source arrays so results feel mixed, then dedupe. */
function interleaveDedupe(sources: ExploreMediaItem[][]): ExploreMediaItem[] {
  const merged: ExploreMediaItem[] = [];
  const max = Math.max(0, ...sources.map((s) => s.length));
  for (let i = 0; i < max; i++) {
    for (const s of sources) if (i < s.length) merged.push(s[i]);
  }
  const seen = new Set<string>();
  return merged.filter((it) => {
    const k = `${it.type}:${it.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * External discovery for a mapped category, combining TMDB (movies + series) and
 * RAWG (games) into one paginated, infinite feed.
 *
 * - All requests go exclusively through the cached `tmdb` / `rawg` edge functions
 *   (Cache-aside via api_cache, service-role-only) — never any client-side keys.
 * - TMDB language follows the active locale automatically (fetchTmdb reads i18n).
 * - Each source keeps its OWN page/cursor state (movies + series by page number,
 *   games by RAWG's `next` cursor), so infinite scroll advances all of them.
 * - Error-tolerant: a source that fails simply contributes nothing; `isError` is
 *   only true when every enabled source failed, letting the grid fall back to DB.
 */
export interface DiscoverOptions {
  sort: ExploreSort;
  from?: string;
  to?: string;
}

export function useExploreExternalDiscovery(
  categorySlug: string | null,
  mediaType: ExploreTypeFilter,
  enabled: boolean,
  options: DiscoverOptions = { sort: "trending" },
) {
  const lang = i18n.language;
  const { sort, from, to } = options;
  // "Best rated" with 20 votes surfaces obscure titles rated 9.8 by their fans
  const minVotes = sort === "rating" ? 200 : 20;

  const genreMovie = categorySlug ? CATEGORY_TO_TMDB_GENRES[categorySlug] : undefined;
  const genreTv = categorySlug ? CATEGORY_TO_TV_GENRES[categorySlug] : undefined;
  const keyword = categorySlug ? CATEGORY_TO_TMDB_KEYWORDS[categorySlug] : undefined;
  const keywordTv = categorySlug ? (CATEGORY_TO_TV_KEYWORDS[categorySlug] ?? keyword) : undefined;
  const genreGame = categorySlug ? CATEGORY_TO_RAWG_GENRES[categorySlug] : undefined;
  const rawgTag = categorySlug ? CATEGORY_TO_RAWG_TAGS[categorySlug] : undefined;
  const rawgSearch = categorySlug ? CATEGORY_TO_RAWG_SEARCH[categorySlug] : undefined;

  const wantMovie = mediaType === "movie" || mediaType === "all";
  const wantSeries = mediaType === "series" || mediaType === "all";
  const wantGame = mediaType === "game" || mediaType === "all";

  // Without a category the discover endpoints run unfiltered (sort and period still apply)
  const movieEnabled = enabled && wantMovie && (!categorySlug || !!(genreMovie || keyword));
  const seriesEnabled = enabled && wantSeries && (!categorySlug || !!(genreTv || keywordTv));
  const gameEnabled = enabled && wantGame && (!categorySlug || !!(genreGame || rawgTag || rawgSearch));

  const movieQuery = useInfiniteQuery({
    queryKey: ["explore-ext-movies", categorySlug, sort, from, to, lang],
    enabled: movieEnabled,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 30,
    retry: 1,
    queryFn: ({ pageParam }) =>
      discoverMovies({ genre: genreMovie, keyword, sort, from, to, minVotes }, pageParam as number),
    getNextPageParam: (last, all) =>
      all.length < (last.total_pages ?? 0) ? all.length + 1 : undefined,
  });

  const seriesQuery = useInfiniteQuery({
    queryKey: ["explore-ext-series", categorySlug, sort, from, to, lang],
    enabled: seriesEnabled,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 30,
    retry: 1,
    queryFn: ({ pageParam }) =>
      discoverSeries({ genre: genreTv, keyword: keywordTv, sort, from, to, minVotes }, pageParam as number),
    getNextPageParam: (last, all) =>
      all.length < (last.total_pages ?? 0) ? all.length + 1 : undefined,
  });

  const gameQuery = useInfiniteQuery({
    queryKey: ["explore-ext-games", categorySlug, sort, from, to, lang],
    enabled: gameEnabled,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 30,
    retry: 1,
    queryFn: ({ pageParam }) =>
      discoverGames(
        { genre: genreGame, tags: rawgTag, search: rawgSearch, sort, from, to },
        pageParam as number,
      ),
    getNextPageParam: (last, all) => (last.next ? all.length + 1 : undefined),
  });

  const items = useMemo(() => {
    const movieItems =
      movieQuery.data?.pages.flatMap((p) => (p.results ?? []).map((m) => tmdbToItem(m, "movie"))) ?? [];
    const seriesItems =
      seriesQuery.data?.pages.flatMap((p) => (p.results ?? []).map((m) => tmdbToItem(m, "series"))) ?? [];
    const gameItems =
      gameQuery.data?.pages.flatMap((p) => (p.results ?? []).map((g) => rawgToItem(g))) ?? [];
    return interleaveDedupe([movieItems, seriesItems, gameItems]);
  }, [movieQuery.data, seriesQuery.data, gameQuery.data]);

  interface QueryState {
    isLoading: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    isError: boolean;
    fetchNextPage: () => void;
  }
  const active: { enabled: boolean; q: QueryState }[] = [
    { enabled: movieEnabled, q: movieQuery },
    { enabled: seriesEnabled, q: seriesQuery },
    { enabled: gameEnabled, q: gameQuery },
  ];
  const activeQueries = active.filter((a) => a.enabled).map((a) => a.q);

  const isLoading = activeQueries.some((q) => q.isLoading);
  const isFetchingNextPage = activeQueries.some((q) => q.isFetchingNextPage);
  const hasNextPage = activeQueries.some((q) => !!q.hasNextPage);
  // Only an error when EVERY enabled source failed (partial failures are tolerated).
  const isError = activeQueries.length > 0 && activeQueries.every((q) => q.isError);

  const fetchNextPage = useCallback(() => {
    for (const { enabled: on, q } of active) {
      if (on && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieEnabled, seriesEnabled, gameEnabled, movieQuery, seriesQuery, gameQuery]);

  return { items, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage };
}



