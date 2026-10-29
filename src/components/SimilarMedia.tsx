import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { tmdbImage, rawgImageResize } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import ScoreBadge from "@/components/ScoreBadge";


interface SimilarItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  background_image?: string | null;
  vote_average?: number;
  rating?: number;
  release_date?: string;
  first_air_date?: string;
  released?: string;
}

interface SimilarMediaProps {
  items: SimilarItem[] | undefined;
  isLoading: boolean;
  mediaType: "movie" | "series" | "game";
}

const SimilarMedia = ({ items, isLoading, mediaType }: SimilarMediaProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          {t("details.similar")}
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) return null;

  const getLink = (item: SimilarItem) => {
    switch (mediaType) {
      case "movie": return `/movies/${item.id}`;
      case "series": return `/series/${item.id}`;
      case "game": return `/games/${item.id}`;
    }
  };

  const getImage = (item: SimilarItem) => {
    if (mediaType === "game") return rawgImageResize(item.background_image || null, 420);
    return tmdbImage(item.poster_path || null, "w342");
  };

  const getTitle = (item: SimilarItem) => item.title || item.name || "";

  const getYear = (item: SimilarItem) => {
    const date = item.release_date || item.first_air_date || item.released;
    return date?.slice(0, 4) || "";
  };

  const getScore = (item: SimilarItem) => {
    if (mediaType === "game" && item.rating) return Math.round(item.rating * 2 * 10) / 10;
    if (item.vote_average) return Math.round(item.vote_average * 10) / 10;
    return null;
  };

  return (
    <section style={{ animation: "card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both" }}>
      <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        {t("details.similar")}
      </h2>
      <div className={`grid gap-3 ${mediaType === "game" ? "grid-cols-2 md:grid-cols-3" : "grid-cols-3 md:grid-cols-6"}`}>
        {items.slice(0, mediaType === "game" ? 6 : 12).map((item) => {
          const image = getImage(item);
          const score = getScore(item);
          return (
            <Link
              key={item.id}
              to={getLink(item)}
              aria-label={getTitle(item)}
              className="explore-card group relative block overflow-hidden rounded-2xl bg-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--mcc-ease-out)] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className={`relative overflow-hidden ${mediaType === "game" ? "aspect-video" : "aspect-[2/3]"}`}>
                {image ? (
                  <img width={200} height={300}
                    src={image}
                    alt={getTitle(item)}
                    className="h-full w-full object-cover transition-[transform,filter] duration-300 ease-[var(--mcc-ease-out)] group-hover:scale-105 group-hover:brightness-110"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground text-xs">
                    {getTitle(item)}
                  </div>
                )}

                {/* Score — tier-colored glass badge */}
                <div className="absolute right-2.5 top-2.5">
                  <ScoreBadge score={score} size="sm" />
                </div>

                {/* Bottom gradient scrim */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-media-scrim/95 via-media-scrim/45 to-transparent" />

                {/* Title + year on top of the scrim */}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h3 className="line-clamp-2 font-display text-sm font-semibold text-media-scrim-foreground drop-shadow-sm transition-colors duration-200 ease-[var(--mcc-ease-out)] group-hover:text-primary">
                    {getTitle(item)}
                  </h3>
                  {getYear(item) && (
                    <p className="mt-0.5 truncate text-[11px] text-media-scrim-foreground/60">{getYear(item)}</p>
                  )}
                </div>
              </div>
            </Link>

          );
        })}
      </div>
    </section>
  );
};

export default SimilarMedia;
