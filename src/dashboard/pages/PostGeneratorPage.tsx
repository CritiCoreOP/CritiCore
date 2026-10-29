import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, ExternalLink, FileText, Link2, Palette, RotateCcw, Search, Send, Undo2 } from "lucide-react";
import { Link, useSearchParams } from "@/lib/locale-router";
import { timeAgo } from "@/lib/press";
import { formatDateTime } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBlueskyPost, usePublishedArticles, useShares, useShareToggle, type BlueskyPostError, type PublishedArticle, type ShareMark } from "../data";
import { buildPost, PLATFORM_SPECS, PLATFORMS, postLength, type Platform } from "../social/postTemplates";
import { EmptyState, PageHeader, RowsSkeleton, focusRing } from "../ui";
import OpinionLabel from "@/components/OpinionLabel";
import { isOpinion } from "@/lib/article-labels";

/** Where a platform's own compose window opens with the text filled in; Instagram has none */
function composeUrl(platform: Platform, text: string, url: string): string | null {
  const q = encodeURIComponent(text);
  if (platform === "x") return `https://x.com/intent/post?text=${q}`;
  if (platform === "bluesky") return `https://bsky.app/intent/compose?text=${q}`;
  if (platform === "threads") return `https://www.threads.net/intent/post?text=${q}`;
  if (platform === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  return null;
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

function PlatformCard({ article, platform, mark }: { article: PublishedArticle; platform: Platform; mark: ShareMark | undefined }) {
  const { t } = useTranslation();
  const spec = PLATFORM_SPECS[platform];
  const template = useMemo(() => buildPost(platform, { ...article }), [platform, article]);
  const [text, setText] = useState(template);
  const [copied, setCopied] = useState(false);
  const toggle = useShareToggle();
  const bluesky = useBlueskyPost();
  const length = postLength(platform, text);
  const over = spec.limit !== null && length > spec.limit;
  const compose = composeUrl(platform, text, article.url);

  useEffect(() => setText(template), [template]);

  const setShared = (next: boolean) => {
    if (next === !!mark) return;
    toggle.mutate(
      { articleId: article.id, platform, mark },
      { onError: () => toast.error(t("dash.posts.shareError")) },
    );
  };

  const doCopy = async () => {
    try {
      await copy(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t("dash.posts.copyError"));
    }
  };

  const open = async () => {
    if (!compose) return;
    // Facebook only takes the link; the text goes to the clipboard to paste there
    if (platform === "facebook") await copy(text).catch(() => undefined);
    window.open(compose, "_blank", "noopener,noreferrer");
    if (!mark) {
      toast(t("dash.posts.postedQuestion", { platform: spec.name }), {
        action: { label: t("dash.posts.markShared"), onClick: () => setShared(true) },
        duration: 10_000,
      });
    }
  };

  const viewPost = (url: string) => ({ label: t("dash.posts.viewPost"), onClick: () => window.open(url, "_blank", "noopener,noreferrer") });

  // Straight to the CritiCore account, with the article as link card; no compose window in between
  const postToBluesky = () => {
    if (!window.confirm(t("dash.posts.blueskyConfirm"))) return;
    bluesky.mutate(
      { articleId: article.id, text },
      {
        onSuccess: (url) => toast.success(t("dash.posts.blueskyPosted"), { action: viewPost(url) }),
        onError: (e) => {
          const { code, postUrl } = e as unknown as BlueskyPostError;
          const key = { already_posted: "blueskyAlready", not_configured: "blueskyNotConfigured", bluesky_login_failed: "blueskyLoginFailed", too_long: "blueskyTooLong" }[code] ?? "blueskyError";
          toast.error(t(`dash.posts.${key}`), postUrl ? { action: viewPost(postUrl) } : undefined);
        },
      },
    );
  };

  const id = `post-${platform}`;
  return (
    <section aria-labelledby={`${id}-title`} className={cn("grid gap-3 rounded-2xl border bg-card/40 p-4", mark ? "border-emerald-500/40" : "border-border/50")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-title`} className="font-display text-base font-bold text-foreground">
          {spec.name}
        </h3>
        <span className={cn("text-xs tabular-nums", over ? "font-semibold text-destructive" : "text-muted-foreground")} aria-live="polite">
          {spec.limit === null ? t("dash.posts.chars", { count: length }) : `${length} / ${spec.limit}`}
        </span>
      </div>
      <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={text.split("\n").length + 1} className="text-sm leading-relaxed [field-sizing:content]" aria-labelledby={`${id}-title`} aria-invalid={over} />
      {over && <p className="text-xs text-destructive">{t("dash.posts.tooLong", { count: length - spec.limit! })}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {platform === "bluesky" && !mark?.postUrl && (
          <Button type="button" size="sm" onClick={postToBluesky} disabled={over || !text.trim() || bluesky.isPending} className="gap-1.5">
            <Send className="h-4 w-4" aria-hidden="true" />
            {bluesky.isPending ? t("dash.posts.blueskyPosting") : t("dash.posts.blueskyPost")}
          </Button>
        )}
        {mark?.postUrl && (
          <Button asChild size="sm" variant="secondary" className="gap-1.5">
            <a href={mark.postUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t("dash.posts.viewPost")}
            </a>
          </Button>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={doCopy} className="gap-1.5">
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? t("dash.posts.copied") : t("dash.posts.copy")}
        </Button>
        {compose ? (
          <Button type="button" size="sm" variant="secondary" onClick={open} className="gap-1.5">
            <Send className="h-4 w-4" aria-hidden="true" />
            {t("dash.posts.open", { platform: spec.name })}
          </Button>
        ) : (
          article.cover && (
            <Button asChild size="sm" variant="secondary" className="gap-1.5">
              <a href={article.cover} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t("dash.posts.openCover")}
              </a>
            </Button>
          )
        )}
        {text !== template && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setText(template)} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("dash.posts.reset")}
          </Button>
        )}
        <div className="ml-auto">
          {mark ? (
            <Button type="button" size="sm" variant="ghost" disabled={toggle.isPending} onClick={() => setShared(false)} className="gap-1.5 text-emerald-600 dark:text-emerald-400" title={formatDateTime(mark.sharedAt)}>
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              {t("dash.posts.sharedAt", { when: timeAgo(mark.sharedAt) })}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" disabled={toggle.isPending} onClick={() => setShared(true)} className="gap-1.5">
              <Check className="h-4 w-4" aria-hidden="true" />
              {t("dash.posts.markShared")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function PostGeneratorPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const articles = usePublishedArticles(term, 40);
  const selectedId = params.get("article");
  const list = articles.data ?? [];
  const shares = useShares(list.map((a) => a.id));
  const selected = list.find((a) => a.id === selectedId);
  const marks = (id: string) => (shares.data ?? []).filter((s) => s.articleId === id);

  useEffect(() => {
    const id = window.setTimeout(() => setTerm(search), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("article", id);
    else next.delete("article");
    setParams(next, { replace: !id });
  };

  return (
    <div className="grid gap-6">
      <PageHeader title={t("dash.nav.posts")} description={t("dash.posts.intro")} />

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <section aria-label={t("dash.posts.articles")} className={cn("grid gap-3", selected && "max-lg:hidden")}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("dash.posts.search")} aria-label={t("dash.posts.search")} className="pl-9" />
          </div>
          {articles.isLoading ? (
            <RowsSkeleton rows={6} />
          ) : articles.isError ? (
            <p className="text-sm text-destructive">{t("dash.loadError")}</p>
          ) : list.length === 0 ? (
            <EmptyState icon={<FileText className="h-7 w-7" />} title={t("dash.posts.noArticles")} />
          ) : (
            <ul className="grid gap-1 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto lg:pr-1">
              {list.map((a) => {
                const done = marks(a.id).length;
                const on = a.id === selected?.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => select(a.id)}
                      aria-current={on ? "true" : undefined}
                      className={cn("grid w-full grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors", focusRing, on ? "bg-primary/10" : "hover:bg-muted/50")}
                    >
                      <span className="aspect-video overflow-hidden rounded-md bg-muted">{a.cover && <img src={a.cover} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5">
                          {isOpinion(a.articleType) && <OpinionLabel type={a.articleType} />}
                          <span className="truncate text-sm font-medium text-foreground">{a.title}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {timeAgo(a.publishedAt)}, {t("dash.unshared.progress", { done, total: PLATFORMS.length })}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className={cn("grid gap-4", !selected && "max-lg:hidden")}>
          {!selected ? (
            <EmptyState icon={<Send className="h-7 w-7" />} title={t("dash.posts.pickTitle")}>
              {t("dash.posts.pickBody")}
            </EmptyState>
          ) : (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => select(null)} className="w-fit gap-1.5 text-muted-foreground lg:hidden">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t("dash.posts.back")}
              </Button>
              <article className={cn("grid gap-4 rounded-2xl border border-border/50 bg-card/40 p-4", selected.cover && "sm:grid-cols-[10rem_minmax(0,1fr)]")}>
                {selected.cover && <img src={selected.cover} alt="" className="aspect-video w-full rounded-lg object-cover" />}
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold leading-snug text-foreground">{selected.title}</h2>
                  {selected.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{selected.excerpt}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <a href={selected.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        {t("dash.posts.openArticle")}
                      </a>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => copy(selected.url).then(() => toast.success(t("dash.posts.linkCopied")), () => toast.error(t("dash.posts.copyError")))}
                    >
                      <Link2 className="h-4 w-4" aria-hidden="true" />
                      {t("dash.posts.copyLink")}
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link to={`/social-creator?article=${selected.id}`}>
                        <Palette className="h-4 w-4" aria-hidden="true" />
                        {t("dash.posts.makeGraphic")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
              <div className="grid gap-4 2xl:grid-cols-2">
                {PLATFORMS.map((p) => (
                  <PlatformCard key={`${selected.id}-${p}`} article={selected} platform={p} mark={marks(selected.id).find((m) => m.platform === p)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
