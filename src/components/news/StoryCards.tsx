import { useTranslation } from "react-i18next";
import { Sparkles, Newspaper } from "lucide-react";
import { Link } from "@/lib/locale-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OpinionLabel from "@/components/OpinionLabel";
import LiveLabel from "@/components/live/LiveLabel";
import { useLiveArticleIds } from "@/hooks/useLiveBlog";
import { ARTICLE_CATEGORY_KEYS, ARTICLE_TYPE_KEYS, isOpinion } from "@/lib/article-labels";
import { formatDate } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import tgnPlusIcon from "@/assets/tgn-plus.png";

/* Story cards of the news pages (front page and /news): lead, secondary and river items */

export type ArticleWithAuthor = Tables<"articles"> & {
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  translatedTitle?: string;
  translatedExcerpt?: string;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
// Underline instead of recoloring: primary text on the dark surface is too low-contrast.
// Hover only on real pointers, otherwise the underline sticks after a tap on touch screens.
const titleHover =
  "decoration-primary decoration-2 underline-offset-4 [@media(hover:hover)]:group-hover:underline group-focus-visible:underline";

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return Math.max(1, Math.round(text.split(" ").length / 200));
}

const titleOf = (a: ArticleWithAuthor) => a.translatedTitle || a.title;
const excerptOf = (a: ArticleWithAuthor) => a.translatedExcerpt || a.excerpt;

/* ── Shared pieces ── */
// Type and category in one line under the image, instead of pills on top of it
const Kicker = ({ article }: { article: ArticleWithAuthor }) => {
  const { t } = useTranslation();
  const liveIds = useLiveArticleIds();
  return (
    <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      {liveIds.has(article.id) && <LiveLabel />}
      {isOpinion(article.article_type) ? <OpinionLabel type={article.article_type} /> : <span className="text-foreground/90">{t(ARTICLE_TYPE_KEYS[article.article_type] || "news.typeNews")}</span>}
      {article.category && (
        <>
          <span aria-hidden="true">·</span>
          <span>{t(ARTICLE_CATEGORY_KEYS[article.category] || "news.general")}</span>
        </>
      )}
      {article.tgn_plus && <img src={tgnPlusIcon} alt="TGN+" className="h-4 w-4" />}
    </p>
  );
};

const Byline = ({ article }: { article: ArticleWithAuthor }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {article.profile && (
        <span className="inline-flex items-center gap-2">
          <Avatar className="h-5 w-5 ring-1 ring-border/60">
            <AvatarImage src={article.profile.avatar_url || ""} alt="" />
            <AvatarFallback className="bg-secondary text-[8px]">
              {(article.profile.display_name || "U").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-foreground/85">
            {article.profile.display_name || t("article.unknownAuthor")}
          </span>
        </span>
      )}
      <time dateTime={article.created_at}>{formatDate(article.created_at)}</time>
      <span>{t("article.readingTime", { min: estimateReadingTime(article.content) })}</span>
    </div>
  );
};

// The title sits right next to the image inside the same link, so the image stays decorative (alt="")
const Cover = ({ article, className, eager }: { article: ArticleWithAuthor; className?: string; eager?: boolean }) => (
  <div className={cn("relative overflow-hidden rounded-2xl bg-secondary/40", className)}>
    {article.cover_image_url ? (
      <img
        src={article.cover_image_url}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 ease-[var(--mcc-ease-out)] motion-safe:[@media(hover:hover)]:group-hover:scale-[1.03]"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center">
        <Newspaper className="h-10 w-10 text-muted-foreground/20" aria-hidden="true" />
      </div>
    )}
  </div>
);

/* ── Lead story ── */
// With secondary stories beside it (from xl, next to the side rail), the image grows to match their column height
export const LeadStory = ({ article, fill }: { article: ArticleWithAuthor; fill?: boolean }) => {
  const { t } = useTranslation();
  const excerpt = excerptOf(article);
  return (
    <Link to={`/news/${article.slug}`} className={cn("group flex h-full flex-col gap-5 rounded-2xl", focusRing)}>
      <Cover
        article={article}
        eager
        className={cn("aspect-[16/9]", fill && "xl:aspect-auto xl:min-h-[320px] xl:flex-1")}
      />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {article.featured && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {t("news.featured")}
            </span>
          )}
          <Kicker article={article} />
        </div>
        <h2 className={cn("font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground md:text-4xl lg:text-[2.75rem]", titleHover)}>
          {titleOf(article)}
        </h2>
        {excerpt && (
          <p className="max-w-[65ch] text-[15px] leading-relaxed text-muted-foreground line-clamp-3">{excerpt}</p>
        )}
        <Byline article={article} />
      </div>
    </Link>
  );
};

/* ── Secondary story (right of the lead) ── */
export const SecondaryStory = ({ article }: { article: ArticleWithAuthor }) => (
  <Link to={`/news/${article.slug}`} className={cn("group flex flex-col gap-3 rounded-2xl", focusRing)}>
    <Cover article={article} className="aspect-[16/9]" />
    <div className="space-y-2">
      <Kicker article={article} />
      <h3 className={cn("font-display text-lg font-bold leading-snug text-foreground line-clamp-3", titleHover)}>
        {titleOf(article)}
      </h3>
      <Byline article={article} />
    </div>
  </Link>
);

/* ── River item (everything after the lead block) ── */
export const RiverItem = ({ article }: { article: ArticleWithAuthor }) => {
  const excerpt = excerptOf(article);
  return (
    <Link
      to={`/news/${article.slug}`}
      className={cn("group grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-4 rounded-2xl sm:gap-5", focusRing)}
    >
      <Cover article={article} className="aspect-[4/3]" />
      <div className="min-w-0 space-y-2">
        <Kicker article={article} />
        <h3 className={cn("font-display text-base font-bold leading-snug text-foreground line-clamp-3 sm:text-lg", titleHover)}>
          {titleOf(article)}
        </h3>
        {excerpt && (
          <p className="hidden text-sm leading-relaxed text-muted-foreground sm:line-clamp-2">{excerpt}</p>
        )}
        <Byline article={article} />
      </div>
    </Link>
  );
};
