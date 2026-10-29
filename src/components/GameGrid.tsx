import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import MediaCard from "@/components/MediaCard";
import { Skeleton } from "@/components/ui/skeleton";
import { rawgImageResize, type RawgGame } from "@/lib/api";
import { useStaggerReveal } from "@/hooks/useScrollReveal";
import { Gamepad2 as SportsEsportsTwoTone } from "lucide-react";

const NSFW_SLUGS = ["adults-only"];
const NSFW_TAG_SLUGS = ["nudity", "sexual-content", "nsfw"];

const isNsfw = (game: RawgGame) => {
  if (game.esrb_rating && NSFW_SLUGS.includes(game.esrb_rating.slug)) return true;
  if (game.tags?.some(tag => NSFW_TAG_SLUGS.includes(tag.slug))) return true;
  return false;
};

interface GameGridProps {
  title: string;
  items?: RawgGame[] | null;
  isLoading: boolean;
  viewAllLink?: string;
}

const GameGrid = ({ title, items, isLoading, viewAllLink }: GameGridProps) => {
  const { t } = useTranslation();
  const { containerRef, getItemStyle, getItemClassName } = useStaggerReveal({ staggerDelay: 60 });

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <SportsEsportsTwoTone className="w-5 h-5" /> {title}
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
          : items?.map((game, i) => (
              <div
                key={game.id}
                className={`w-[42%] shrink-0 snap-start sm:w-auto ${getItemClassName()}`}
                style={{ ...getItemStyle(i), animationDelay: `${i * 50}ms` }}
              >
                <MediaCard
                  showType={false}
                  to={`/games/${game.id}`}
                  type="game"
                  title={game.name}
                  poster={rawgImageResize(game.background_image ?? null, 420)}
                  year={game.released?.slice(0, 4)}
                  primaryGenre={game.genres?.[0]?.name}
                  genres={game.genres?.map((g) => g.name)}
                  score={Math.round(game.rating * 2 * 10) / 10}
                  explicit={isNsfw(game)}
                  explicitLabel={t("nsfw.badge")}
                />
              </div>
            ))}
      </div>
    </section>
  );
};

export default GameGrid;
