import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { tmdbImage } from "@/lib/api";
import type { TmdbMovie } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/locale-router";
import MediaCard from "@/components/MediaCard";
import { tmdbGenreNames } from "@/lib/tmdbGenres";
import { useStaggerReveal } from "@/hooks/useScrollReveal";


interface MediaGridProps {
  title: string;
  icon?: ReactNode;
  emoji?: string;
  items?: TmdbMovie[] | null;
  isLoading: boolean;
  type: "filme" | "serien";
  viewAllLink?: string;
}

const MediaGrid = ({ title, icon, items, isLoading, type, viewAllLink }: MediaGridProps) => {
  const { t } = useTranslation();
  const { containerRef, getItemStyle, getItemClassName } = useStaggerReveal({ staggerDelay: 60 });
  const cardType = type === "filme" ? "movie" : "series";

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          {icon} {title}
        </h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="inline-flex items-center gap-1 py-2 -my-2 text-xs text-muted-foreground hover:text-primary transition-colors duration-200 group">
            {t("home.viewAll")} <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </Link>
        )}
      </div>
      <div ref={containerRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-2 scrollbar-none sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 lg:grid-cols-4 xl:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[42%] shrink-0 snap-start sm:w-auto space-y-2">
                <Skeleton className="aspect-[2/3] rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            ))
          : items?.map((item, i) => (
              <div
                key={item.id}
                className={`w-[42%] shrink-0 snap-start sm:w-auto ${getItemClassName()}`}
                style={{ ...getItemStyle(i), animationDelay: `${i * 50}ms` }}
              >
                <MediaCard
                  showType={false}
                  to={`/${type}/${item.id}`}
                  type={cardType}
                  title={item.title || item.name || ""}
                  poster={tmdbImage(item.poster_path)}
                  year={(item.release_date || item.first_air_date)?.slice(0, 4)}
                  primaryGenre={tmdbGenreNames(item.genre_ids, cardType)[0]}
                  genres={tmdbGenreNames(item.genre_ids, cardType)}
                  score={Math.round(item.vote_average * 10) / 10}
                />
              </div>
            ))}
      </div>
    </section>
  );
};

export default MediaGrid;
