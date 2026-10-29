import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Page } from "@/components/layout/Page";
import { Container } from "@/components/layout/Container";
import MediaCard from "@/components/MediaCard";
import ListPageHeader from "@/components/ListPageHeader";
import M3LoadingIndicator from "@/components/M3LoadingIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import ApiErrorPage from "@/components/ApiErrorPage";
import { setSeo } from "@/lib/seo";
import { pickTitle, type AnilistMedia } from "@/lib/anilist";
import {
  useAnimeTrending,
  useAnimePopular,
  useAnimeSeasonal,
  useAnimeTitleLang,
} from "@/hooks/useAnime";
import { cn } from "@/lib/utils";

type Tab = "trending" | "popular" | "seasonal";

const AnimePage = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("trending");
  const titleLang = useAnimeTitleLang();

  useEffect(() => {
    setSeo({
      title: t("meta.anime.title", "Anime – CritiCore"),
      description: t(
        "meta.anime.description",
        "Entdecke aktuelle, beliebte und saisonale Anime — kuratiert über AniList.",
      ),
      url: "/anime",
    });
  }, [t]);

  const trending = useAnimeTrending();
  const popular = useAnimePopular();
  const seasonal = useAnimeSeasonal();

  const active =
    tab === "trending" ? trending : tab === "popular" ? popular : seasonal;

  const items = useMemo<AnilistMedia[]>(() => {
    const pages = active.data?.pages ?? [];
    const seen = new Set<number>();
    const out: AnilistMedia[] = [];
    for (const p of pages) {
      for (const m of p.Page.media) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          out.push(m);
        }
      }
    }
    return out;
  }, [active.data]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && active.hasNextPage && !active.isFetchingNextPage) {
        active.fetchNextPage();
      }
    },
    [active],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (active.isError) return <ApiErrorPage />;

  const tabs: { key: Tab; label: string }[] = [
    { key: "trending", label: t("anime.tab.trending", "Trending") },
    { key: "popular", label: t("anime.tab.popular", "Beliebt") },
    { key: "seasonal", label: t("anime.tab.seasonal", "Diese Saison") },
  ];

  return (
    <Page>
      <Container>
        <ListPageHeader
          title={t("pages.animeTitle", "Anime")}
          subtitle={t("pages.animeSubtitle", "Trending, beliebte und saisonale Anime. Daten von AniList.")}
        >
          {/* Tab pills */}
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("pages.animeTitle", "Anime")}>
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                aria-pressed={tab === tb.key}
                className={cn(
                  "h-10 px-4 rounded-full text-sm font-semibold border transition-colors",
                  tab === tb.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/60 text-muted-foreground border-border/50 hover:text-foreground hover:border-primary/40",
                )}
              >
                {tb.label}
              </button>
            ))}
          </div>
        </ListPageHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {active.isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[2/3] rounded-lg" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              ))
            : items.map((m, i) => {
                const year = m.startDate?.year ? String(m.startDate.year) : null;
                const primaryGenre = m.genres?.[0] ?? null;
                const score =
                  typeof m.averageScore === "number"
                    ? Math.round(m.averageScore) / 10 // 0-100 → 0-10
                    : null;
                return (
                  <div key={m.id} style={{ animationDelay: `${i * 30}ms` }}>
                    <MediaCard headingLevel={2} showType={false}
                      to={`/anime/${m.id}`}
                      state={{ from: "anime", fromPath: "/anime" }}
                      type="anime"
                      title={pickTitle(m.title, titleLang)}
                      poster={m.coverImage.extraLarge || m.coverImage.large || m.coverImage.medium}
                      year={year}
                      primaryGenre={primaryGenre}
                      genres={m.genres ?? []}
                      score={score}
                    />
                  </div>
                );
              })}
        </div>

        <div ref={sentinelRef} className="flex justify-center py-8">
          {active.isFetchingNextPage && <M3LoadingIndicator size={32} />}
        </div>
      </Container>
    </Page>
  );
};

export default AnimePage;
