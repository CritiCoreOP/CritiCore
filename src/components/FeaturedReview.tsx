import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import ScoreBadge from "./ScoreBadge";
import { TmdbMovie, tmdbBackdrop } from "@/lib/api";
import { Skeleton } from "./ui/skeleton";

interface FeaturedReviewProps {
  movie?: TmdbMovie;
  isLoading?: boolean;
}

const FeaturedReview = ({ movie, isLoading }: FeaturedReviewProps) => {
  const { t } = useTranslation();

  if (isLoading || !movie) {
    return (
      <section className="relative rounded-xl overflow-hidden">
        <Skeleton className="aspect-[4/3] sm:aspect-[21/9] md:aspect-[3/1] w-full" />
      </section>
    );
  }

  const backdrop = tmdbBackdrop(movie.backdrop_path);
  const score = Math.round(movie.vote_average * 10) / 10;

  return (
    <section className="group relative rounded-xl overflow-hidden border border-border/30 transition-all duration-500 hover:border-primary/20 hover:shadow-[var(--shadow-card-hover)]">
      <div className="relative aspect-[4/3] sm:aspect-[21/9] md:aspect-[3/1] overflow-hidden">
        {backdrop ? (
          <img
            src={backdrop}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-end md:items-center p-6 md:p-10">
          <div className="max-w-lg">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="px-2.5 py-1 text-[10px] font-semibold rounded-md bg-primary/15 text-primary backdrop-blur-sm border border-primary/10 tracking-wide uppercase">
                {t("featured.trending")}
              </span>
              <ScoreBadge score={score} size="sm" />
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground leading-tight">{movie.title}</h2>
            <p className="text-muted-foreground mt-2 text-sm line-clamp-2 max-w-md">{movie.overview}</p>
            <div className="flex items-center gap-4 mt-5">
              <Link
                to={`/filme/${movie.id}`}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.4)] transition-all duration-300"
              >
                {t("home.details")}
              </Link>
              <span className="text-[11px] text-muted-foreground">{movie.release_date}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedReview;
