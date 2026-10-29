import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Globe, Newspaper } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useArticleTranslations } from "@/hooks/useArticleTranslations";
import { articleCategoryLabel, isOpinion } from "@/lib/article-labels";
import OpinionLabel from "@/components/OpinionLabel";
import { timeAgo } from "@/lib/press";
import { SOCIAL_LINKS } from "@/lib/socials";
import { pickLatest, publishedAt, type BioArticle } from "@/lib/bioNews";
import criticoreIcon from "@/assets/criticore-iti.png";

const COUNT = 8;

/**
 * Link in bio for Instagram, TikTok, X and Bluesky (/bio): who we are, where to follow us and the
 * newest stories, one tap each. No navigation bar or dock, as people arrive from an app's browser
 * and want the story, not the site's menu.
 */
const BioPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  useEffect(() => {
    document.title = t("bio.metaTitle");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("bio.tagline"));
  }, [t]);

  const { data: articles, isLoading, isError } = useQuery({
    queryKey: ["bio-news", lang],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, slug, title, excerpt, cover_image_url, category, article_type, language, translation_group, published_at, created_at")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(COUNT * 3);
      if (error) throw error;
      return pickLatest((data ?? []) as BioArticle[], lang, COUNT);
    },
  });
  const translate = useArticleTranslations(articles);
  const [lead, ...rest] = articles ?? [];

  const meta = (a: BioArticle) => (
    <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
      {isOpinion(a.article_type) && <OpinionLabel type={a.article_type} />}
      {a.category && <span className="font-medium text-primary">{articleCategoryLabel(t, a.category)}</span>}
      <time dateTime={publishedAt(a)}>{timeAgo(publishedAt(a))}</time>
    </span>
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      <main className="mx-auto flex w-full max-w-[30rem] flex-col gap-9 px-4 pb-12 pt-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-border/70 bg-card">
            <img src={criticoreIcon} alt="" width={44} height={48} className="h-11 w-auto" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">CritiCore</h1>
          <p className="max-w-[34ch] text-sm leading-relaxed text-muted-foreground">{t("bio.tagline")}</p>
          <ul className="mt-1 flex items-center gap-2" aria-label={t("bio.follow")}>
            {SOCIAL_LINKS.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground active:scale-95"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </header>

        <section aria-labelledby="bio-latest" className="flex flex-col gap-4">
          <h2 id="bio-latest" className="font-display text-lg font-bold text-foreground">
            {t("bio.latest")}
          </h2>

          {isLoading && (
            <div className="flex flex-col gap-4" aria-hidden="true">
              <div className="aspect-video animate-pulse rounded-[14px] bg-muted/60 motion-reduce:animate-none" />
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-16 w-24 shrink-0 animate-pulse rounded-[10px] bg-muted/60 motion-reduce:animate-none" />
                  <div className="flex flex-1 flex-col gap-2 py-1">
                    <div className="h-4 w-full animate-pulse rounded bg-muted/60 motion-reduce:animate-none" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60 motion-reduce:animate-none" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && (isError || !lead) && (
            <p className="rounded-[14px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              {isError ? t("bio.error") : t("bio.empty")}
            </p>
          )}

          {lead && (
            <Link to={`/news/${lead.slug}`} className="group flex flex-col gap-3 rounded-[14px]">
              <span className="relative block aspect-video overflow-hidden rounded-[14px] bg-muted">
                {lead.cover_image_url ? (
                  <img src={lead.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                    <Newspaper className="h-8 w-8" aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-1.5">
                {meta(lead)}
                <span className="font-display text-xl font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{translate(lead).title}</span>
                {translate(lead).excerpt && <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{translate(lead).excerpt}</span>}
              </span>
            </Link>
          )}

          {rest.length > 0 && (
            <ul className="flex flex-col divide-y divide-border/60">
              {rest.map((a) => (
                <li key={a.id}>
                  <Link to={`/news/${a.slug}`} className="group flex items-center gap-3 py-3">
                    <span className="block h-16 w-24 shrink-0 overflow-hidden rounded-[10px] bg-muted">
                      {a.cover_image_url ? (
                        <img src={a.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                          <Newspaper className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      {meta(a)}
                      <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">{translate(a).title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <nav aria-label={t("bio.links")} className="grid gap-2.5">
          <Link to="/news" className="flex h-12 items-center justify-between rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]">
            <span className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" aria-hidden="true" />
              {t("bio.allNews")}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/" className="flex h-12 items-center justify-between rounded-full border border-border/70 px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 active:scale-[0.98]">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4" aria-hidden="true" />
              {t("bio.website")}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>criticore.cc</span>
          <Link to="/impressum" className="hover:text-foreground hover:underline">{t("footer.imprint")}</Link>
          <Link to="/datenschutz" className="hover:text-foreground hover:underline">{t("footer.privacy")}</Link>
        </footer>
      </main>
    </div>
  );
};

export default BioPage;
