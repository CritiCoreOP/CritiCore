import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import JSZip from "jszip";
import { Check, Copy, Download, ListOrdered, Loader2, Package, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { downloadBlob } from "@/lib/graphicExport";
import i18n, { loadLanguage } from "@/i18n";
import { cn } from "@/lib/utils";
import { exportGraphic, renderGraphic, useGraphicPictures } from "@/components/admin/topten/exportPng";
import { postText } from "@/components/admin/topten/postText";
import { autofill, EmptyListError } from "@/components/admin/topten/autofill";
import { autoTexts, PROVIDER_NAMES, sourceFor, sourcesFor } from "@/components/admin/topten/sources";
import EntryEditor from "@/components/admin/topten/EntryEditor";
import TopTenCanvas from "@/components/admin/topten/TopTenCanvas";
import {
  ACCENTS,
  emptyTopTen,
  filledEntries,
  FORMATS,
  loadDraft,
  MAX_ENTRIES,
  newEntry,
  saveDraft,
  type Accent,
  type TopTenData,
  type TopTenFormat,
  type TopTenWorld,
} from "@/components/admin/topten/types";

const WORLDS: TopTenWorld[] = ["anime", "movies", "series", "games"];
const LANGS = ["de", "en", "fr", "es", "th"];
const FORMAT_KEYS = Object.keys(FORMATS) as TopTenFormat[];

/** Admin → Top 10: ranking graphics for social media, as PNG in the site's look */
export default function AdminTopTen() {
  const { t } = useTranslation();
  const [data, setData] = useState<TopTenData>(() => loadDraft() ?? emptyTopTen(i18n.language));
  const [format, setFormat] = useState<TopTenFormat>("portrait");
  const [exporting, setExporting] = useState(false);
  const [filling, setFilling] = useState(false);
  // Every format rendered off screen while the ZIP is built
  const [bulk, setBulk] = useState(false);
  const bulkRefs = useRef<Partial<Record<TopTenFormat, HTMLDivElement | null>>>({});
  const dragFrom = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  // After a fill: when the list it was compared with was fetched (null: first fetch, no movement)
  const [compared, setCompared] = useState<{ at: number | null } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const { width, height } = FORMATS[format];

  useEffect(() => {
    const id = window.setTimeout(() => saveDraft(data), 400);
    return () => window.clearTimeout(id);
  }, [data]);

  // The preview fits the column; the canvas itself keeps its real pixel size for the export
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / width));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  const set = (patch: Partial<TopTenData>) => setData((d) => ({ ...d, ...patch }));
  const source = sourceFor(data.world, data.source);
  const listName = (kind: string) => t(`admin.topten.lists.${kind}`);
  const filled = filledEntries(data).length;
  const { resolved, pending } = useGraphicPictures(
    filledEntries(data).flatMap((e) => [e.poster, e.backdrop]).filter((u): u is string => !!u && !u.startsWith("data:")),
  );

  const move = (index: number, direction: -1 | 1) =>
    setData((d) => {
      const entries = [...d.entries];
      const target = index + direction;
      [entries[index], entries[target]] = [entries[target], entries[index]];
      return { ...d, entries };
    });

  const moveTo = (from: number, to: number) =>
    setData((d) => {
      const entries = [...d.entries];
      const [item] = entries.splice(from, 1);
      entries.splice(to, 0, item);
      return { ...d, entries };
    });

  const slug = (data.title || "top-10").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "top-10";

  const exportPng = async () => {
    if (!canvas.current) return;
    setExporting(true);
    try {
      await exportGraphic(canvas.current, `${slug}-${format}.png`);
    } catch (e) {
      console.error("top ten export", e);
      toast.error(t("admin.topten.exportError"));
    } finally {
      setExporting(false);
    }
  };

  // All four formats in one ZIP: rendered off screen once the canvases are mounted
  useEffect(() => {
    if (!bulk) return;
    let cancelled = false;
    const run = async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      try {
        const zip = new JSZip();
        for (const f of FORMAT_KEYS) {
          const node = bulkRefs.current[f];
          if (node) zip.file(`${slug}-${f}.png`, await renderGraphic(node));
        }
        if (!cancelled) downloadBlob(await zip.generateAsync({ type: "blob" }), `${slug}.zip`);
      } catch (e) {
        console.error("top ten zip", e);
        toast.error(t("admin.topten.exportError"));
      } finally {
        if (!cancelled) setBulk(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [bulk]); // eslint-disable-line react-hooks/exhaustive-deps

  const text = postText(data);
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t("admin.topten.copyError"));
    }
  };

  // The chosen list; heading, period and source line follow it unless they were written by hand
  const fill = async () => {
    if (filled > 0 && !window.confirm(t("admin.topten.autofillConfirm"))) return;
    setFilling(true);
    try {
      await loadLanguage(data.lang);
      const fixed = i18n.getFixedT(data.lang);
      const tr = (key: string, options?: Record<string, unknown>) => String(fixed(key, options));
      const { entries, comparedAt } = await autofill(source, data.lang, (count) => tr("admin.topten.reviewCount", { count }));
      const texts = autoTexts(source, data.lang, tr);
      setData((d) => {
        const own = (field: keyof typeof texts) => d[field] !== "" && d[field] !== d.auto?.[field];
        return {
          ...d,
          source: source.id,
          entries: [...entries, ...Array.from({ length: Math.max(0, MAX_ENTRIES - entries.length) }, newEntry)],
          title: own("title") ? d.title : texts.title,
          period: own("period") ? d.period : texts.period,
          footer: own("footer") ? d.footer : texts.footer,
          auto: texts,
        };
      });
      setCompared({ at: comparedAt });
    } catch (e) {
      if (e instanceof EmptyListError) toast.error(t("admin.topten.tooFew"));
      else {
        console.error("top ten autofill", e);
        toast.error(t("admin.topten.autofillError"));
      }
    } finally {
      setFilling(false);
    }
  };

  const hint = !compared
    ? t("admin.topten.autofillHint", { list: listName(source.kind), provider: PROVIDER_NAMES[source.provider] })
    : compared.at === null
      ? t("admin.topten.compareNone")
      : t("admin.topten.compareFrom", { date: new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "long" }).format(compared.at) });

  const reset = () => {
    if (!window.confirm(t("admin.topten.resetConfirm"))) return;
    setData(emptyTopTen(data.lang));
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ListOrdered className="h-5 w-5 text-primary" aria-hidden="true" /> {t("admin.topten.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("admin.topten.description")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-1.5">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t("admin.topten.reset")}
        </Button>
      </div>

      {/* grid-cols-1: the preview starts at a fixed width and must not widen the column on phones */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Editor */}
        <div className="space-y-6">
          <section className="grid content-start gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 sm:grid-cols-2" aria-label={t("admin.topten.settings")}>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="topten-title">{t("admin.topten.heading")}</Label>
              <Input id="topten-title" value={data.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("admin.topten.titlePlaceholder")} maxLength={60} />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="topten-period">{t("admin.topten.period")}</Label>
              <Input id="topten-period" value={data.period} onChange={(e) => set({ period: e.target.value })} placeholder={t("admin.topten.periodPlaceholder")} maxLength={60} />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="topten-footer">{t("admin.topten.footer")}</Label>
              <Input id="topten-footer" value={data.footer} onChange={(e) => set({ footer: e.target.value })} placeholder={t("admin.topten.footerPlaceholder")} maxLength={90} />
            </div>
            <div className="grid content-start gap-2">
              <Label>{t("admin.topten.world")}</Label>
              <Select
                value={data.world}
                onValueChange={(world) => {
                  set({ world: world as TopTenWorld, source: sourcesFor(world as TopTenWorld)[0].id });
                  setCompared(null);
                }}
              >
                <SelectTrigger aria-label={t("admin.topten.world")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORLDS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {t(`admin.topten.worlds.${w}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("admin.topten.worldHint")}</p>
            </div>
            <div className="grid content-start gap-2">
              <Label>{t("admin.topten.language")}</Label>
              <Select value={data.lang} onValueChange={(lang) => set({ lang })}>
                <SelectTrigger aria-label={t("admin.topten.language")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
              <Label htmlFor="topten-values" className="cursor-pointer">{t("admin.topten.showValues")}</Label>
              <Switch id="topten-values" checked={data.showValues !== false} onCheckedChange={(showValues) => set({ showValues })} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
              <Label htmlFor="topten-trends" className="cursor-pointer">{t("admin.topten.showTrends")}</Label>
              <Switch id="topten-trends" checked={data.showTrends !== false} onCheckedChange={(showTrends) => set({ showTrends })} />
            </div>
            <div className="grid content-start gap-2">
              <Label>{t("admin.topten.background")}</Label>
              <Select value={data.background ?? "glow"} onValueChange={(background) => set({ background: background as "glow" | "plain" })}>
                <SelectTrigger aria-label={t("admin.topten.background")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="glow">{t("admin.topten.backgrounds.glow")}</SelectItem>
                  <SelectItem value="plain">{t("admin.topten.backgrounds.plain")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid content-start gap-2">
              <span className="text-sm font-medium text-foreground">{t("admin.topten.accent")}</span>
              <div className="flex gap-2" role="radiogroup" aria-label={t("admin.topten.accent")}>
                {(Object.keys(ACCENTS) as Accent[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={data.accent === a}
                    aria-label={t(`admin.topten.accents.${a}`)}
                    title={t(`admin.topten.accents.${a}`)}
                    onClick={() => set({ accent: a })}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition-transform active:scale-95",
                      data.accent === a ? "border-foreground" : "border-transparent",
                    )}
                    style={{ background: ACCENTS[a] }}
                  />
                ))}
              </div>
            </div>
          </section>

          <section aria-label={t("admin.topten.entries")}>
            <div className="mb-4 grid gap-2 rounded-2xl border border-border/60 bg-card/40 p-4">
              <Label htmlFor="topten-source">{t("admin.topten.source")}</Label>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={source.id}
                  onValueChange={(id) => {
                    set({ source: id });
                    setCompared(null);
                  }}
                >
                  <SelectTrigger id="topten-source" className="min-w-0 flex-1 basis-56" aria-label={t("admin.topten.source")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourcesFor(data.world).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="text-muted-foreground">{PROVIDER_NAMES[s.provider]} · </span>
                        {listName(s.kind)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="secondary" onClick={fill} disabled={filling} className="gap-1.5">
                  {filling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {t("admin.topten.autofill")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite" data-testid="topten-source-hint">
                {hint}
              </p>
            </div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {t("admin.topten.entries")} <span className="font-normal text-muted-foreground">({filled}/10)</span>
            </h2>
            <ol className="grid gap-3" onDragEnd={() => setDragging(false)}>
              {data.entries.map((entry, i) => (
                <EntryEditor
                  key={entry.id}
                  entry={entry}
                  rank={i + 1}
                  world={data.world}
                  provider={source.provider === "criticore" ? sourcesFor(data.world)[0].provider : source.provider}
                  canUp={i > 0}
                  canDown={i < data.entries.length - 1}
                  onMove={(direction) => move(i, direction)}
                  onDragStart={() => {
                    dragFrom.current = i;
                    setDragging(true);
                  }}
                  onDrop={() => {
                    if (dragFrom.current !== null && dragFrom.current !== i) moveTo(dragFrom.current, i);
                    dragFrom.current = null;
                    setDragging(false);
                  }}
                  dropTarget={dragging}
                  onChange={(next) => setData((d) => ({ ...d, entries: d.entries.map((e, j) => (j === i ? next : e)) }))}
                />
              ))}
            </ol>
          </section>
        </div>

        {/* Preview */}
        <div className="space-y-3 lg:sticky lg:top-20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("admin.topten.format")}>
              {FORMAT_KEYS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={format === f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    format === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`admin.topten.formats.${f}`)} <span className="opacity-70">{FORMATS[f].width}×{FORMATS[f].height}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setBulk(true)} disabled={bulk || exporting || pending || filled === 0} className="gap-1.5">
                {bulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                {t("admin.topten.exportAll")}
              </Button>
              <Button type="button" onClick={exportPng} disabled={exporting || bulk || pending || filled === 0} className="gap-1.5">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? t("admin.topten.exporting") : t("admin.topten.export")}
              </Button>
            </div>
          </div>
          {format === "square" && filled > 5 && <p className="text-xs text-muted-foreground">{t("admin.topten.squareHint")}</p>}
          <div ref={frame} className="overflow-hidden rounded-xl border border-border/60 bg-muted/30">
            <div style={{ width: width * scale, height: height * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width, height }}>
                <TopTenCanvas ref={canvas} data={data} format={format} pictures={resolved} />
              </div>
            </div>
          </div>
          {filled === 0 && <p className="text-sm text-muted-foreground">{t("admin.topten.empty")}</p>}

          {filled > 0 && (
            <section className="grid gap-2 rounded-2xl border border-border/60 bg-card/40 p-4" aria-labelledby="topten-post-title">
              <div className="flex items-center justify-between gap-2">
                <h2 id="topten-post-title" className="text-sm font-semibold text-foreground">{t("admin.topten.postText")}</h2>
                <Button type="button" variant="secondary" size="sm" onClick={copyText} className="gap-1.5">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t("admin.topten.copied") : t("admin.topten.copy")}
                </Button>
              </div>
              <Textarea readOnly value={text} rows={8} className="font-mono text-xs" aria-labelledby="topten-post-title" data-testid="topten-post-text" />
            </section>
          )}
        </div>
      </div>
      {bulk && (
        <div aria-hidden="true" style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }}>
          {FORMAT_KEYS.map((f) => (
            <TopTenCanvas key={f} ref={(el) => (bulkRefs.current[f] = el)} data={data} format={f} pictures={resolved} />
          ))}
        </div>
      )}
    </div>
  );
}
