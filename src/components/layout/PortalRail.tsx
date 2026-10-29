import { useTranslation } from "react-i18next";
import { Link } from "@/lib/locale-router";
import { useTrendingMovies, useTrendingSeries, usePopularGames } from "@/hooks/useMedia";
import { tmdbImage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import ScoreBadge from "@/components/ScoreBadge";
import NewsletterSubscribe from "@/components/NewsletterSubscribe";
import { RailSection } from "./Section";

const LIST_SIZE = 5;

interface TrendItem {
  id: number | string;
  title: string;
  poster: string | null;
  rating: number | null;
  href: string;
}

/* Only the fields the rail shows, of the TMDB and RAWG list items */
interface TmdbTrend { id: number; title?: string; name?: string; poster_path?: string | null; vote_average?: number }
interface GameTrend { id: number; name?: string; background_image?: string | null; rating?: number }

/* Same queries (and so the same cache) as the home page's trending column */
const toTmdb = (kind: "filme" | "serien") => (it: TmdbTrend): TrendItem => ({
  id: it.id,
  title: it.title || it.name || "",
  poster: tmdbImage(it.poster_path ?? null, "w92"),
  rating: typeof it.vote_average === "number" ? it.vote_average : null,
  href: `/${kind}/${it.id}`,
});

const toGame = (it: GameTrend): TrendItem => ({
  id: it.id,
  title: it.name || "",
  poster: it.background_image || null,
  rating: typeof it.rating === "number" ? it.rating * 2 : null,
  href: `/games/${it.id}`,
});

function TrendList({ items, loading }: { items: TrendItem[]; loading: boolean }) {
  if (loading) {
    return (
      <ol className="space-y-2" aria-busy="true">
        {Array.from({ length: LIST_SIZE }, (_, i) => (
          <li key={i} className="flex items-center gap-3 py-1">
            <Skeleton className="h-12 w-8 shrink-0 rounded" />
            <Skeleton className="h-4 flex-1" />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="divide-y divide-border/60">
      {items.slice(0, LIST_SIZE).map((item, i) => (
        <li key={item.id}>
          <Link to={item.href} className="group flex items-center gap-3 rounded-md py-2">
            <span className="w-4 shrink-0 text-right text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
            {item.poster ? (
              <img src={item.poster} alt="" width={32} height={48} loading="lazy" className="h-12 w-8 shrink-0 rounded bg-secondary object-cover" />
            ) : (
              <span className="h-12 w-8 shrink-0 rounded bg-secondary" aria-hidden="true" />
            )}
            <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
              {item.title}
            </span>
            {item.rating !== null && item.rating > 0 && <ScoreBadge score={item.rating} size="sm" />}
          </Link>
        </li>
      ))}
    </ol>
  );
}

/* One component per tab: Radix only mounts the open tab, so only its list is fetched */
function MovieTrends() {
  const { data, isLoading } = useTrendingMovies();
  return <TrendList items={(data?.results || []).map(toTmdb("filme"))} loading={isLoading} />;
}
function SeriesTrends() {
  const { data, isLoading } = useTrendingSeries();
  return <TrendList items={(data?.results || []).map(toTmdb("serien"))} loading={isLoading} />;
}
function GameTrends() {
  const { data, isLoading } = usePopularGames();
  return <TrendList items={(data?.results || []).map(toGame)} loading={isLoading} />;
}

function RailTrends() {
  const { t } = useTranslation();
  return (
    <RailSection title={t("layout.trendsTitle")}>
      <Tabs defaultValue="filme">
        <TabsList className="mb-2 grid h-9 w-full grid-cols-3">
          <TabsTrigger value="filme" className="text-xs">{t("nav.movies")}</TabsTrigger>
          <TabsTrigger value="serien" className="text-xs">{t("nav.series")}</TabsTrigger>
          <TabsTrigger value="games" className="text-xs">{t("nav.games")}</TabsTrigger>
        </TabsList>
        <TabsContent value="filme" className="mt-0"><MovieTrends /></TabsContent>
        <TabsContent value="serien" className="mt-0"><SeriesTrends /></TabsContent>
        <TabsContent value="games" className="mt-0"><GameTrends /></TabsContent>
      </Tabs>
    </RailSection>
  );
}

/** Content of the portal side rail: trends and the newsletter */
export default function PortalRail({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8", className)}>
      <RailTrends />
      <NewsletterSubscribe compact />
    </div>
  );
}
