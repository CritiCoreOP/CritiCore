import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { icons, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchMovies, searchSeries, discoverGames, getMovieDetail, getSeriesDetail, tmdbImage, tmdbBackdrop, rawgImageResize } from "@/lib/api";
import UploadsPanel from "./UploadsPanel";
import SocialCanvas from "./SocialCanvas";
import { BRAND_LOGOS, BRAND_TEXTS } from "./brandAssets";
import { CURATED_ICONS } from "./icons";
import { TEMPLATES, newSlide } from "./templates";
import { useAdders } from "./adders";
import { authorBadge, slideFromArticle, summaryLength, type SlideAuthor } from "./articleSlide";
import { loadAuthors, type AuthorProfile } from "@/lib/articleAuthor";
import { clipText, summarizeArticle } from "./articleSummary";
import { fitText } from "./textFit";
import type { CanvasElement, Slide } from "./types";
import OpinionLabel from "@/components/OpinionLabel";
import { isOpinion } from "@/lib/article-labels";

/** External pictures go through the image proxy, so they are CORS-safe in the PNG export */
const proxied = (url: string | null): string | null =>
  url ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/news-image?src=${encodeURIComponent(url)}` : null;

const BODY = "Inter, system-ui, -apple-system, sans-serif";

const tile = "rounded-[10px] border border-border/60 bg-background/40 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SearchField({ value, onChange, placeholder, onEnter }: { value: string; onChange: (v: string) => void; placeholder: string; onEnter?: () => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 pl-8 text-sm"
      />
    </div>
  );
}

/** Segmented control for the sub-sections of a panel */
function Segments<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: [T, string][]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-[10px] bg-secondary/60 p-1">
      {items.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn("rounded-[7px] px-2 py-1.5 text-xs font-medium transition-colors", value === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/* ── Templates ────────────────────────────────────────────────────────────── */

export function TemplatesPanel({ slide, onApply, onAddSlide }: { slide: Slide; onApply: (templateId: string) => void; onAddSlide: (templateId: string) => void }) {
  const { t } = useTranslation();
  // Previews in the format of the current slide
  const previews = useMemo(() => TEMPLATES.map((tpl) => ({ tpl, slide: newSlide(slide.formatId, slide.width, slide.height, tpl.id) })), [slide.formatId, slide.width, slide.height]);
  const tall = slide.height > slide.width;

  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">{t("socialCreator.templates.hint")}</p>
      <ul className={cn("grid gap-3", tall ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1")}>
        {previews.map(({ tpl, slide: preview }) => (
          <li key={tpl.id} className="group relative">
            <button type="button" onClick={() => onApply(tpl.id)} className={cn(tile, "grid w-full gap-2 p-2 text-left")} aria-label={t("socialCreator.templates.apply", { name: t(`socialCreator.templates.items.${tpl.id}.label`, tpl.label) })}>
              <span className="pointer-events-none flex justify-center overflow-hidden rounded-[6px] bg-black/30">
                <SocialCanvas slide={preview} maxWidth={tall ? 112 : 240} maxHeight={tall ? 200 : 136} interactive={false} onChange={() => {}} />
              </span>
              <span className="min-w-0 px-0.5">
                <span className="block truncate text-sm font-medium text-foreground">{t(`socialCreator.templates.items.${tpl.id}.label`, tpl.label)}</span>
                <span className="block truncate text-xs text-muted-foreground">{t(`socialCreator.templates.items.${tpl.id}.description`, tpl.description)}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onAddSlide(tpl.id)}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
              title={t("socialCreator.templates.asNewSlide")}
              aria-label={t("socialCreator.templates.asNewSlide")}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Text ─────────────────────────────────────────────────────────────────── */

export function TextPanel({ slide, onAdd }: { slide: Slide; onAdd: (el: CanvasElement) => void }) {
  const { t } = useTranslation();
  const { addText } = useAdders(slide, onAdd);
  const S = Math.min(slide.width, slide.height);
  const presets: { label: string; className: string; run: () => void }[] = [
    { label: t("socialCreator.text.heading"), className: "font-display text-2xl font-bold", run: () => addText(t("socialCreator.text.heading"), { fontSize: Math.round(S * 0.075) }) },
    { label: t("socialCreator.text.subheading"), className: "text-lg font-semibold", run: () => addText(t("socialCreator.text.subheading"), { fontSize: Math.round(S * 0.042), fontWeight: 600, fontFamily: BODY }) },
    { label: t("socialCreator.text.body"), className: "text-sm", run: () => addText(t("socialCreator.text.bodyText"), { fontSize: Math.round(S * 0.03), fontWeight: 400, fontFamily: BODY, lineHeight: 1.35 }) },
    { label: t("socialCreator.text.label"), className: "text-xs font-bold uppercase tracking-[0.2em] text-primary", run: () => addText(t("socialCreator.text.label"), { fontSize: Math.round(S * 0.026), uppercase: true, letterSpacing: 4, color: "#5c9dff" }) },
    { label: t("socialCreator.text.pill"), className: "w-fit rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background", run: () => addText(t("socialCreator.text.pill"), { fontSize: Math.round(S * 0.03), color: "#19171b", bgColor: "#efedf4", padding: Math.round(S * 0.015), radius: 999, align: "center", w: slide.width * 0.4 }) },
  ];
  return (
    <div className="grid gap-5">
      <Section title={t("socialCreator.text.styles")}>
        <div className="grid gap-2">
          {presets.map((p) => (
            <button key={p.label} type="button" onClick={p.run} className={cn(tile, "px-3 py-2.5 text-left text-foreground")}>
              <span className={cn("block", p.className)}>{p.label}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title={t("socialCreator.text.brand")}>
        <ul className="grid gap-1">
          {BRAND_TEXTS.map((bt) => (
            <li key={bt.label}>
              <button type="button" onClick={() => addText(bt.value)} className="flex w-full items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60">
                <span className="shrink-0 text-xs text-muted-foreground">{bt.label}</span>
                <span className="min-w-0 truncate text-foreground">{bt.value}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/* ── Media: titles, articles, reviews ─────────────────────────────────────── */

type MediaKind = "movie" | "tv" | "game";

interface MediaHit {
  key: string;
  id: number;
  kind: MediaKind;
  title: string;
  year: string;
  poster: string | null;
  backdrop: string | null;
  score: number;
}

async function searchMedia(kind: MediaKind, q: string): Promise<MediaHit[]> {
  if (kind === "game") {
    const games = (await discoverGames({ search: q })).results || [];
    return games.map((g) => ({
      key: `game-${g.id}`, id: g.id, kind, title: g.name, year: (g.released || "").slice(0, 4),
      poster: rawgImageResize(g.background_image, 500), backdrop: null,
      score: g.metacritic ? Math.round(g.metacritic) / 10 : Math.round((g.rating || 0) * 20) / 10,
    }));
  }
  const rows = kind === "movie" ? await searchMovies(q) : await searchSeries(q);
  return rows.slice(0, 12).map((m) => ({
    key: `${kind}-${m.id}`, id: m.id, kind, title: m.title || m.name || "", year: (m.release_date || m.first_air_date || "").slice(0, 4),
    poster: tmdbImage(m.poster_path, "w500"), backdrop: tmdbBackdrop(m.backdrop_path), score: Math.round((m.vote_average || 0) * 10) / 10,
  }));
}

interface ArticleRow {
  id: string;
  user_id: string;
  article_type: string;
  language: string | null;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
}

interface ReviewRow {
  id: string;
  title: string | null;
  content: string | null;
  score: number;
}

export function MediaPanel({ slide, onAdd, onAddMany, onSetBackground, onAddSlide }: { slide: Slide; onAdd: (el: CanvasElement) => void; onAddMany: (els: CanvasElement[]) => void; onSetBackground: (src: string) => void; onAddSlide: (slide: Slide) => void }) {
  const { t } = useTranslation();
  const add = useAdders(slide, onAdd);
  const S = Math.min(slide.width, slide.height);
  const [tab, setTab] = useState<"titles" | "articles" | "reviews">("titles");
  const [kind, setKind] = useState<MediaKind>("tv");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<MediaHit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [logos, setLogos] = useState<Record<string, { src: string; label: string }[] | "loading">>({});
  const [articles, setArticles] = useState<ArticleRow[] | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<{ id: string; what: "slide" | "summary" } | null>(null);
  const [authors, setAuthors] = useState<Record<string, AuthorProfile>>({});

  const authorOf = (a: ArticleRow): SlideAuthor | null => {
    const p = authors[a.user_id];
    return p ? { userId: p.user_id, name: p.name, avatar: p.avatar_url } : null;
  };

  /** Picture and name of the author in the middle of the slide, grouped */
  const addAuthor = (a: ArticleRow) => {
    const author = authorOf(a);
    if (!author) return;
    const size = Math.round(S * 0.09);
    onAddMany(authorBadge(author, slide.width / 2, Math.round(slide.height / 2 - size / 2), size, { align: "left", maxWidth: slide.width * 0.7 }).map((el, i, all) => {
      // Centre the pair as a whole: shift both by half their joint width
      const right = Math.max(...all.map((e) => e.x + e.w));
      return { ...el, x: Math.round(el.x - (right - all[0].x) / 2) };
    }));
  };

  /** Body text sized so it fits its box; the default box of addText would clip a few lines */
  const addBodyText = (value: string) => {
    const fit = fitText(value, { fontFamily: BODY, fontWeight: 500, width: slide.width * 0.8, maxHeight: slide.height * 0.4, maxSize: Math.round(S * 0.036), minSize: Math.round(S * 0.026), lineHeight: 1.38 });
    add.addText(value, { fontSize: fit.fontSize, h: fit.height, y: Math.round(slide.height / 2 - fit.height / 2), fontWeight: 500, fontFamily: BODY, lineHeight: 1.38 });
  };

  /** AI summary in the length this format has room for; the teaser stands in when the AI fails */
  const summaryFor = async (a: ArticleRow, what: "slide" | "summary") => {
    const max = summaryLength(slide.formatId);
    setBusy({ id: a.id, what });
    try {
      return await summarizeArticle(a.id, max);
    } catch (e) {
      const reason = e instanceof Error && e.message !== "AI" ? e.message : "";
      toast.error(t("socialCreator.media.summaryFailed"), { description: [reason, a.excerpt ? t("socialCreator.media.summaryFallback") : ""].filter(Boolean).join(" ") || undefined });
      return a.excerpt ? clipText(a.excerpt, max) : "";
    } finally {
      setBusy(null);
    }
  };

  const asSlide = async (a: ArticleRow) => {
    const summary = await summaryFor(a, "slide");
    onAddSlide(slideFromArticle({ title: a.title, category: a.category, cover: a.cover_image_url, summary, author: authorOf(a), type: a.article_type, language: a.language }, slide.formatId));
  };

  const addSummary = async (a: ArticleRow) => {
    const summary = await summaryFor(a, "summary");
    if (summary) addBodyText(summary);
  };

  useEffect(() => {
    if (tab === "articles" && !articles) {
      void supabase.from("articles").select("id,user_id,title,excerpt,cover_image_url,category,article_type,language").eq("published", true).order("published_at", { ascending: false }).limit(40).then(async ({ data }) => {
        setArticles(data ?? []);
        setAuthors(await loadAuthors((data ?? []).map((a) => a.user_id)));
      });
    }
    if (tab === "reviews" && !reviews) {
      void supabase.from("reviews").select("id,title,content,score").order("created_at", { ascending: false }).limit(40).then(({ data }) => setReviews(data ?? []));
    }
  }, [tab, articles, reviews]);

  const run = async () => {
    if (!query.trim()) return;
    setState("loading");
    try {
      setHits(await searchMedia(kind, query.trim()));
      setState("done");
    } catch {
      setState("error");
    }
  };

  const loadLogos = async (hit: MediaHit) => {
    if (logos[hit.key]) return;
    setLogos((m) => ({ ...m, [hit.key]: "loading" }));
    try {
      const detail = hit.kind === "movie" ? await getMovieDetail(String(hit.id)) : await getSeriesDetail(String(hit.id));
      const list = ((detail as { production_companies?: { logo_path: string | null; name: string }[] }).production_companies || [])
        .filter((c) => c.logo_path)
        .map((c) => ({ src: proxied(tmdbImage(c.logo_path, "w300"))!, label: c.name }));
      setLogos((m) => ({ ...m, [hit.key]: list }));
    } catch {
      setLogos((m) => ({ ...m, [hit.key]: [] }));
    }
  };

  const chip = "h-7 rounded-full px-2.5 text-[11px]";
  const match = (text: string | null) => !filter || (text ?? "").toLowerCase().includes(filter.toLowerCase());

  return (
    <div className="grid gap-3">
      <Segments<"titles" | "articles" | "reviews">
        label={t("socialCreator.panels.media")}
        value={tab}
        onChange={setTab}
        items={[["titles", t("socialCreator.media.titles")], ["articles", t("socialCreator.media.articles")], ["reviews", t("socialCreator.media.reviews")]]}
      />

      {tab === "titles" && (
        <>
          <div className="flex gap-1">
            {(["tv", "movie", "game"] as const).map((k) => (
              <Button key={k} type="button" size="sm" variant={kind === k ? "secondary" : "ghost"} className="h-7 flex-1 text-xs" onClick={() => { setKind(k); setHits([]); setState("idle"); }}>
                {t(`socialCreator.media.kind.${k}`)}
              </Button>
            ))}
          </div>
          <SearchField value={query} onChange={setQuery} onEnter={run} placeholder={t(`socialCreator.media.search.${kind}`)} />
          {state === "loading" && <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t("socialCreator.media.searching")}</p>}
          {state === "error" && <p className="py-4 text-center text-xs text-destructive">{t("socialCreator.media.error")}</p>}
          {state === "done" && hits.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{t("socialCreator.media.noResults")}</p>}
          {state === "idle" && <p className="py-2 text-xs text-muted-foreground">{t("socialCreator.media.hint")}</p>}
          <ul className="grid gap-2">
            {hits.map((hit) => {
              const l = logos[hit.key];
              const poster = proxied(hit.poster);
              const backdrop = proxied(hit.backdrop);
              return (
                <li key={hit.key} className="rounded-[10px] border border-border/60 p-2">
                  <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2.5">
                    <span className="aspect-[2/3] overflow-hidden rounded-[6px] bg-muted">{hit.poster && <img src={hit.poster} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug text-foreground line-clamp-2">{hit.title}</span>
                      {hit.year && <span className="block text-xs text-muted-foreground">{hit.year}</span>}
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {poster && <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => add.addPoster(poster, hit.title)}>{t("socialCreator.media.poster")}</Button>}
                        {backdrop && <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => onSetBackground(backdrop)}>{t("socialCreator.media.asBackground")}</Button>}
                        <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => add.addText(hit.title, { fontSize: Math.round(S * 0.06) })}>{t("socialCreator.media.title")}</Button>
                        {hit.score > 0 && <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => add.addScore(hit.score)}>{t("socialCreator.media.score")}</Button>}
                        {hit.kind !== "game" && (
                          <Button type="button" size="sm" variant="ghost" className={chip} onClick={() => loadLogos(hit)} disabled={l === "loading"}>
                            {l === "loading" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : t("socialCreator.media.logos")}
                          </Button>
                        )}
                      </span>
                    </span>
                  </div>
                  {Array.isArray(l) && (
                    l.length ? (
                      <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-border/60 pt-2">
                        {l.map((logo) => (
                          <button key={logo.src} type="button" title={logo.label} onClick={() => add.addImage(logo.src, logo.label)} className="flex h-10 items-center justify-center rounded-[6px] bg-white p-1 hover:ring-2 hover:ring-primary">
                            <img src={logo.src} alt={logo.label} className="max-h-full max-w-full object-contain" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">{t("socialCreator.media.noLogos")}</p>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {tab !== "titles" && <SearchField value={filter} onChange={setFilter} placeholder={t("socialCreator.media.filter")} />}

      {tab === "articles" && (
        !articles ? <PanelLoading /> : (
          <ul className="grid gap-2">
            {articles.filter((a) => match(a.title) || match(a.excerpt)).map((a) => (
              <li key={a.id} className="grid gap-2 rounded-[10px] border border-border/60 p-2">
                <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2.5">
                  <span className="aspect-video overflow-hidden rounded-[6px] bg-muted">{a.cover_image_url && <img src={a.cover_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>
                  <span className="min-w-0">
                    {isOpinion(a.article_type) && <OpinionLabel type={a.article_type} className="mb-1" />}
                    <span className="block text-sm font-medium leading-snug text-foreground line-clamp-2">{a.title}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="sm" className={cn(chip, "gap-1")} disabled={!!busy} onClick={() => void asSlide(a)} title={t("socialCreator.media.asSlideHint")}>
                    {busy?.id === a.id && busy.what === "slide" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
                    {busy?.id === a.id && busy.what === "slide" ? t("socialCreator.media.summarizing") : t("socialCreator.media.asSlide")}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" className={cn(chip, "gap-1")} disabled={!!busy} onClick={() => void addSummary(a)}>
                    {busy?.id === a.id && busy.what === "summary" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
                    {t("socialCreator.media.aiSummary")}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => add.addText(a.title, { fontSize: Math.round(S * 0.06) })}>{t("socialCreator.media.title")}</Button>
                  {a.excerpt && <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => addBodyText(a.excerpt!)}>{t("socialCreator.media.excerpt")}</Button>}
                  {a.cover_image_url && <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => onSetBackground(a.cover_image_url!)}>{t("socialCreator.media.asBackground")}</Button>}
                  {authors[a.user_id] && <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => addAuthor(a)} title={authors[a.user_id].name}>{t("socialCreator.media.author")}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === "reviews" && (
        !reviews ? <PanelLoading /> : (
          <ul className="grid gap-2">
            {reviews.filter((r) => match(r.title) || match(r.content)).map((r) => (
              <li key={r.id} className="grid gap-2 rounded-[10px] border border-border/60 p-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-foreground line-clamp-2">{r.title || t("socialCreator.media.review")}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-primary">{r.score}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => add.addScore(Number(r.score))}>{t("socialCreator.media.score")}</Button>
                  {r.title && <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => add.addText(r.title!, { fontSize: Math.round(S * 0.06) })}>{t("socialCreator.media.title")}</Button>}
                  {r.content && <Button type="button" size="sm" variant="secondary" className={chip} onClick={() => add.addText(`„${String(r.content).slice(0, 140).trim()}“`, { italic: true, fontWeight: 400, fontSize: Math.round(S * 0.04) })}>{t("socialCreator.media.quote")}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function PanelLoading() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-[10px] bg-muted/50 motion-reduce:animate-none" />)}
    </div>
  );
}

/* ── Uploads ──────────────────────────────────────────────────────────────── */

export function UploadsLibrary({ slide, onAdd, onSetBackground }: { slide: Slide; onAdd: (el: CanvasElement) => void; onSetBackground: (src: string) => void }) {
  const { addImage } = useAdders(slide, onAdd);
  return <UploadsPanel onAddImage={(src, label, fit) => addImage(src, label, fit ?? "contain")} onSetBackground={onSetBackground} />;
}

/* ── Brand ────────────────────────────────────────────────────────────────── */

export function BrandPanel({ slide, onAdd }: { slide: Slide; onAdd: (el: CanvasElement) => void }) {
  const { addImage } = useAdders(slide, onAdd);
  return (
    <div className="grid gap-5">
      {(["CritiCore", "TGN", "Partner", "Presse"] as const).map((group) => (
        <Section key={group} title={group}>
          <div className="grid grid-cols-3 gap-2">
            {BRAND_LOGOS.filter((l) => l.group === group).map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => addImage(l.src, l.label)}
                title={l.label}
                aria-label={l.label}
                className={cn("flex h-16 items-center justify-center rounded-[10px] border border-border/60 p-2 transition-colors hover:border-primary", l.darkBg ? "bg-zinc-900" : "bg-white")}
              >
                <img src={l.src} alt="" className="max-h-full max-w-full object-contain" />
              </button>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

/* ── Elements: shapes, score, icons ───────────────────────────────────────── */

const ALL_ICONS = Object.keys(icons);

export function ElementsPanel({ slide, onAdd }: { slide: Slide; onAdd: (el: CanvasElement) => void }) {
  const { t } = useTranslation();
  const add = useAdders(slide, onAdd);
  const [query, setQuery] = useState("");
  const { width: W, height: H } = slide;
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURATED_ICONS.map((i) => i.name);
    return ALL_ICONS.filter((n) => n.toLowerCase().includes(q)).slice(0, 60);
  }, [query]);

  const shapes: { id: string; preview: ReactNode; run: () => void }[] = [
    { id: "rect", preview: <span className="h-8 w-11 bg-primary" />, run: () => add.addShape({}) },
    { id: "rounded", preview: <span className="h-8 w-11 rounded-[8px] bg-primary" />, run: () => add.addShape({ radius: 32 }) },
    { id: "circle", preview: <span className="h-9 w-9 rounded-full bg-primary" />, run: () => add.addShape({ radius: 9999, w: Math.min(W, H) * 0.3, h: Math.min(W, H) * 0.3 }) },
    { id: "line", preview: <span className="h-1 w-11 rounded-full bg-primary" />, run: () => add.addShape({ h: Math.max(6, H * 0.008), y: H / 2, radius: 999 }) },
    { id: "frame", preview: <span className="h-8 w-11 border-2 border-primary" />, run: () => add.addShape({ fill: "transparent", borderColor: "#5c9dff", borderWidth: Math.round(Math.min(W, H) * 0.008) }) },
    {
      id: "fade",
      preview: <span className="h-8 w-11 bg-gradient-to-b from-transparent to-black" />,
      run: () => add.addShape({ fill: "linear-gradient(180deg, rgba(25,23,27,0) 0%, #19171b 100%)", x: 0, y: H * 0.45, w: W, h: H * 0.55 }),
    },
  ];

  return (
    <div className="grid gap-5">
      <Section title={t("socialCreator.elements.shapes")}>
        <div className="grid grid-cols-3 gap-2">
          {shapes.map((s) => (
            <button key={s.id} type="button" onClick={s.run} className={cn(tile, "flex h-16 items-center justify-center")} title={t(`socialCreator.elements.shape.${s.id}`)} aria-label={t(`socialCreator.elements.shape.${s.id}`)}>
              {s.preview}
            </button>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => add.addScore()} className="w-full">{t("socialCreator.elements.score")}</Button>
      </Section>
      <Section title={t("socialCreator.elements.icons")}>
        <SearchField value={query} onChange={setQuery} placeholder={t("socialCreator.elements.iconSearch")} />
        {found.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">{t("socialCreator.media.noResults")}</p>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {found.map((name) => {
              const Cmp = (icons as Record<string, React.ComponentType<{ className?: string }>>)[name] || icons.Square;
              return (
                <button key={name} type="button" title={name} aria-label={name} onClick={() => add.addIcon(name)} className={cn(tile, "flex aspect-square items-center justify-center text-foreground hover:text-primary")}>
                  <Cmp className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
