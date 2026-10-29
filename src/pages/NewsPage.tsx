import { useEffect, useState } from "react";
import { Link } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Page } from "@/components/layout/Page";
import { Container } from "@/components/layout/Container";
import { PortalLayout, useRailShown } from "@/components/layout/PortalLayout";
import PortalRail from "@/components/layout/PortalRail";
import { LeadStory, RiverItem, SecondaryStory, type ArticleWithAuthor } from "@/components/news/StoryCards";
import NewsletterSubscribe from "@/components/NewsletterSubscribe";
import PageSearchBar from "@/components/PageSearchBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Pencil, Newspaper } from "lucide-react";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/* ── Pill filter bar (Material CC 3.0) ── */
const FilterPills = ({
  items,
  active,
  onChange,
}: {
  items: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("news.filterLabel")}
      className="inline-flex gap-1.5 rounded-full border border-border/40 bg-card/50 p-1.5 backdrop-blur-md"
    >
      {items.map((it) => {
        const isActive = active === it.value;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(it.value)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-[color,background-color] duration-200 ease-[var(--mcc-ease-out)] ${focusRing} ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
};


/* ── Main Page ── */
const NewsPage = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t("meta.news.title");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("meta.news.description"));
  }, [t]);

  const { user } = useAuth();
  const [articles, setArticles] = useState<ArticleWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [translatingList, setTranslatingList] = useState(false);
  const [filter, setFilter] = useState("all");
  // The stories share the width with the side rail, so lead and secondary stories only sit
  // side by side from xl, and on desktop the rail carries the newsletter box
  const railShown = useRailShown();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPress, setIsPress] = useState(false);

  const categories = [
    { value: "all", label: t("news.all") },
    { value: "games", label: t("news.games") },
    { value: "movies", label: t("news.movies") },
    { value: "series", label: t("news.series") },
    { value: "general", label: t("news.general") },
    { value: "patchnotes", label: t("news.patchnotes") },
  ];

  useEffect(() => {
    loadArticles();
  }, [filter, i18n.language]);
  useEffect(() => {
    if (user) checkPressRole();
  }, [user]);

  const checkPressRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .in("role", ["press", "admin"]);
    if (data && data.length > 0) {
      const isAdmin = data.some((r) => r.role === "admin");
      if (isAdmin) {
        setIsPress(true);
        return;
      }
      const { data: pp } = await supabase
        .from("press_profiles")
        .select("verified")
        .eq("user_id", user!.id)
        .maybeSingle();
      setIsPress(pp?.verified === true);
    }
  };

  const loadArticles = async () => {
    setLoading(true);
    let query = supabase
      .from("articles")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("category", filter);
    const { data } = await query;
    const articles = data || [];
    const userIds = [...new Set(articles.map((a) => a.user_id))];
    const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      if (profiles)
        for (const p of profiles)
          profileMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
    }
    const mapped: ArticleWithAuthor[] = articles.map((a) => ({
      ...a,
      profile: profileMap[a.user_id] || null,
    }));
    setArticles(mapped);
    setLoading(false);

    // Auto-translate
    const userLang = i18n.language;
    const needsTranslation = mapped.filter((a) => (a.language || "de") !== userLang);
    if (needsTranslation.length === 0) return;
    setTranslatingList(true);
    const articleIds = needsTranslation.map((a) => a.id);
    const { data: cachedTranslations } = await supabase
      .from("article_translations")
      .select("article_id, title, excerpt")
      .eq("target_lang", userLang)
      .in("article_id", articleIds);
    const cacheMap: Record<string, { title: string; excerpt: string | null }> = {};
    if (cachedTranslations)
      for (const ct of cachedTranslations)
        cacheMap[ct.article_id] = { title: ct.title, excerpt: ct.excerpt };
    const uncached = needsTranslation.filter((a) => !cacheMap[a.id]);
    setArticles((prev) =>
      prev.map((a) =>
        cacheMap[a.id]
          ? {
              ...a,
              translatedTitle: cacheMap[a.id].title,
              translatedExcerpt: cacheMap[a.id].excerpt || undefined,
            }
          : a,
      ),
    );
    for (const art of uncached) {
      try {
        const { data } = await supabase.functions.invoke("translate-article", {
          body: {
            articleId: art.id,
            title: art.title,
            content: art.content,
            excerpt: art.excerpt || "",
            sourceLang: art.language || "de",
            targetLang: userLang,
          },
        });
        if (data?.title)
          setArticles((prev) =>
            prev.map((a) =>
              a.id === art.id
                ? {
                    ...a,
                    translatedTitle: data.title,
                    translatedExcerpt: data.excerpt || undefined,
                  }
                : a,
            ),
          );
      } catch {
        // Translation is best effort; the original title stays visible
      }
    }
    setTranslatingList(false);
  };

  const filteredArticles =
    searchQuery.length >= 2
      ? articles.filter(
          (a) =>
            (a.translatedTitle || a.title).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.translatedExcerpt || a.excerpt || "").toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : articles;

  // Lead block: newest story large, the next two beside it. Everything else goes into the list below.
  const lead = filteredArticles[0];
  const secondary = filteredArticles.slice(1, 3);
  const river = filteredArticles.slice(3);

  return (
    <Page className="overflow-x-hidden">
      <Container>
        {/* ── Header ── */}
        <header className="mb-6 flex flex-col gap-6 md:mb-8 md:flex-row md:items-end md:justify-between motion-safe:animate-fade-in">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
              {t("news.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {t("news.subtitle")}
            </p>
          </div>
          {isPress && (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-10 rounded-full px-4">
                <Link to="/news/entwuerfe">
                  {t("drafts.title", "Meine Entwürfe")}
                </Link>
              </Button>
              <Button asChild size="sm" className="h-10 gap-1.5 rounded-full px-4">
                <Link to="/news/schreiben">
                  <Pencil className="h-3.5 w-3.5" />
                  {t("news.writeArticle")}
                </Link>
              </Button>
            </div>
          )}
        </header>

        {/* ── Filter & search row ── */}
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0">
            <FilterPills items={categories} active={filter} onChange={setFilter} />
          </div>
          <div className="w-full md:max-w-xs">
            <PageSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("search.newsPlaceholder", "Artikel suchen...")}
            />
          </div>
        </div>

        {!loading && filteredArticles.length > 0 && (
          <p className="mb-6 flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <span>
              {t("news.articleCount", "{{count}} Artikel", { count: filteredArticles.length })}
            </span>
            {translatingList && (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {t("article.translating", "Wird übersetzt…")}
              </span>
            )}
          </p>
        )}

        {/* ── Content ── */}
        <PortalLayout rail={<PortalRail />}>
          {loading ? (
            <div className="grid gap-10 xl:grid-cols-3" aria-busy="true">
              <div className="space-y-4 xl:col-span-2">
                <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-4 w-full max-w-xl" />
              </div>
              <div className="space-y-8">
                {[0, 1].map((i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-card/40 py-24 text-center motion-safe:animate-fade-in">
              <Newspaper className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? t("search.noResults") : t("news.noArticles")}
              </p>
            </div>
          ) : (
            <div className="space-y-14 motion-safe:animate-fade-in">
              <section
                className={cn("grid gap-10", secondary.length > 0 && "xl:grid-cols-3")}
                aria-label={t("news.title")}
              >
                <div className={cn(secondary.length > 0 && "xl:col-span-2")}>
                  <LeadStory article={lead} fill={secondary.length > 0} />
                </div>
                {secondary.length > 0 && (
                  <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
                    {secondary.map((a) => (
                      <SecondaryStory key={a.id} article={a} />
                    ))}
                  </div>
                )}
              </section>

              {river.length > 0 && (
                <section className="border-t border-border/40 pt-10" aria-labelledby="news-more">
                  <h2 id="news-more" className="mb-8 font-display text-2xl font-bold text-foreground">
                    {t("news.moreArticles")}
                  </h2>
                  <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
                    {river.map((a) => (
                      <RiverItem key={a.id} article={a} />
                    ))}
                  </div>
                </section>
              )}

              {!railShown && <NewsletterSubscribe />}
            </div>
          )}
        </PortalLayout>
      </Container>
    </Page>
  );
};

export default NewsPage;
