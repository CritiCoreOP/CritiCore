import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/locale-router";
import { getPersonCredits, tmdbImage } from "@/lib/api";
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

interface CastMemberOverlayProps {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

const CastMemberOverlay = ({ id, name, character, profilePath }: CastMemberOverlayProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const { data: credits, isLoading } = useQuery({
    queryKey: ["person-credits", id],
    queryFn: () => getPersonCredits(id),
    enabled: open,
  });

  const movies = credits?.cast
    ?.filter(c => c.media_type === "movie" && c.poster_path)
    .sort((a, b) => b.vote_average - a.vote_average) ?? [];

  const series = credits?.cast
    ?.filter(c => c.media_type === "tv" && c.poster_path)
    .sort((a, b) => b.vote_average - a.vote_average) ?? [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 w-20 sm:w-24 text-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[var(--mcc-shape-full)] flex flex-col items-stretch"
        aria-label={`${name} als ${character}`}
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden bg-secondary mb-2 border border-border transition-all duration-200 ease-[var(--mcc-ease-out)] group-hover:scale-105 group-hover:shadow-card flex-shrink-0">
          {profilePath ? (
            <img src={tmdbImage(profilePath, "w185")!} alt={`Portrait von ${name}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">?</div>
          )}
        </div>
        <div className="mt-1 w-full min-h-[4rem] sm:min-h-[4.5rem] overflow-hidden">
          <p className="text-[13px] sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-accent-light transition-colors duration-200">{name}</p>
          <p className="text-[11px] sm:text-xs text-foreground/60 truncate leading-snug">{character}</p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                {profilePath ? (
                  <img src={tmdbImage(profilePath, "w185")!} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">?</div>
                )}
              </div>
              <div>
                <DialogTitle className="font-display text-xl">{name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{character}</p>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
              ))}
            </div>
          ) : (
            <Tabs defaultValue="movies" className="mt-4">
              <TabsList className="w-full">
                <TabsTrigger value="movies" className="flex-1">{t("nav.movies")} ({movies.length})</TabsTrigger>
                <TabsTrigger value="series" className="flex-1">{t("nav.series")} ({series.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="movies">
                <CreditGrid items={movies} type="filme" onClose={() => setOpen(false)} />
              </TabsContent>
              <TabsContent value="series">
                <CreditGrid items={series} type="serien" onClose={() => setOpen(false)} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

interface CreditItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  character?: string;
}

const CreditGrid = ({ items, type, onClose }: { items: CreditItem[]; type: "filme" | "serien"; onClose: () => void }) => {
  const { t } = useTranslation();
  
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{t("common.noEntries")}</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
      {items.map(item => {
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
              {item.character && <p className="text-[10px] text-muted-foreground italic line-clamp-1">{item.character}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default CastMemberOverlay;