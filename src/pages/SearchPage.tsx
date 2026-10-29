import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Film, Flower2, Gamepad2, Newspaper, Search, Tv, X } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Container } from "@/components/layout/Container";
import MediaCard from "@/components/MediaCard";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useSearchParams } from "@/lib/locale-router";
import { setSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/locale";
import { isExplicitGame, rawgImageResize, tmdbImage } from "@/lib/api";
import { tmdbGenreNames } from "@/lib/tmdbGenres";
import { pickTitle, type AnilistMedia } from "@/lib/anilist";
import { useAnimeTitleLang } from "@/hooks/useAnime";
import { ARTICLE_CATEGORY_KEYS, ARTICLE_TYPE_KEYS, isOpinion } from "@/lib/article-labels";
import type { ArticleSearchHit } from "@/lib/articleSearch";
import { readRecentSearches, rememberSearch } from "@/lib/recentSearches";
import { SEARCH_KINDS, useSearchSource, type SearchKind } from "@/hooks/useSearchResults";
import OpinionLabel from "@/components/OpinionLabel";

type Filter = SearchKind | "all";

const KIND_META: Record<SearchKind, { labelKey: string; icon: typeof Film }> = {
  movies: { labelKey: "search.movies", icon: Film },
  series: { labelKey: "search.series", icon: Tv },
  games: { labelKey: "search.games", icon: Gamepad2 },
  anime: { labelKey: "search.anime", icon: Flower2 },
  articles: { labelKey: "search.articles", icon: Newspaper },
};

/** How many hits of each kind the "all" overview shows before "show all" */
const PREVIEW = { media: 6, articles: 3 };

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const posterGrid = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

type SourceState = ReturnType<typeof useSearchSource>;

/** Everything the page shows about one source, derived from its query */
function summarize(source: SourceState) {
  const pages = source.data?.pages ?? [];
  const items = pages.flatMap((p) => p.results as unknown[]);
  const first = pages[0];
  const total = first?.total ?? null;
  // IGDB has no total: count what is loaded and mark that there is more
  const count = total ?? items.length;
  const more = total == null && !!pages[pages.length - 1]?.hasMore;
  return { items, count, more, loading: source.isLoading, failed: source.isError && !first };
}

const SearchPage = () => {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const typeParam = params.get("type");
  const filter: Filter = SEARCH_KINDS.includes(typeParam as SearchKind) ? (typeParam as SearchKind) : "all";
  const [input, setInput] = useState(query);
  const [recents, setRecents] = useState<string[]>(readRecentSearches);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const numberFormat = new Intl.NumberFormat(i18n.language);

  const sources: Record<SearchKind, SourceState> = {
    movies: useSearchSource("movies", query),
    series: useSearchSource("series", query),
    games: useSearchSource("games", query),
    anime: useSearchSource("anime", query),
    articles: useSearchSource("articles", query),
  };
  const summaries = Object.fromEntries(SEARCH_KINDS.map((k) => [k, summarize(sources[k])])) as Record<
    SearchKind,
    ReturnType<typeof summarize>
  >;
  const searching = query.length >= 2;
  const allSettled = SEARCH_KINDS.every((k) => !summaries[k].loading);
  const totalHits = SEARCH_KINDS.reduce((sum, k) => sum + summaries[k].count, 0);
  const totalIsLowerBound = SEARCH_KINDS.some((k) => summaries[k].more);
  const allFailed = allSettled && SEARCH_KINDS.every((k) => summaries[k].failed);
  const anyFailed = SEARCH_KINDS.some((k) => summaries[k].failed);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Back/forward and the navbar search change ?q while this page stays mounted
  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    if (searching) setRecents(rememberSearch(query));
  }, [query, searching]);

  useEffect(() => {
    setSeo({
      title: searching ? t("searchPage.metaTitle", { query }) : `${t("searchPage.title")} – CritiCore`,
      description: t("searchPage.metaDescription"),
      url: "/suche",
    });
    // Result pages are endless variations of the same content: keep them out of search engines
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = robots?.getAttribute("content") ?? null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, follow";
    return () => {
      if (previous == null) robots?.remove();
      else robots?.setAttribute("content", previous);
    };
  }, [t, query, searching]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = input.trim();
    if (term.length < 2) {
      inputRef.current?.focus();
      return;
    }
    // A new term starts on "all"; the same term keeps the chosen tab
    setParams(term === query && filter !== "all" ? { q: term, type: filter } : { q: term });
  };

  const selectFilter = (next: Filter) => {
    setParams(next === "all" ? { q: query } : { q: query, type: next });
    // "Show all" sits further down the overview; the chosen list starts at the tabs, not somewhere inside it
    const tabs = tabsRef.current;
    if (tabs && tabs.getBoundingClientRect().top < 96) tabs.scrollIntoView({ block: "start" });
  };

  const backState = { from: "search", fromPath: `/suche?${params.toString()}` };
  const visibleKinds = filter === "all" ? SEARCH_KINDS : [filter];

  return (
    <Page aria-labelledby={headingId}>
      <Container>
        <h1 id={headingId} className="font-display text-2xl font-bold text-foreground md:text-3xl">
          {searching ? t("searchPage.resultsFor", { query }) : t("searchPage.title")}
        </h1>

        <form role="search" onSubmit={submit} className="mt-4 flex max-w-2xl gap-2">
          <label htmlFor="search-page-input" className="sr-only">
            {t("searchPage.inputLabel")}
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              id="search-page-input"
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("search.placeholder")}
              enterKeyHint="search"
              autoComplete="off"
              autoFocus={!searching}
              className="h-12 w-full rounded-full border border-border/60 bg-secondary/40 pl-11 pr-11 text-base text-foreground placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {input && (
              <button
                type="button"
                onClick={() => {
                  setInput("");
                  inputRef.current?.focus();
                }}
                aria-label={t("searchPage.clear")}
                className={cn("absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground", focusRing)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <Button type="submit" className="h-12 rounded-full px-6">
            {t("searchPage.submit")}
          </Button>
        </form>

        {!searching && <StartState recents={recents} />}

        {searching && (
          <>
            {/* Filter tabs with hit counts. Also the place a screen reader hears the result count */}
            <div ref={tabsRef} className="mt-6 -mx-4 scroll-mt-24 overflow-x-auto px-4 scrollbar-none">
              <div
                role="group"
                aria-label={t("searchPage.filterLabel")}
                className="inline-flex gap-1.5 rounded-full border border-border/40 bg-card/50 p-1.5"
              >
                <FilterButton active={filter === "all"} onClick={() => selectFilter("all")} label={t("searchPage.all")} />
                {SEARCH_KINDS.map((kind) => {
                  const s = summaries[kind];
                  return (
                    <FilterButton
                      key={kind}
                      active={filter === kind}
                      onClick={() => selectFilter(kind)}
                      label={t(KIND_META[kind].labelKey)}
                      count={s.loading || s.failed ? null : `${numberFormat.format(s.count)}${s.more ? "+" : ""}`}
                    />
                  );
                })}
              </div>
            </div>

            <p className="mt-3 min-h-5 text-sm text-muted-foreground" role="status" aria-live="polite">
              {allSettled && !allFailed
                ? t(totalIsLowerBound ? "searchPage.countAtLeast" : "searchPage.count", {
                    count: totalHits,
                    formatted: numberFormat.format(totalHits),
                  })
                : !allSettled
                  ? t("search.searching")
                  : ""}
            </p>

            {allFailed ? (
              <ErrorState onRetry={() => SEARCH_KINDS.forEach((k) => sources[k].refetch())} />
            ) : allSettled && totalHits === 0 && !anyFailed ? (
              <EmptyState query={query} />
            ) : (
              <div className="mt-6 space-y-12">
                {visibleKinds.map((kind) => (
                  <ResultSection
                    key={kind}
                    kind={kind}
                    source={sources[kind]}
                    summary={summaries[kind]}
                    overview={filter === "all"}
                    onShowAll={() => selectFilter(kind)}
                    backState={backState}
                    countLabel={`${numberFormat.format(summaries[kind].count)}${summaries[kind].more ? "+" : ""}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Container>
    </Page>
  );
};

const FilterButton = ({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: string | null }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-xs font-medium transition-[color,background-color] duration-200",
      focusRing,
      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    )}
  >
    {label}
    {count != null && (
      <span className={cn("tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground/80")}>{count}</span>
    )}
  </button>
);

interface SectionProps {
  kind: SearchKind;
  source: SourceState;
  summary: ReturnType<typeof summarize>;
  overview: boolean;
  onShowAll: () => void;
  backState: { from: string; fromPath: string };
  countLabel: string;
}

const ResultSection = ({ kind, source, summary, overview, onShowAll, backState, countLabel }: SectionProps) => {
  const { t } = useTranslation();
  const headingId = useId();
  const Icon = KIND_META[kind].icon;
  const isArticles = kind === "articles";
  const limit = overview ? (isArticles ? PREVIEW.articles : PREVIEW.media) : Infinity;
  const shown = summary.items.slice(0, limit);
  const hiddenInOverview = overview && (summary.items.length > limit || summary.more || (summary.count > shown.length));

  // In the overview a kind without hits simply drops out; on its own tab it says so.
  // A kind that failed stays, so nobody takes "no games" for an answer when IGDB was just down.
  if (overview && !summary.loading && !summary.failed && summary.items.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={headingId} className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          {t(KIND_META[kind].labelKey)}
          {!summary.loading && !summary.failed && (
            <span className="text-sm font-normal tabular-nums text-muted-foreground">{countLabel}</span>
          )}
        </h2>
        {hiddenInOverview && (
          <button
            type="button"
            onClick={onShowAll}
            className={cn("group inline-flex shrink-0 items-center gap-1 rounded py-2 -my-2 text-xs text-muted-foreground transition-colors hover:text-primary", focusRing)}
          >
            {t("home.viewAll")}
            <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </button>
        )}
      </div>

      {summary.loading ? (
        isArticles ? <ArticleSkeletons count={overview ? PREVIEW.articles : 6} /> : <PosterSkeletons count={overview ? PREVIEW.media : 12} />
      ) : summary.failed ? (
        <p className="rounded-2xl border border-border/40 bg-card/40 p-5 text-sm text-muted-foreground">
          {t("searchPage.sourceError")}{" "}
          <button type="button" onClick={() => source.refetch()} className={cn("font-semibold text-primary underline-offset-4 hover:underline", focusRing)}>
            {t("searchPage.retry")}
          </button>
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-border/40 bg-card/40 p-5 text-sm text-muted-foreground">{t("searchPage.kindEmpty")}</p>
      ) : isArticles ? (
        <ul className="space-y-5">
          {(shown as ArticleSearchHit[]).map((a) => (
            <li key={a.id}>
              <ArticleRow article={a} backState={backState} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={posterGrid}>
          {shown.map((item) => (
            <MediaResult key={(item as { id: number }).id} kind={kind} item={item} backState={backState} />
          ))}
        </div>
      )}

      {!overview && !summary.loading && !summary.failed && source.hasNextPage && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" className="h-11 rounded-full px-6" onClick={() => source.fetchNextPage()} disabled={source.isFetchingNextPage}>
            {source.isFetchingNextPage ? <M3LoadingIndicator size={20} /> : t("common.loadMore")}
          </Button>
        </div>
      )}
    </section>
  );
};

const MediaResult = ({ kind, item, backState }: { kind: SearchKind; item: unknown; backState: { from: string; fromPath: string } }) => {
  const titleLang = useAnimeTitleLang();

  if (kind === "movies" || kind === "series") {
    const m = item as { id: number; title?: string; name?: string; poster_path: string | null; release_date?: string; first_air_date?: string; genre_ids?: number[]; vote_average?: number };
    const genreKind = kind === "movies" ? "movie" : "series";
    const genres = tmdbGenreNames(m.genre_ids, genreKind);
    return (
      <MediaCard
        to={`/${kind === "movies" ? "filme" : "serien"}/${m.id}`}
        state={backState}
        type={kind === "movies" ? "movie" : "series"}
        title={(kind === "movies" ? m.title : m.name || m.title) || ""}
        poster={tmdbImage(m.poster_path)}
        year={(m.release_date || m.first_air_date)?.slice(0, 4)}
        primaryGenre={genres[0]}
        genres={genres}
        score={m.vote_average ? Math.round(m.vote_average * 10) / 10 : null}
      />
    );
  }

  if (kind === "games") {
    const g = item as Parameters<typeof isExplicitGame>[0] & { id: number; name: string; background_image: string | null; released?: string; rating: number; genres?: { name: string }[] };
    return (
      <MediaCard
        to={`/games/${g.id}`}
        state={backState}
        type="game"
        title={g.name}
        poster={rawgImageResize(g.background_image ?? null, 420)}
        year={g.released?.slice(0, 4)}
        primaryGenre={g.genres?.[0]?.name}
        genres={g.genres?.map((x) => x.name)}
        score={g.rating ? Math.round(g.rating * 2 * 10) / 10 : null}
        explicit={isExplicitGame(g)}
      />
    );
  }

  const a = item as AnilistMedia;
  return (
    <MediaCard
      to={`/anime/${a.id}`}
      state={backState}
      type="series"
      title={pickTitle(a.title, titleLang)}
      poster={a.coverImage?.extraLarge || a.coverImage?.large || a.coverImage?.medium || null}
      year={a.startDate?.year ? String(a.startDate.year) : null}
      primaryGenre={a.genres?.[0] ?? null}
      genres={a.genres ?? []}
      score={typeof a.averageScore === "number" ? Math.round(a.averageScore) / 10 : null}
    />
  );
};

// Same shape as the News page's list items: image left, type line, title, teaser, date
const ArticleRow = ({ article, backState }: { article: ArticleSearchHit; backState: { from: string; fromPath: string } }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={`/news/${article.slug}`}
      state={backState}
      className={cn("group grid grid-cols-[minmax(0,2fr)_minmax(0,5fr)] items-start gap-4 rounded-2xl sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] sm:gap-5", focusRing)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-secondary/40">
        {article.cover_image_url ? (
          <img
            src={article.cover_image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 motion-safe:[@media(hover:hover)]:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Newspaper className="h-8 w-8 text-muted-foreground/20" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-1.5">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {isOpinion(article.article_type) ? <OpinionLabel type={article.article_type} /> : <span className="text-foreground/90">{t(ARTICLE_TYPE_KEYS[article.article_type] || "news.typeNews")}</span>}
          {article.category && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t(ARTICLE_CATEGORY_KEYS[article.category] || "news.general")}</span>
            </>
          )}
        </p>
        <h3 className="font-display text-base font-bold leading-snug text-foreground line-clamp-2 decoration-primary decoration-2 underline-offset-4 sm:text-lg [@media(hover:hover)]:group-hover:underline group-focus-visible:underline">
          {article.title}
        </h3>
        {article.excerpt && <p className="hidden text-sm leading-relaxed text-muted-foreground line-clamp-2 sm:block">{article.excerpt}</p>}
        <time dateTime={article.created_at} className="block text-xs text-muted-foreground">
          {formatDate(article.created_at)}
        </time>
      </div>
    </Link>
  );
};

const PosterSkeletons = ({ count }: { count: number }) => (
  <div className={posterGrid} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="aspect-[2/3] rounded-lg" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
    ))}
  </div>
);

const ArticleSkeletons = ({ count }: { count: number }) => (
  <div className="space-y-5" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,5fr)] gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] sm:gap-5">
        <Skeleton className="aspect-[4/3] rounded-2xl" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-5 w-4/5 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
    ))}
  </div>
);

const Panel = ({ children }: { children: ReactNode }) => (
  <div className="mt-10 max-w-2xl rounded-2xl border border-border/40 bg-card/40 p-6 sm:p-8">{children}</div>
);

const StartState = ({ recents }: { recents: string[] }) => {
  const { t } = useTranslation();
  return (
    <Panel>
      <p className="text-sm text-muted-foreground">{t("searchPage.startHint")}</p>
      {recents.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-foreground">{t("search.recent")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {recents.map((r) => (
              <li key={r}>
                <Link
                  to={`/suche?q=${encodeURIComponent(r)}`}
                  className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border border-border/40 bg-secondary/50 px-3.5 text-sm text-foreground/90 hover:bg-secondary/80", focusRing)}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  {r}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
};

const EmptyState = ({ query }: { query: string }) => {
  const { t } = useTranslation();
  return (
    <Panel>
      <h2 className="font-display text-lg font-bold text-foreground">{t("searchPage.emptyTitle", { query })}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("searchPage.emptyHint")}</p>
      <Button asChild variant="outline" className="mt-5 rounded-full">
        <Link to="/entdecken">{t("searchPage.browse")}</Link>
      </Button>
    </Panel>
  );
};

const ErrorState = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation();
  return (
    <Panel>
      <h2 className="font-display text-lg font-bold text-foreground">{t("searchPage.errorTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("searchPage.errorHint")}</p>
      <Button variant="outline" className="mt-5 rounded-full" onClick={onRetry}>
        {t("searchPage.retry")}
      </Button>
    </Panel>
  );
};

export default SearchPage;
