import { useEffect, useRef, useCallback, useMemo, useId } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Page } from "@/components/layout/Page";
import { Container } from "@/components/layout/Container";
import MediaCard from "@/components/MediaCard";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import ExploreEmptyState from "@/components/explore/ExploreEmptyState";
import ExploreFilterBar from "@/components/explore/ExploreFilterBar";
import {
  EXPLORE_PERIODS,
  EXPLORE_SORTS,
  periodBounds,
  type ExploreMediaItem,
  type ExplorePeriod,
  type ExploreSort,
} from "@/components/explore/types";
import { useCategoryTree } from "@/hooks/useCategories";
import {
  useExploreMedia,
  useExploreFilteredMedia,
  useExploreExternalDiscovery,
  EXPLORE_PAGE_SIZE,
  type ExploreTypeFilter,
} from "@/hooks/useExploreMedia";
import type { ExploreTheme } from "@/lib/exploreThemes";
import { X as CloseTwoTone, AlertCircle as ErrorOutlineTwoTone, SearchX as SearchOffTwoTone } from "lucide-react";

const GRID_CLASS = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

const VALID_TYPES: ExploreTypeFilter[] = ["all", "movie", "series", "game"];

const TYPE_LABEL_KEY: Record<ExploreTypeFilter, string> = {
  all: "explore.filters.allTypes",
  movie: "explore.filters.movies",
  series: "explore.filters.series",
  game: "explore.filters.games",
};

