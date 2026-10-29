import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Footer from "@/components/Footer";
import MediaCard from "@/components/MediaCard";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronLeft, ChevronRight, Tv as LiveTvTwoTone, Film as MovieTwoTone, Gamepad2 as SportsEsportsTwoTone } from "lucide-react";
import { Link } from "@/lib/locale-router";
import {
  discoverMovies,
  discoverSeries,
  discoverGames,
  getMovieDetail,
  getSeriesDetail,
  tmdbImage,
  tmdbBackdrop,
  rawgImageResize,
  type DiscoverFilters,
  type TmdbMovie,
  type RawgGame,
} from "@/lib/api";
const RAINBOW =
  "linear-gradient(90deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)";

// TMDB family genre id (used to include / exclude family content).
const FAMILY_GENRE = "10751";

/** Category definitions — each drives the TMDB keyword/genre filters for
 *  movies & series, plus the RAWG tag for games (null = hide games). */
interface PrideCategory {
  id: string;
  movie: Pick<DiscoverFilters, "keyword" | "genre" | "withoutGenres">;
  gameTag: string | null;
}

const CATEGORIES: PrideCategory[] = [
  { id: "all", movie: { keyword: "158718" }, gameTag: "lgbt" },
  { id: "bl", movie: { keyword: "353318|289844|365317|10180" }, gameTag: null },
  { id: "gl", movie: { keyword: "214564|280003|15136" }, gameTag: null },
  { id: "adult", movie: { keyword: "158718", withoutGenres: FAMILY_GENRE }, gameTag: "lgbt" },
  { id: "family", movie: { keyword: "158718", genre: FAMILY_GENRE }, gameTag: "lgbt" },
];

/* ---------------- Featured (curated highlights) ---------------- */
type FeaturedMediaType = "filme" | "serien";
interface FeaturedRef {
  id: number;
  type: FeaturedMediaType;
}

// Hand-picked highlights shown at the very top of the page.
const FEATURED: FeaturedRef[] = [
  { id: 283905, type: "serien" },
  { id: 930094, type: "filme" },
  { id: 277513, type: "serien" },
  { id: 131378, type: "serien" },
];

interface FeaturedItem extends FeaturedRef {
  title: string;
  backdrop: string | null;
  poster: string | null;
  overview: string;
  score: number;
  year: string;
}

const useFeatured = (language: string) =>
  useQuery({
    queryKey: ["pride-featured", language],
    queryFn: async (): Promise<FeaturedItem[]> => {
      const results = await Promise.all(
        FEATURED.map(async (ref) => {
          try {
            const d =
              ref.type === "filme"
                ? await getMovieDetail(String(ref.id))
                : await getSeriesDetail(String(ref.id));
            const anyD = d as unknown as Record<string, unknown>;
            const date = (anyD.release_date || anyD.first_air_date || "") as string;
            return {
              ...ref,
              title: ((anyD.title || anyD.name || "") as string),
              backdrop: tmdbBackdrop((anyD.backdrop_path as string | null) ?? null),
              poster: tmdbImage((anyD.poster_path as string | null) ?? null),
              overview: ((anyD.overview || "") as string),
              score: Math.round(((anyD.vote_average as number) || 0) * 10) / 10,
              year: date ? date.slice(0, 4) : "",
            } as FeaturedItem;
          } catch {
            return null;
          }
        }),
      );
      return results.filter((r): r is FeaturedItem => r !== null);
    },
    staleTime: 1000 * 60 * 30,
  });



/* ---------------- Movies / Series section ---------------- */
const useMediaList = (
  type: "movie" | "tv",
  language: string,
  base: Pick<DiscoverFilters, "keyword" | "genre" | "withoutGenres">,
) => {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TmdbMovie[]>([]);
  const filterKey = JSON.stringify(base);

  // Reset when the active category changes.
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [filterKey]);

  const fetcher = type === "movie" ? discoverMovies : discoverSeries;
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["pride-media", type, language, filterKey, page],
    queryFn: () => fetcher({ ...base, sort: "trending", minVotes: 100 }, page),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data?.results) {
      setItems((prev) => {
        if (page === 1) return data.results;
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...data.results.filter((i) => !seen.has(i.id))];
      });
    }
  }, [data, page]);

  const hasMore = data ? page < Math.min(data.total_pages, 20) : false;
  return { items, isLoading: isLoading && page === 1, isFetching, hasMore, loadMore: () => setPage((p) => p + 1) };
};

