import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/locale-router";
import { getMoviesByCompany, getSeriesByCompany, tmdbImage } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScoreBadge from "@/components/ScoreBadge";
import { Skeleton } from "@/components/ui/skeleton";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import FollowButton from "@/components/FollowButton";
import type { TmdbMovie } from "@/lib/api";

interface StudioOverlayProps {
  id: number;
  name: string;
  logoPath: string | null;
}

const StudioOverlay = ({ id, name, logoPath }: StudioOverlayProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={name}
        className="flex h-14 w-full items-center justify-center rounded-xl bg-secondary/40 border border-border/40 px-4 transition-all hover:border-primary/40 hover:bg-secondary/60 cursor-pointer group"
      >
        {logoPath && (
          <img
            src={tmdbImage(logoPath, "w200")!}
            alt={name}
            className="max-h-7 max-w-[110px] object-contain brightness-0 invert opacity-75 group-hover:opacity-100 transition-opacity"
          />
        )}
      </button>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              {logoPath && (
                <img
                  src={tmdbImage(logoPath, "w200")!}
                  alt={name}
                  className="h-10 max-w-[150px] object-contain brightness-0 invert opacity-90"
                />
              )}
              <DialogTitle className="font-display text-xl">{name}</DialogTitle>
              <FollowButton targetId={String(id)} targetType="studio" targetName={name} targetImage={logoPath ? tmdbImage(logoPath, "w200") : undefined} showCount />
            </div>
          </DialogHeader>

          {open && (
            <Tabs defaultValue="movies" className="mt-4">
              <TabsList className="w-full">
                <TabsTrigger value="movies" className="flex-1">{t("nav.movies")}</TabsTrigger>
                <TabsTrigger value="series" className="flex-1">{t("nav.series")}</TabsTrigger>
              </TabsList>
              <TabsContent value="movies">
                <InfiniteMediaList companyId={id} type="filme" fetcher={getMoviesByCompany} onClose={() => setOpen(false)} />
              </TabsContent>
              <TabsContent value="series">
                <InfiniteMediaList companyId={id} type="serien" fetcher={getSeriesByCompany} onClose={() => setOpen(false)} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

interface InfiniteMediaListProps {
  companyId: number;
  type: "filme" | "serien";
  fetcher: (id: number, page: number) => Promise<{ results: TmdbMovie[]; total_pages: number; page: number }>;
  onClose: () => void;
}

const InfiniteMediaList = ({ companyId, type, fetcher, onClose }: InfiniteMediaListProps) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<TmdbMovie[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["company", type, companyId, page],
    queryFn: () => fetcher(companyId, page),
  });

  useEffect(() => {
    if (data?.results) {
      setAllItems(prev => {
        if (page === 1) return data.results.filter(m => m.poster_path);
        const existingIds = new Set(prev.map(i => i.id));
        return [...prev, ...data.results.filter(i => i.poster_path && !existingIds.has(i.id))];
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
    const observer = new IntersectionObserver(handleObserver, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
        ))}
      </div>
    );
  }

  if (allItems.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{t("common.noEntries")}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
        {allItems.map(item => {
          const title = item.title || item.name || "";
          const year = (item.release_date || item.first_air_date)?.slice(0, 4);
          const score = Math.round(item.vote_average * 10) / 10;
          return (
            <Link
              key={`${type}-${item.id}`}
              to={`/${type}/${item.id}`}
              onClick={onClose}
              className="group rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 transition-all hover:shadow-glow"
            >
              <div className="aspect-[2/3] relative">
                {item.poster_path && (
                  <img src={tmdbImage(item.poster_path, "w300")!} alt={title} className="w-full h-full object-cover" />
                )}
                <div className="absolute top-1.5 right-1.5">
                  <ScoreBadge score={score} size="sm" />
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{title}</p>
                {year && <p className="text-[10px] text-muted-foreground">{year}</p>}
              </div>
            </Link>
          );
        })}
      </div>
      <div ref={sentinelRef} className="flex justify-center py-4">
        {isFetching && <M3LoadingIndicator size={28} />}
      </div>
    </>
  );
};

export default StudioOverlay;