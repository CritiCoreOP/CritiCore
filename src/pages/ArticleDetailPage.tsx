import { useEffect, useState, useMemo, useRef } from "react";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { sanitizeHtml } from "@/lib/sanitize";
import ArticleHtml from "@/components/ArticleHtml";
import { useParams, useNavigate, Link } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import OfficialBadge from "@/components/OfficialBadge";
import { Page } from "@/components/layout/Page";
import { Container } from "@/components/layout/Container";
import { useRailShown } from "@/components/layout/PortalLayout";
import PortalRail from "@/components/layout/PortalRail";
import { useLayoutPrefs } from "@/lib/layoutPrefs";
import ArticleComments from "@/components/ArticleComments";
import ArticleReactions from "@/components/ArticleReactions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import ArticleShareButton from "@/components/ArticleShareButton";
import CoverCredit from "@/components/CoverCredit";
import ReportDialog from "@/components/ReportDialog";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { staffRoleLabels } from "@/lib/staffRoles";
import { ArrowLeft, ArrowUp, ChevronLeft, ChevronRight, Film, Gamepad2, History, Languages, MessageSquareQuote, Newspaper, Pencil, Share2, Trash, Tv } from "lucide-react";
import OpinionLabel from "@/components/OpinionLabel";
import LiveLabel from "@/components/live/LiveLabel";
import LiveBlogFeed from "@/components/live/LiveBlogFeed";
import { useLiveUpdates } from "@/hooks/useLiveBlog";
import { isLiveStatus, sortUpdates, type LiveStatus } from "@/lib/liveBlog";
import { isOpinion } from "@/lib/article-labels";

interface AuthorInfo {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_official: boolean;
  bio: string | null;
  staff_roles?: string[];
}

interface AdjacentArticle {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  created_at: string;
  /** Missing on the previous/next links, which carry no label */
  article_type?: string;
}

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

const categoryKeys: Record<string, string> = { games: "news.games", movies: "news.movies", series: "news.series", general: "news.general", patchnotes: "news.patchnotes" };
const typeKeys: Record<string, string> = { news: "news.typeNews", review: "news.typeReview", opinion: "news.typeOpinion", interview: "news.typeInterview" };
const mediaTypeKeys: Record<string, string> = { movie: "explore.typeMovie", series: "explore.typeSeries", game: "explore.typeGame" };
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
// Underline on real pointers only, so it does not stick after a tap on touch screens
const titleHover =
  "decoration-primary decoration-2 underline-offset-4 [@media(hover:hover)]:group-hover:underline group-focus-visible:underline";

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return Math.max(1, Math.round(text.split(" ").length / 200));
}

function decodeEntities(text: string): string {
  return new DOMParser().parseFromString(text, "text/html").documentElement.textContent || text;
}

// DOMPurify strips ids that shadow document or form properties (e.g. "action"), which would break the TOC link
function clobbersDom(id: string, form: HTMLFormElement): boolean {
  return id in document || id in form;
}

// One pass for heading ids and the TOC so both always agree, including duplicate or non-Latin headings
function buildToc(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const used = new Map<string, number>();
  const form = document.createElement("form");
  const withIds = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level: string, attrs: string, content: string) => {
    const text = decodeEntities(content.replace(/<[^>]*>/g, "")).trim();
    if (!text) return match;
    const slugged = text.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").replace(/^-|-$/g, "");
    const base = !slugged
      ? `abschnitt-${headings.length + 1}`
      : clobbersDom(slugged, form) ? `${slugged}-abschnitt` : slugged;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const id = count ? `${base}-${count + 1}` : base;
    headings.push({ id, text, level: Number(level) });
    return `<h${level}${attrs.replace(/\sid="[^"]*"/i, "")} id="${id}">${content}</h${level}>`;
  });
  return { html: withIds, headings };
}

const ArticleDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Tables<"articles"> | null>(null);
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [coAuthors, setCoAuthors] = useState<AuthorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPress, setIsPress] = useState(false);
  const [mediaLinks, setMediaLinks] = useState<{ media_id: string; media_type: string; media_title: string; media_poster: string | null }[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [prevArticle, setPrevArticle] = useState<AdjacentArticle | null>(null);
  const [nextArticle, setNextArticle] = useState<AdjacentArticle | null>(null);
  const [listTranslations, setListTranslations] = useState<Record<string, string>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const liveStatus: LiveStatus | null = isLiveStatus(article?.live_status) ? article.live_status : null;
  const live = useLiveUpdates(liveStatus ? article?.id : undefined, liveStatus === "live");

  useEffect(() => {
    if (user) {
      supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
        setIsAdmin(!!data?.some((r) => r.role === "admin"));
        setIsPress(!!data?.some((r) => r.role === "press" || r.role === "admin"));
      });
    }
  }, [user]);

  useEffect(() => {
    if (article) {
      const desc = article.excerpt || article.title;
      setSeo({
        // Opinion pieces carry the label in the title too, so search results and shared links show it
        title: t("meta.articleDetail.title", {
          title:
            liveStatus === "live"
              ? t("live.seoTitle", { title: article.title })
              : article.article_type === "opinion"
                ? t("news.opinionTitle", { title: article.title })
                : article.title,
        }),
        description: desc,
        url: `/news/${article.slug}`,
        image: article.cover_image_url,
        type: "article",
        defaultLang: article.language,
        jsonLd: {
          "@type": liveStatus ? "LiveBlogPosting" : article.article_type === "opinion" ? "OpinionNewsArticle" : article.article_type === "review" ? "ReviewNewsArticle" : "Article",
          headline: article.title,
          description: desc,
          image: article.cover_image_url || undefined,
          // published_at since 2026-10-08; created_at is when the draft was started
          datePublished: article.published_at ?? article.created_at,
          dateModified: article.updated_at,
          author: author ? { "@type": "Person", name: author.display_name || "CritiCore" } : undefined,
          publisher: { "@type": "Organization", name: "CritiCore" },
          correction: article.correction_note
            ? { "@type": "CorrectionComment", text: article.correction_note, datePublished: article.corrected_at ?? undefined }
            : undefined,
          // Live blogs: Google shows the newest updates in a carousel when they are listed here
          ...(liveStatus
            ? {
                coverageStartTime: article.published_at ?? article.created_at,
                coverageEndTime: liveStatus === "ended" ? article.updated_at : undefined,
                liveBlogUpdate: sortUpdates(live.data ?? [])
                  .slice(0, 20)
                  .map((u) => ({ "@type": "BlogPosting", headline: (u.title || u.body).slice(0, 110), articleBody: u.body, datePublished: u.created_at, dateModified: u.updated_at })),
              }
            : {}),
        },
      });
    }
    return () => cleanupSeo();
  }, [article, author, t, liveStatus, live.data]);

  useEffect(() => { if (slug) { loadArticle(); window.scrollTo(0, 0); } }, [slug]);

  const loadArticle = async () => {
    setLoading(true);
    const { data } = await supabase.from("articles").select("*").eq("slug", slug!).maybeSingle();
    if (data) {
      setArticle(data);
      // Author
      const { data: profile } = await supabase.from("profiles").select("user_id, display_name, avatar_url, is_official, bio, staff_roles").eq("user_id", data.user_id).maybeSingle();
      setAuthor(profile ? { user_id: profile.user_id, display_name: profile.display_name, avatar_url: profile.avatar_url, is_official: profile.is_official, bio: profile.bio, staff_roles: profile.staff_roles } : null);
      // Co-authors
      const { data: collabs } = await supabase.from("article_collaborators").select("user_id").eq("article_id", data.id).eq("accepted", true);
      if (collabs && collabs.length > 0) {
        const userIds = collabs.map((c) => c.user_id).filter((id) => id !== data.user_id);
        if (userIds.length > 0) {
          const { data: coProfiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, is_official, bio").in("user_id", userIds);
          setCoAuthors((coProfiles || []).map((p) => ({ user_id: p.user_id, display_name: p.display_name, avatar_url: p.avatar_url, is_official: p.is_official, bio: p.bio })));
        }
      }
      // Media links
      const { data: mLinks } = await supabase.from("article_media_links").select("media_id, media_type, media_title, media_poster").eq("article_id", data.id);
      if (mLinks) setMediaLinks(mLinks);
      // Related articles (same category, excluding current)
      const { data: related } = await supabase
        .from("articles").select("id, title, slug, cover_image_url, created_at, category, article_type")
        .eq("published", true)
        .eq("category", data.category || "general")
        .neq("id", data.id)
        .order("created_at", { ascending: false })
        .limit(4);
      setRelatedArticles(related || []);
      // Prev/Next articles
      const [prevRes, nextRes] = await Promise.all([
        supabase.from("articles").select("id, slug, title, cover_image_url").eq("published", true).lt("created_at", data.created_at).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("articles").select("id, slug, title, cover_image_url").eq("published", true).gt("created_at", data.created_at).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      ]);
      setPrevArticle(prevRes.data || null);
      setNextArticle(nextRes.data || null);
    }
    setLoading(false);
  };

  const LANG_LABELS: Record<string, string> = { de: "Deutsch", en: "English", fr: "Français", es: "Español", th: "ไทย" };
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [translatedExcerpt, setTranslatedExcerpt] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!article) return;
    const articleLang = article.language || "de";
    const userLang = i18n.language;
    if (articleLang === userLang) { setTranslatedTitle(null); setTranslatedContent(null); setTranslatedExcerpt(null); return; }
    const translateArticle = async () => {
      setTranslating(true);
      try {
        const { data } = await supabase.functions.invoke("translate-article", {
          body: { articleId: article.id, title: article.title, content: article.content, excerpt: article.excerpt || "", sourceLang: articleLang, targetLang: userLang },
        });
        if (data?.title) setTranslatedTitle(data.title);
        if (data?.content) setTranslatedContent(data.content);
        if (data?.excerpt) setTranslatedExcerpt(data.excerpt || null);
      } catch {
        // Translation is best effort; the original text stays visible
      }
      setTranslating(false);
    };
    translateArticle();
  }, [article?.id, i18n.language]);

  // Titles of the linked articles in the reader's language (cached translations only, no new AI calls)
  useEffect(() => {
    const ids = [...relatedArticles.map((r) => r.id), prevArticle?.id, nextArticle?.id].filter((id): id is string => !!id);
    if (ids.length === 0) return;
    let active = true;
    supabase
      .from("article_translations")
      .select("article_id, title")
      .eq("target_lang", i18n.language)
      .in("article_id", ids)
      .then(({ data }) => {
        if (active) setListTranslations(Object.fromEntries((data || []).map((d) => [d.article_id, d.title])));
      });
    return () => { active = false; };
  }, [relatedArticles, prevArticle, nextArticle, i18n.language]);

  const displayTitle = translatedTitle || article?.title || "";
  const displayContent = translatedContent || article?.content || "";
  const displayExcerpt = translatedExcerpt || article?.excerpt || "";
  const readingTime = useMemo(() => estimateReadingTime(displayContent), [displayContent]);
  const toc = useMemo(() => buildToc(displayContent), [displayContent]);
  const hasToc = toc.headings.length >= 3;
  // The body gets the side rail (trends, newsletter) from lg; the table of contents sits below it.
  // With the rail switched off in the settings, only the table of contents keeps a (narrower) column.
  const { sideRail } = useLayoutPrefs();
  const railShown = useRailShown();
  const sideColumn = sideRail || hasToc;
  const listTitle = (a: { id: string; title: string }) => listTranslations[a.id] || a.title;

  // "Back to top" appears once the article header has scrolled out of view
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowScrollTop(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [article?.id, loading]);

  // Highlight the section currently being read in the table of contents
  useEffect(() => {
    if (!hasToc) return;
    const elements = toc.headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveHeading(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -65% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc, hasToc, loading]);

  if (loading) {
    return (
      <Page aria-busy="true">
        <Container width="default">
          <div className="max-w-3xl space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>
          <Skeleton className="mt-8 aspect-[16/9] w-full rounded-2xl lg:aspect-[21/9]" />
        </Container>
      </Page>
    );
  }

  if (!article) {
    return (
      <Page>
        <Container className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">{t("article.notFound")}</h1>
          <Button variant="outline" onClick={() => navigate("/news")}>{t("article.backToNews")}</Button>
        </Container>
      </Page>
    );
  }

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: displayTitle, url: window.location.href }); } catch {
        // Share sheet was dismissed
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("article.linkCopied", "Link kopiert!"));
    }
  };

  const isTranslated = !!article.language && i18n.language !== article.language;
  const canManage = !!user && (user.id === article.user_id || isAdmin);
  const authorName = author?.display_name || t("article.unknownAuthor");

  const changeLiveStatus = async (next: LiveStatus) => {
    const { error } = await supabase.from("articles").update({ live_status: next }).eq("id", article.id);
    if (error) {
      toast.error(t("live.error"), { description: error.message });
      return;
    }
    setArticle({ ...article, live_status: next });
    toast.success(next === "ended" ? t("live.endedToast") : t("live.restartedToast"));
  };
  const authorRoles = staffRoleLabels(author?.staff_roles, t);

  return (
    <Page className="overflow-x-clip">
      {/* overflow-x-clip, not hidden: hidden turns this into a scroll container and breaks the sticky TOC */}
      {/* Reading progress, driven by CSS scroll timeline (hidden where unsupported) */}
      <div className="reading-progress fixed inset-x-0 top-0 z-[60] h-[3px] bg-primary" aria-hidden="true" />

      <Container as="article" width="default">
        {/* ── Header: title first, image second ── */}
        <header ref={headerRef} className="max-w-3xl motion-safe:animate-fade-in">
          <Link
            to="/news"
            className={cn("mb-6 inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground", focusRing)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("article.backToNews")}
          </Link>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {liveStatus && <LiveLabel ended={liveStatus === "ended"} size="md" />}
            {isOpinion(article.article_type) ? (
              <OpinionLabel type={article.article_type} size="md" />
            ) : (
              <span className="font-medium text-foreground/90">{t(typeKeys[article.article_type] || "news.typeNews")}</span>
            )}
            {article.category && (
              <>
                <span aria-hidden="true">·</span>
                <span>{t(categoryKeys[article.category] || "news.general")}</span>
              </>
            )}
            {liveStatus ? (
              <a href="#live" className={cn("ml-3 rounded-sm font-medium text-foreground/90 underline-offset-2 hover:underline", focusRing)}>
                {t("live.jump", { count: live.data?.length ?? 0 })}
              </a>
            ) : (
              <span className="ml-3">{t("article.readingTime", { min: readingTime })}</span>
            )}
          </p>

          <h1 className="mt-4 font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {displayTitle}
          </h1>

          {displayExcerpt && (
            <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted-foreground md:text-xl">{displayExcerpt}</p>
          )}

          {isOpinion(article.article_type) && (
            <p className="mt-5 flex max-w-[60ch] items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
              {t(article.article_type === "review" ? "article.reviewNote" : "article.opinionNote", { name: author?.display_name || "CritiCore" })}
            </p>
          )}

          {isTranslated && (
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
              {translating
                ? t("article.translating")
                : translatedContent
                  ? t("article.translatedFrom", { lang: LANG_LABELS[article.language] || article.language })
                  : t("article.originalLanguage", { lang: LANG_LABELS[article.language] || article.language })}
            </p>
          )}

          {/* Byline */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={author?.avatar_url || ""} alt="" />
                <AvatarFallback className="text-xs">{authorName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link to={`/user/${author?.user_id}`} className={cn("rounded-sm font-medium text-foreground hover:underline", focusRing)}>
                    {authorName}
                  </Link>
                  {author?.is_official && <OfficialBadge />}
                  {coAuthors.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {"& "}
                      {coAuthors.map((co, i) => (
                        <span key={co.user_id}>
                          {i > 0 && ", "}
                          <Link to={`/user/${co.user_id}`} className={cn("rounded-sm text-foreground/85 hover:underline", focusRing)}>
                            {co.display_name || t("article.unknownAuthor")}
                          </Link>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                {authorRoles.length > 0 && (
                  <p className="text-xs font-medium text-accent-light">{authorRoles.slice(0, 2).join(", ")}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  <time dateTime={article.published_at ?? article.created_at}>
                    {formatDate(article.published_at ?? article.created_at, { day: "numeric", month: "long", year: "numeric" })}
                  </time>
                  {article.correction_note && (
                    <>
                      {" · "}
                      <a href="#korrektur" className={cn("rounded-sm underline-offset-2 hover:text-foreground hover:underline", focusRing)}>
                        {t("article.corrected")}
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleShare}>
                <Share2 className="h-4 w-4" aria-hidden="true" /> {t("article.share")}
              </Button>
              <ReportDialog targetId={article.id} targetType="article" targetTitle={article.title} />
            </div>
          </div>

          {/* Author / admin actions */}
          {canManage && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/news/schreiben?edit=${article.slug}`)}>
                <Pencil className="h-4 w-4" aria-hidden="true" /> {t("article.edit")}
              </Button>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={async () => {
                if (!window.confirm(t("article.confirmDelete"))) return;
                const { error } = await supabase.from("articles").delete().eq("id", article.id);
                if (error) { toast.error(error.message); return; }
                toast.success(t("article.deleted"));
                navigate("/news");
              }}>
                <Trash className="h-4 w-4" aria-hidden="true" /> {t("article.delete")}
              </Button>
              {isPress && <ArticleShareButton title={article.title} slug={article.slug} />}
            </div>
          )}
        </header>

        {article.cover_image_url && (
          <figure className="mt-8">
            <div className="overflow-hidden rounded-2xl bg-secondary/40">
              <img
                src={article.cover_image_url}
                alt=""
                width={1600}
                height={686}
                decoding="async"
                {...{ fetchpriority: "high" }}
                className="aspect-[16/9] w-full object-cover lg:aspect-[21/9]"
              />
            </div>
            <CoverCredit className="mt-2.5 text-right" credit={article.cover_image_credit} url={article.cover_image_credit_url} />
          </figure>
        )}

        {/* ── Body ── */}
        <div
          className={cn(
            "mt-10 lg:mt-14",
            sideColumn && "lg:grid",
            sideRail ? "lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_22rem]" : "lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16",
          )}
        >
          <div className="min-w-0">
            {/* Collapsible TOC on phones and tablets */}
            {hasToc && (
              <details className="group/toc mb-8 rounded-2xl border border-border/50 bg-card/40 lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-foreground">
                  {t("article.toc")}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open/toc:rotate-90" aria-hidden="true" />
                </summary>
                <ul className="space-y-1 px-5 pb-4">
                  {toc.headings.map((h) => (
                    <li key={h.id} className={h.level === 3 ? "pl-4" : undefined}>
                      <a href={`#${h.id}`} className="block py-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <ArticleHtml
              className="article-body flow-root prose prose-invert prose-lg max-w-[40rem] text-foreground
                leading-[1.8] overflow-x-hidden break-words
                [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl
                [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_th]:text-left [&_iframe]:max-w-full
                [&>p]:mb-5 [&>p:empty]:h-4
                [&>h2]:mt-12 [&>h2]:mb-5 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-foreground [&>h2]:scroll-mt-24
                [&>h3]:mt-8 [&>h3]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-foreground [&>h3]:scroll-mt-24
                [&>ul]:mb-5 [&>ol]:mb-5
                [&>blockquote]:mb-5 [&>blockquote]:border-l-4 [&>blockquote]:border-primary/40 [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:text-muted-foreground"
              html={sanitizeHtml(toc.html)}
            />

            {liveStatus && (
              <LiveBlogFeed
                articleId={article.id}
                status={liveStatus}
                updates={live.data}
                loading={live.isLoading}
                failed={live.isError}
                onRetry={() => void live.refetch()}
                fresh={live.fresh}
                clearFresh={live.clearFresh}
                canManage={canManage}
                onStatusChange={changeLiveStatus}
              />
            )}

            {/* Corrections after publication stay visible with their date (Pressekodex Ziffer 3) */}
            {article.correction_note && (
              <aside id="korrektur" className="mt-10 max-w-[40rem] scroll-mt-24 rounded-2xl border border-border/50 bg-card/40 p-5" aria-labelledby="korrektur-title">
                <p id="korrektur-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <History className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {article.corrected_at
                    ? t("article.correctionTitle", { date: formatDate(article.corrected_at, { day: "numeric", month: "long", year: "numeric" }) })
                    : t("article.corrected")}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{article.correction_note}</p>
              </aside>
            )}

            {/* Reactions */}
            <section className="mt-12 max-w-[40rem] border-t border-border/60 pt-8">
              <p className="mb-3 text-sm text-muted-foreground">{t("article.reactionsLabel")}</p>
              <ArticleReactions articleId={article.id} />
            </section>

            {/* About the author */}
            {author && (
              <section className="mt-10 flex max-w-[40rem] gap-4 rounded-2xl border border-border/50 bg-card/40 p-5 sm:p-6" aria-labelledby="about-author">
                <Avatar className="h-14 w-14 shrink-0 border border-border">
                  <AvatarImage src={author.avatar_url || ""} alt="" />
                  <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 id="about-author" className="text-sm text-muted-foreground">{t("article.aboutAuthor")}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Link to={`/user/${author.user_id}`} className={cn("rounded-sm font-display text-lg font-bold text-foreground hover:underline", focusRing)}>
                      {authorName}
                    </Link>
                    {author.is_official && <OfficialBadge />}
                  </div>
                  {authorRoles.length > 0 && (
                    <p className="mt-0.5 text-sm font-medium text-accent-light">{authorRoles.join(", ")}</p>
                  )}
                  {(author.bio || authorRoles.length === 0) && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {author.bio || t("article.authorCardDesc")}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Linked media */}
            {mediaLinks.length > 0 && (
              <section className="mt-14" aria-labelledby="related-media">
                <h2 id="related-media" className="mb-5 font-display text-xl font-bold text-foreground">
                  {t("article.mediaLink.relatedMedia")}
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {mediaLinks.map((link) => {
                    const path = link.media_type === "movie" ? `/filme/${link.media_id}` : link.media_type === "series" ? `/serien/${link.media_id}` : `/games/${link.media_id}`;
                    const TypeIcon = link.media_type === "movie" ? Film : link.media_type === "series" ? Tv : Gamepad2;
                    return (
                      <Link key={`${link.media_type}-${link.media_id}`} to={path} className={cn("group block rounded-xl", focusRing)}>
                        <div className="aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                          {link.media_poster ? (
                            <img src={link.media_poster} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 motion-safe:[@media(hover:hover)]:group-hover:scale-[1.03]" />
                          ) : (
                            <div className="flex h-full items-center justify-center"><TypeIcon className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" /></div>
                          )}
                        </div>
                        <p className={cn("mt-2 truncate text-sm font-medium text-foreground", titleHover)}>{link.media_title}</p>
                        <p className="text-xs text-muted-foreground">{t(mediaTypeKeys[link.media_type] || "explore.typeGame")}</p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <section className="mt-14" aria-labelledby="related-articles">
                <h2 id="related-articles" className="mb-6 font-display text-xl font-bold text-foreground">
                  {t("article.relatedArticles")}
                </h2>
                <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                  {relatedArticles.map((ra) => (
                    <Link key={ra.id} to={`/news/${ra.slug}`} className={cn("group grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-4 rounded-xl", focusRing)}>
                      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-secondary/40">
                        {ra.cover_image_url ? (
                          <img src={ra.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center"><Newspaper className="h-6 w-6 text-muted-foreground/30" aria-hidden="true" /></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        {isOpinion(ra.article_type) && <OpinionLabel type={ra.article_type} className="mb-1.5" />}
                        <h3 className={cn("font-display text-base font-bold leading-snug text-foreground line-clamp-3", titleHover)}>{listTitle(ra)}</h3>
                        <time dateTime={ra.created_at} className="mt-2 block text-xs text-muted-foreground">{formatDate(ra.created_at)}</time>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Previous / next */}
            {(prevArticle || nextArticle) && (
              <nav className="mt-14 grid gap-4 sm:grid-cols-2" aria-label={`${t("article.prevArticle")} / ${t("article.nextArticle")}`}>
                {prevArticle ? (
                  <Link to={`/news/${prevArticle.slug}`} className={cn("group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/40 p-4 transition-colors hover:border-border", focusRing)}>
                    <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("article.prevArticle")}</p>
                      <p className={cn("truncate text-sm font-medium text-foreground", titleHover)}>{listTitle(prevArticle)}</p>
                    </div>
                  </Link>
                ) : <div className="hidden sm:block" />}
                {nextArticle && (
                  <Link to={`/news/${nextArticle.slug}`} className={cn("group flex items-center justify-end gap-3 rounded-2xl border border-border/50 bg-card/40 p-4 text-right transition-colors hover:border-border", focusRing)}>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("article.nextArticle")}</p>
                      <p className={cn("truncate text-sm font-medium text-foreground", titleHover)}>{listTitle(nextArticle)}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                )}
              </nav>
            )}

            {/* Comments */}
            <section className="mt-14 border-t border-border/60 pt-8">
              <ArticleComments articleId={article.id} />
            </section>
          </div>

          {/* Desktop side column: the rail, then the sticky TOC */}
          {sideColumn && (
            <aside className="hidden lg:block">
              {railShown && <PortalRail className="mb-10" />}
              {hasToc && (
                <nav aria-label={t("article.toc")} className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-1">
                  <p className="mb-3 text-sm font-semibold text-foreground">{t("article.toc")}</p>
                  <ul className="space-y-0.5 border-l border-border/60">
                    {toc.headings.map((h) => {
                      const active = h.id === activeHeading;
                      return (
                        <li key={h.id}>
                          <a
                            href={`#${h.id}`}
                            aria-current={active ? "location" : undefined}
                            className={cn(
                              "-ml-px block border-l-2 py-1.5 text-sm leading-snug transition-colors",
                              h.level === 3 ? "pl-6" : "pl-3",
                              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {h.text}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              )}
            </aside>
          )}
        </div>
      </Container>

      {/* Back to top: above the mobile dock, bottom-right on desktop */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={t("article.backToTop")}
        tabIndex={showScrollTop ? 0 : -1}
        aria-hidden={!showScrollTop}
        className={cn(
          "fixed right-4 bottom-24 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[opacity,transform] duration-200 md:right-6 md:bottom-6",
          showScrollTop ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
          focusRing,
        )}
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </button>

    </Page>
  );
};

export default ArticleDetailPage;
