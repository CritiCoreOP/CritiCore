import { useEffect, useState, useRef, useCallback } from "react";
import { Page } from "@/components/layout/Page";
import { Container } from "@/components/layout/Container";
import ApiErrorPage from "@/components/ApiErrorPage";

import MediaCard from "@/components/MediaCard";
import ListPageHeader from "@/components/ListPageHeader";
import { tmdbGenreNames } from "@/lib/tmdbGenres";
import { useTrendingMovies } from "@/hooks/useMedia";
import { useApiTimeout } from "@/hooks/useApiTimeout";
import { useTranslation } from "react-i18next";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { tmdbImage } from "@/lib/api";
import { setSeo } from "@/lib/seo";
import type { TmdbMovie } from "@/lib/api";


const MoviesPage = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<TmdbMovie[]>([]);
  const { data, isLoading, isFetching, isError } = useTrendingMovies(page);
  const timedOut = useApiTimeout(isLoading, !!data);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeo({
      title: t("meta.movies.title"),
      description: t("meta.movies.description"),
      url: "/filme",
    });
  }, [t]);

  useEffect(() => {
    if (data?.results) {
      setAllItems(prev => {
        if (page === 1) return data.results;
        const existingIds = new Set(prev.map(i => i.id));
        return [...prev, ...data.results.filter(i => !existingIds.has(i.id))];
      });
    }
  }, [data, page]);

  const hasMore = data ? page < data.total_pages : false;

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasMore && !isFetching) {
      setPage(p => p + 1);
    }
  }, [hasMore, isFetching]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);


  if (isError || timedOut) return <ApiErrorPage />;

  return (
    <Page>
      <Container>
        <ListPageHeader title={t("pages.moviesTitle")} subtitle={t("pages.moviesSubtitle")} exploreType="movie" />


        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Skeleton until the list is filled: the list is copied from the query in an effect, so for one
              render the data is there but the list is empty and the footer jumped up to the top */}
          {isLoading || (allItems.length === 0 && !!data?.results?.length)
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[2/3] rounded-lg" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              ))
            : allItems.map((item, i) => (
                <div key={item.id} style={{ animationDelay: `${i * 30}ms` }}>
                  <MediaCard headingLevel={2} showType={false}
                    to={`/filme/${item.id}`}
                    state={{ from: "movies", fromPath: "/filme" }}
                    type="movie"
                    title={item.title || ""}
                    poster={tmdbImage(item.poster_path)}
                    year={item.release_date?.slice(0, 4)}
                    primaryGenre={tmdbGenreNames(item.genre_ids, "movie")[0]}
                    genres={tmdbGenreNames(item.genre_ids, "movie")}
                    score={Math.round(item.vote_average * 10) / 10}
                  />
                </div>
              ))}
        </div>

        <div ref={sentinelRef} className="flex justify-center py-8">
          {isFetching && <M3LoadingIndicator size={32} />}
        </div>
      </Container>
    </Page>
  );
};

export default MoviesPage;