const useGameList = (tag: string | null) => {
  const [page, setPage] = useState(1);
  const [games, setGames] = useState<RawgGame[]>([]);

  useEffect(() => {
    setPage(1);
    setGames([]);
  }, [tag]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["pride-games", tag, page],
    queryFn: () => discoverGames({ tags: tag!, sort: "trending" }, page),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
    enabled: !!tag,
  });

  useEffect(() => {
    if (data?.results) {
      setGames((prev) => {
        if (page === 1) return data.results;
        const seen = new Set(prev.map((g) => g.id));
        return [...prev, ...data.results.filter((g) => !seen.has(g.id))];
      });
    }
  }, [data, page]);

  const hasMore = !!data?.next && page < 20;
  return { games, isLoading: isLoading && page === 1, isFetching, hasMore, loadMore: () => setPage((p) => p + 1) };
};

const MediaCardWrapped = ({ item, type }: { item: TmdbMovie; type: "filme" | "serien" }) => {
  const title = item.title || (item as { name?: string }).name || "";
  const date = item.release_date || (item as { first_air_date?: string }).first_air_date || "";
  return (
    <MediaCard
      to={`/${type}/${item.id}`}
      type={type === "filme" ? "movie" : "series"}
      title={title}
      poster={tmdbImage(item.poster_path)}
      year={date?.slice(0, 4)}
      score={Math.round(item.vote_average * 10) / 10}
    />
  );
};

const GameCard = ({ game }: { game: RawgGame }) => {
  return (
    <MediaCard
      to={`/games/${game.id}`}
      type="game"
      title={game.name}
      poster={rawgImageResize(game.background_image ?? null, 420)}
      year={game.released?.slice(0, 4)}
      primaryGenre={game.genres?.[0]?.name}
      genres={game.genres?.map((g) => g.name)}
      score={Math.round(game.rating * 2 * 10) / 10}
    />
  );
};

const SkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="aspect-[2/3] rounded-2xl" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
    ))}
  </>
);

const FEATURED_INTERVAL = 7000;