const SORT_LABEL_KEY: Record<ExploreSort, string> = {
  trending: "explore.sortTrending",
  rating: "explore.sortRating",
  newest: "explore.sortNewest",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface ActivePill {
  key: string;
  label: string;
  onRemove: () => void;
}

const ExplorePageV2 = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: tree } = useCategoryTree();
  const roots = useMemo(() => tree ?? [], [tree]);
  const resultsHeadingId = useId();

  useEffect(() => {
    setSeo({
      title: t("meta.explore.title"),
      description: t("meta.explore.description"),
      url: "/entdecken",
    });
  }, [t]);

  // ---- URL is the single source of truth for all filter state ----
  // Invalid param values are ignored (fall back to defaults) instead of breaking.
  const typeParam = searchParams.get("type");
  const mediaType: ExploreTypeFilter = VALID_TYPES.includes(typeParam as ExploreTypeFilter)
    ? (typeParam as ExploreTypeFilter)
    : "all";
  const sortParam = searchParams.get("sort");
  const sort: ExploreSort = EXPLORE_SORTS.includes(sortParam as ExploreSort) ? (sortParam as ExploreSort) : "trending";
  const periodParam = searchParams.get("period");
  const period: ExplorePeriod | null = EXPLORE_PERIODS.includes(periodParam as ExplorePeriod) ? (periodParam as ExplorePeriod) : null;

  const categorySlug = searchParams.get("category");
  const subSlug = searchParams.get("sub");

  const activeRoot = categorySlug ? roots.find((c) => c.slug === categorySlug) : undefined;
  const rootCategoryId = activeRoot?.id ?? null;

  const activeSub = activeRoot && subSlug ? activeRoot.children?.find((c) => c.slug === subSlug) : undefined;
  const subCategoryId = activeSub?.id ?? null;

  const activeCategoryId = subCategoryId || rootCategoryId;
  const isCategoryMode = !!activeCategoryId;
  // Effective slug of the active category (subcategory wins over root).
  const activeCategorySlug = activeSub?.slug ?? activeRoot?.slug ?? null;

  // The trending feed has no sort or period; any of those switches to the discover endpoints
  const isDiscoverMode = isCategoryMode || sort !== "trending" || period !== null;
  const hasActiveFilter = mediaType !== "all" || !!categorySlug || sort !== "trending" || period !== null;

  const filterSignature = `${mediaType}|${categorySlug ?? ""}|${subSlug ?? ""}|${sort}|${period ?? ""}`;

  const setParam = useCallback(
    (key: string, value: string | null, replace = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value == null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  // Media type switch = push (navigable in history). Everything else = replace.
  const handleMediaTypeChange = useCallback(
    (type: ExploreTypeFilter) => setParam("type", type === "all" ? null : type, false),
    [setParam],
  );
  const handleSortChange = useCallback((value: string) => setParam("sort", value === "trending" ? null : value), [setParam]);
  const handlePeriodChange = useCallback((value: string) => setParam("period", value === "all" ? null : value), [setParam]);

  const handleRootChange = useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("sub");
          const cat = id ? roots.find((c) => c.id === id) : undefined;
          if (cat) next.set("category", cat.slug);
          else next.delete("category");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, roots],
  );

  const handleSubChange = useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const sub = id ? activeRoot?.children?.find((c) => c.id === id) : undefined;
          if (sub) next.set("sub", sub.slug);
          else next.delete("sub");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, activeRoot],
  );

  const handleReset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // Moods: rewrite the URL to the preset's category + media type in one shot.
  // Selecting an already-active mood clears it (toggle semantics). Sort and period stay.
  const handleApplyTheme = useCallback(
    (theme: ExploreTheme) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const alreadyActive =
            (!!theme.categorySlug && theme.categorySlug === (activeSub?.slug ?? activeRoot?.slug ?? null)) ||
            (!theme.categorySlug && !!theme.mediaType && theme.mediaType === mediaType);
          next.delete("category");
          next.delete("sub");
          if (alreadyActive) {
            next.delete("type");
            return next;
          }
          if (theme.categorySlug) {
            // Category slug may be a root or a subcategory: pick the right slot.
            const root = roots.find((c) => c.slug === theme.categorySlug);
            const sub = roots.flatMap((c) => c.children ?? []).find((c) => c.slug === theme.categorySlug);
            if (root) next.set("category", root.slug);
            else if (sub) {
              const parent = roots.find((c) => c.children?.some((s) => s.slug === sub.slug));
              if (parent) next.set("category", parent.slug);
              next.set("sub", sub.slug);
            }
          }
          if (theme.mediaType && theme.mediaType !== "all") next.set("type", theme.mediaType);
          else next.delete("type");
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams, roots, activeRoot, activeSub, mediaType],
  );

  // Active filters as removable pills, and the same words as the results heading
  const activePills = useMemo<ActivePill[]>(() => {
    const pills: ActivePill[] = [];
    if (mediaType !== "all") pills.push({ key: "type", label: t(TYPE_LABEL_KEY[mediaType]), onRemove: () => handleMediaTypeChange("all") });
    if (activeRoot) pills.push({ key: "category", label: t(`explore.categorySlug.${activeRoot.slug}`, activeRoot.name), onRemove: () => handleRootChange(null) });
    if (activeSub) pills.push({ key: "sub", label: t(`explore.categorySlug.${activeSub.slug}`, activeSub.name), onRemove: () => handleSubChange(null) });
    if (period) pills.push({ key: "period", label: t(`explore.periods.${period}`), onRemove: () => handlePeriodChange("all") });
    if (sort !== "trending") pills.push({ key: "sort", label: t(SORT_LABEL_KEY[sort]), onRemove: () => handleSortChange("trending") });
    return pills;
  }, [mediaType, activeRoot, activeSub, period, sort, t, handleMediaTypeChange, handleRootChange, handleSubChange, handlePeriodChange, handleSortChange]);

  const resultsTitle = activePills.length ? activePills.map((p) => p.label).join(", ") : t("explore.feedTitle");

  // Unfiltered / type-only feed (infinite scroll)
  const {
    data,
    isLoading: feedLoading,
    isError: feedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useExploreMedia(isDiscoverMode ? "all" : mediaType, !isDiscoverMode);

  // Category-filtered feed from our own DB (editorial picks first)
  const {
    items: filteredItems,
    isLoading: filteredLoading,
    isError: filteredError,
  } = useExploreFilteredMedia(activeCategoryId, [], mediaType);

  // External discovery (TMDB movies/series + IGDB games), infinite across all sources
  const bounds = useMemo(() => periodBounds(period), [period]);
  const {
    items: externalItems,
    isLoading: externalLoading,
    isError: externalError,
    hasNextPage: externalHasNextPage,
    isFetchingNextPage: externalFetchingNextPage,
    fetchNextPage: externalFetchNextPage,
  } = useExploreExternalDiscovery(activeCategorySlug, mediaType, isDiscoverMode, { sort, ...bounds });

  // Popularity-sorted pages overlap while the ranking shifts, so the same title could appear twice
  const feedItems = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages.flat() ?? []).filter((item) => {
      const key = `${item.type}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);

  // Own DB first (they carry editorial category assignments), then everything external that
  // is not already there. DB rows without title or poster are skipped, or replaced by the
  // external item with the same id. With a period or non-default sort the DB rows are left
  // out: they are unsorted and undated, and would break the order the visitor asked for.
  const discoverItems = useMemo(() => {
    const hasRealData = (i: ExploreMediaItem) => i.title !== i.id && !!i.image;
    const dbRows = sort === "trending" && !period ? filteredItems : [];
    const externalByKey = new Map(externalItems.map((i) => [`${i.type}:${i.id}`, i]));
    const seen = new Set<string>();
    const result: ExploreMediaItem[] = [];
    for (const db of dbRows) {
      const key = `${db.type}:${db.id}`;
      if (seen.has(key)) continue;
      if (hasRealData(db)) {
        seen.add(key);
        result.push(db);
      } else if (externalByKey.has(key)) {
        seen.add(key);
        result.push(externalByKey.get(key)!);
      }
    }
    for (const ext of externalItems) {
      const key = `${ext.type}:${ext.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(ext);
    }
    return result;
  }, [externalItems, filteredItems, sort, period]);

  const items = isDiscoverMode ? discoverItems : feedItems;

  const isLoading = isDiscoverMode
    ? (isCategoryMode && filteredLoading) || (externalLoading && filteredItems.length === 0)
    : feedLoading;
  const isError = isDiscoverMode ? externalError && (!isCategoryMode || filteredError) : feedError;
  // External results failed but the DB still had rows: say so instead of looking complete
  const showPartialHint = isDiscoverMode && externalError && items.length > 0;

  const scrollHasNextPage = isDiscoverMode ? externalHasNextPage : hasNextPage;
  const scrollIsFetchingNext = isDiscoverMode ? externalFetchingNextPage : isFetchingNextPage;
  const scrollFetchNextPage = isDiscoverMode ? externalFetchNextPage : fetchNextPage;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && scrollHasNextPage && !scrollIsFetchingNext) scrollFetchNextPage();
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollHasNextPage, scrollIsFetchingNext, scrollFetchNextPage]);

  const showEmptyState = !isLoading && !isError && items.length === 0;
  const backState = { from: "explore", fromPath: `/entdecken${searchParams.toString() ? `?${searchParams}` : ""}` };

  return (
    <Page>
      <Container>
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("explore.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("explore.subtitle")}</p>
        </div>

        <ExploreFilterBar
          mediaType={mediaType}
          rootCategoryId={rootCategoryId}
          subCategoryId={subCategoryId}
          onRootCategoryChange={handleRootChange}
          onSubCategoryChange={handleSubChange}
          activeCategorySlug={activeCategorySlug}
          onApplyTheme={handleApplyTheme}
        />

        {/* Toolbar: stays in view while the endless grid scrolls, so type, sort and period are
            always one tap away. The offset clears the phone top bar; the desktop navbar is lower. */}
        <div className="sticky top-[calc(3.25rem+12px+env(safe-area-inset-top,0px))] z-30 -mx-4 mt-6 mb-2 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={t("explore.mediaType")}
              className="inline-flex max-w-full overflow-x-auto rounded-full border border-border/40 bg-card/50 p-1 scrollbar-none"
            >
              {VALID_TYPES.map((type) => {
                const active = mediaType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleMediaTypeChange(type)}
                    aria-pressed={active}
                    className={cn(
                      "h-8 shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-medium transition-[color,background-color] duration-200 ease-[var(--mcc-ease-out)]",
                      focusRing,
                      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(TYPE_LABEL_KEY[type])}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger aria-label={t("explore.sortBy")} className="h-9 w-auto min-w-[8.5rem] gap-1.5 rounded-full border-border/60 bg-card/40 px-3.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {EXPLORE_SORTS.map((s) => (
                    <SelectItem key={s} value={s}>{t(SORT_LABEL_KEY[s])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={period ?? "all"} onValueChange={handlePeriodChange}>
                <SelectTrigger aria-label={t("explore.period")} className="h-9 w-auto min-w-[8.5rem] gap-1.5 rounded-full border-border/60 bg-card/40 px-3.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">{t("explore.periodAll")}</SelectItem>
                  {EXPLORE_PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>{t(`explore.periods.${p}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results heading with the active filters, each removable */}
        <div className="mb-5 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id={resultsHeadingId} className="font-display text-xl font-bold text-foreground">{resultsTitle}</h2>
          {activePills.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activePills.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={pill.onRemove}
                  aria-label={t("explore.filters.remove", { label: pill.label })}
                  className={cn("group inline-flex h-8 items-center gap-1 rounded-full border border-primary/40 bg-primary/15 pl-3 pr-2 text-xs font-medium text-primary transition-[background-color] duration-200 hover:bg-primary/25", focusRing)}
                >
                  {pill.label}
                  <CloseTwoTone size={14} aria-hidden="true" />
                </button>
              ))}
              <button type="button" onClick={handleReset} className={cn("h-8 rounded-full px-2 text-xs font-medium text-muted-foreground hover:text-foreground", focusRing)}>
                {t("explore.filters.reset")}
              </button>
            </div>
          )}
        </div>

        {showPartialHint && (
          <p className="mb-4 text-xs text-muted-foreground" role="status">{t("explore.tmdbHint")}</p>
        )}

        {isError && (
          <ExploreEmptyState tone="error" icon={ErrorOutlineTwoTone} title={t("explore.loadError")} />
        )}

        {showEmptyState && (
          <ExploreEmptyState
            icon={SearchOffTwoTone}
            title={t("explore.emptyTitle")}
            description={t(hasActiveFilter ? "explore.emptyFiltered" : "explore.emptyBody")}
            action={
              hasActiveFilter ? (
                <button type="button" onClick={handleReset} className={cn("inline-flex h-10 items-center rounded-full border border-border/60 px-5 text-sm font-medium text-foreground hover:bg-secondary/60", focusRing)}>
                  {t("explore.filters.reset")}
                </button>
              ) : undefined
            }
          />
        )}

        {!isError && !showEmptyState && (
          <ul key={filterSignature} aria-labelledby={resultsHeadingId} className={`explore-fade-in list-none ${GRID_CLASS}`}>
            {isLoading
              ? Array.from({ length: EXPLORE_PAGE_SIZE }).map((_, i) => (
                  <li key={`skeleton-${i}`} aria-hidden="true" className="space-y-2">
                    <Skeleton className="aspect-[2/3] rounded-lg" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </li>
                ))
              : items.map((item) => (
                  <li key={`${item.type}:${item.id}`} className="explore-card-in">
                    <MediaCard
                      headingLevel={3}
                      to={`/${item.type === "movie" ? "filme" : item.type === "series" ? "serien" : "games"}/${item.id}`}
                      state={backState}
                      type={item.type}
                      title={item.title}
                      poster={item.image}
                      year={item.subtitle}
                      score={item.released === false ? null : item.score}
                    />
                  </li>
                ))}
          </ul>
        )}

        {!isError && !showEmptyState && !isLoading && (
          <div ref={sentinelRef} aria-hidden="true" className="flex min-h-[48px] items-center justify-center py-8">
            {scrollIsFetchingNext && <M3LoadingIndicator size={32} />}
          </div>
        )}
        {!isError && !showEmptyState && !isLoading && !scrollHasNextPage && items.length > 0 && (
          <p role="status" aria-live="polite" className="pb-4 text-center text-sm text-muted-foreground">
            {t("explore.endOfList")}
          </p>
        )}
      </Container>
    </Page>
  );
};

export default ExplorePageV2;