const FeaturedSection = () => {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useFeatured(i18n.language);
  const slides = data ?? [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIndex(index);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 300);
    },
    [isTransitioning],
  );

  const next = useCallback(() => {
    if (slides.length === 0) return;
    goTo((activeIndex + 1) % slides.length);
  }, [activeIndex, slides.length, goTo]);

  const prev = useCallback(() => {
    if (slides.length === 0) return;
    goTo((activeIndex - 1 + slides.length) % slides.length);
  }, [activeIndex, slides.length, goTo]);

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, FEATURED_INTERVAL);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  if (isLoading) {
    return (
      <section className="relative h-[48vh] md:h-[58vh] border-b border-border">
        <Skeleton className="absolute inset-0 rounded-none" />
      </section>
    );
  }

  if (slides.length === 0) return null;

  const current = slides[Math.min(activeIndex, slides.length - 1)];
  const backdrop = current.backdrop || current.poster;

  return (
    <section className="relative h-[48vh] md:h-[58vh] overflow-hidden group border-b border-border">
      {/* Preload adjacent backdrops */}
      {slides.map((s, i) => {
        if (i === activeIndex) return null;
        const src = s.backdrop || s.poster;
        return src ? <link key={i} rel="prefetch" href={src} /> : null;
      })}

      {/* Backdrop with crossfade + Ken Burns */}
      <div
        className="absolute inset-0"
        style={{ opacity: isTransitioning ? 0 : 1, transition: "opacity 600ms cubic-bezier(0.05, 0.7, 0.1, 1)" }}
      >
        {backdrop && (
          <img
            key={activeIndex}
            src={backdrop}
            alt={current.title}
            // React 18 only passes the lowercase attribute through; camelCase fetchPriority logs a warning
            {...{ fetchpriority: "high" }}
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ animation: "mcc-ken-burns 12s cubic-bezier(0.4, 0, 0.1, 1) forwards" }}
          />
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="nav-arrow-button absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-background/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-background/50 opacity-0 group-hover:opacity-100"
            style={{ transition: "opacity 300ms ease, background-color 200ms ease, color 200ms ease" }}
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="nav-arrow-button absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-background/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-background/50 opacity-0 group-hover:opacity-100"
            style={{ transition: "opacity 300ms ease, background-color 200ms ease, color 200ms ease" }}
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="absolute inset-0 flex items-end z-10">
        <div className="container mx-auto px-4 pb-10 md:pb-14 max-w-4xl">
          <div key={activeIndex} className="space-y-3" style={{ animation: "hero-title-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="flex items-center gap-2">
              <Badge className="border-transparent bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                {t("pride.featuredTitle")}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-white/80 border-white/20">
                {current.type === "filme" ? t("nav.movies", "Film") : t("nav.series", "Serie")}
              </Badge>
              {current.year && <span className="text-xs text-white/60">{current.year}</span>}
            </div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
              {current.title}
            </h2>

            {current.overview && (
              <p className="text-white/70 text-sm md:text-base max-w-xl leading-relaxed line-clamp-2">{current.overview}</p>
            )}

            <div className="flex items-center gap-4 pt-1">
              {current.score > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-white font-bold text-sm">{current.score.toFixed(1)}</span>
                </div>
              )}
              <Link
                to={`/${current.type}/${current.id}`}
                className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_32px_-4px_hsl(var(--primary)/0.5)] hover:scale-105 active:scale-95"
                style={{ transition: "all 300ms var(--mcc-ease-spring, cubic-bezier(0.34,1.56,0.64,1))" }}
              >
                {t("home.viewDetails", "Details ansehen")}
              </Link>
            </div>

            {/* Dot indicators */}
            {slides.length > 1 && (
              <div className="flex items-center gap-0 mt-3">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="relative flex items-center justify-center min-w-[24px] min-h-[24px]"
                    aria-label={`Slide ${i + 1}`}
                  >
                    <span
                      className={`block h-1 rounded-full ${
                        i === activeIndex ? "w-6 bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" : "w-1.5 bg-white/30 hover:bg-white/50"
                      }`}
                      style={{ transition: "all 350ms var(--mcc-ease-spring, cubic-bezier(0.34,1.56,0.64,1))" }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2 mb-5">
    {icon} {title}
  </h2>
);

const EmptyState = ({ label }: { label: string }) => (
  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">{label}</p>
);

const LoadMore = ({ show, loading, onClick, label }: { show: boolean; loading: boolean; onClick: () => void; label: string }) => {
  if (!show) return null;
  return (
    <div className="flex justify-center pt-8">
      {loading ? (
        <M3LoadingIndicator size={32} />
      ) : (
        <button
          onClick={onClick}
          className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {label}
        </button>
      )}
    </div>
  );
};

const PrideListPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [activeId, setActiveId] = useState<string>("all");

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === activeId) ?? CATEGORIES[0],
    [activeId],
  );

  const movies = useMediaList("movie", lang, category.movie);
  const series = useMediaList("tv", lang, category.movie);
  const gamesList = useGameList(category.gameTag);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    document.title = t("pride.metaTitle");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("pride.metaDescription"));
  }, [t]);

  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4";

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-14 pb-12">
        {/* Pride hero header */}
        <header className="relative overflow-hidden border-b border-border">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 100% at 0% 0%, hsl(var(--primary)/0.12), transparent 60%)" }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 opacity-70" style={{ background: RAINBOW }} />
          <div className="container mx-auto px-4 py-14 relative">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-primary">
              <span className="h-2 w-2 rounded-full" style={{ background: RAINBOW }} />
              {t("pride.badge")}
            </span>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold text-foreground">{t("pride.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground">{t("pride.subtitle")}</p>
          </div>
        </header>


        {/* Featured highlights */}
        <FeaturedSection />



        {/* Category tabs */}
        <div className="sticky top-14 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
              {CATEGORIES.map((c) => {
                const active = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-250 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_0_16px_-4px_hsl(var(--primary)/0.4)]"
                        : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-transparent hover:border-border/40"
                    }`}
                  >
                    {t(`pride.categories.${c.id}`)}
                  </button>

                );
              })}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 space-y-16">
          {/* Movies */}
          <section>
            <SectionHeader icon={<MovieTwoTone className="w-5 h-5" />} title={t("pride.moviesTitle")} />
            <div className={gridClass}>
              {movies.isLoading ? (
                <SkeletonGrid count={12} />
              ) : movies.items.length ? (
                movies.items.map((m) => <MediaCardWrapped key={m.id} item={m} type="filme" />)
              ) : (
                <EmptyState label={t("pride.empty")} />
              )}
            </div>
            <LoadMore show={movies.hasMore} loading={movies.isFetching} onClick={movies.loadMore} label={t("pride.loadMore")} />
          </section>

          {/* Series */}
          <section>
            <SectionHeader icon={<LiveTvTwoTone className="w-5 h-5" />} title={t("pride.seriesTitle")} />
            <div className={gridClass}>
              {series.isLoading ? (
                <SkeletonGrid count={12} />
              ) : series.items.length ? (
                series.items.map((s) => <MediaCardWrapped key={s.id} item={s} type="serien" />)
              ) : (
                <EmptyState label={t("pride.empty")} />
              )}
            </div>
            <LoadMore show={series.hasMore} loading={series.isFetching} onClick={series.loadMore} label={t("pride.loadMore")} />
          </section>

          {/* Games — only shown for categories that have relevant titles */}
          {category.gameTag && (
            <section>
              <SectionHeader icon={<SportsEsportsTwoTone className="w-5 h-5" />} title={t("pride.gamesTitle")} />
              <div className={gridClass}>
                {gamesList.isLoading ? (
                  <SkeletonGrid count={12} />
                ) : gamesList.games.length ? (
                  gamesList.games.map((g) => <GameCard key={g.id} game={g} />)
                ) : (
                  <EmptyState label={t("pride.empty")} />
                )}
              </div>
              <LoadMore show={gamesList.hasMore} loading={gamesList.isFetching} onClick={gamesList.loadMore} label={t("pride.loadMore")} />
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrideListPage;
