import { useEffect, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/edge-function-error";
import { sanitizeHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, Loader2, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import { getAiTarget } from "./AiTarget";
import { passageHtml, replaceWithHtml, trimmedSelection } from "./aiPassage";
import type { TextRange } from "./textRange";

type MetaAction = "headline" | "teaser" | "seo";
type PassageAction = "rewrite" | "shorten" | "expand" | "proofread";
type Action = MetaAction | PassageAction;

interface Props {
  editor: Editor | null;
  title: string;
  setTitle: (v: string) => void;
  excerpt: string;
  setExcerpt: (v: string) => void;
  language: string;
  articleType: string;
  /** The panel is visible; the passage highlight only shows then */
  active?: boolean;
}

type Result =
  | { kind: "options"; action: "headline" | "teaser"; options: string[]; picked: number | null }
  | { kind: "seo"; title: string; description: string; picked: ("title" | "description")[] }
  | { kind: "passage"; action: PassageAction; html: string; range: TextRange; sourceHtml: string; sourceText: string; lostLinks: number };

const META_ACTIONS: MetaAction[] = ["headline", "teaser", "seo"];
const PASSAGE_ACTIONS: PassageAction[] = ["rewrite", "shorten", "expand", "proofread"];
/** Search results cut titles and descriptions off at about these lengths */
const LIMITS = { headline: 70, teaser: 300, title: 60, description: 155 };

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const htmlWords = (html: string) => countWords(new DOMParser().parseFromString(html, "text/html").body.textContent ?? "");

/** Answer of the ai-editor-assist version before 2026-10-05: one numbered list or a JSON string in `output` */
const legacyOptions = (output: unknown) =>
  typeof output === "string" ? output.split("\n").map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean) : [];

function Count({ value, limit }: { value: number; limit: number }) {
  return <span className={cn("tabular-nums", value > limit ? "text-amber-400" : "text-muted-foreground")}>{value}/{limit}</span>;
}

export default function AssistantPanel({ editor, title, setTitle, excerpt, setExcerpt, language, articleType, active = true }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Action | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const selectedWords =
    useEditorState({
      editor,
      selector: ({ editor: e }) => {
        if (!e || e.isDestroyed) return 0;
        const { from, to } = e.state.selection;
        return from === to ? 0 : countWords(e.state.doc.textBetween(from, to, " "));
      },
    }) ?? 0;

  // The passage an open suggestion will replace stays highlighted while the focus is in this panel
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.commands.setAiTarget(active && result?.kind === "passage" ? result.range : null);
  }, [editor, result, active]);
  useEffect(() => () => {
    if (editor && !editor.isDestroyed) editor.commands.setAiTarget(null);
  }, [editor]);

  const run = async (action: Action, again?: Result | null) => {
    if (!editor) return;
    const article = editor.getText({ blockSeparator: "\n\n" }).trim();
    if (!article) {
      toast.error(t("editor.ai.noContent"));
      return;
    }

    let body: Record<string, unknown> = { action, language, articleType, title, excerpt, article: article.slice(0, 12_000) };
    let passage: Extract<Result, { kind: "passage" }> | null = null;
    if ((PASSAGE_ACTIONS as Action[]).includes(action)) {
      // "New suggestion" works on the same passage, wherever edits have moved it
      const range = again?.kind === "passage" ? (getAiTarget(editor.state) ?? again.range) : trimmedSelection(editor);
      if (range.from >= range.to) {
        toast.error(t("editor.ai.noSelection"));
        return;
      }
      const sourceHtml = again?.kind === "passage" ? again.sourceHtml : passageHtml(editor, range);
      const sourceText = editor.state.doc.textBetween(range.from, range.to, "\n\n");
      body = { ...body, format: "html", input: sourceHtml };
      passage = { kind: "passage", action: action as PassageAction, html: "", range, sourceHtml, sourceText, lostLinks: 0 };
    }

    setBusy(action);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-editor-assist", { body });
      if (error) throw new Error(await edgeFunctionErrorMessage(error, t("editor.ai.failed")));
      if (data?.error) throw new Error(data.error);

      if (action === "headline" || action === "teaser") {
        const options: string[] = Array.isArray(data?.options) ? data.options.filter((o: unknown) => typeof o === "string" && o.trim()) : legacyOptions(data?.output);
        if (!options.length) throw new Error(t("editor.ai.failed"));
        setResult({ kind: "options", action, options, picked: null });
      } else if (action === "seo") {
        let seo = { title: data?.title ?? "", description: data?.description ?? "" };
        if (!seo.title && !seo.description && typeof data?.output === "string") {
          try {
            seo = { ...seo, ...JSON.parse(data.output.match(/\{[\s\S]*\}/)?.[0] ?? "{}") };
          } catch {
            // handled below
          }
        }
        if (!seo.title && !seo.description) throw new Error(t("editor.ai.failed"));
        setResult({ kind: "seo", title: String(seo.title), description: String(seo.description), picked: [] });
      } else if (passage) {
        const html = String(data?.output ?? "").trim();
        if (!html) throw new Error(t("editor.ai.failed"));
        setResult({ ...passage, html, lostLinks: Number(data?.lostLinks) || 0 });
      }
    } catch (e: unknown) {
      toast.error(t("editor.ai.failed"), { description: e instanceof Error && e.message !== t("editor.ai.failed") ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const pickOption = (r: Extract<Result, { kind: "options" }>, index: number) => {
    if (r.action === "headline") setTitle(r.options[index]);
    else setExcerpt(r.options[index]);
    toast.success(t(r.action === "headline" ? "editor.ai.titleApplied" : "editor.ai.teaserApplied"));
    setResult({ ...r, picked: index });
  };

  const pickSeo = (r: Extract<Result, { kind: "seo" }>, field: "title" | "description") => {
    if (field === "title") setTitle(r.title);
    else setExcerpt(r.description);
    toast.success(t(field === "title" ? "editor.ai.titleApplied" : "editor.ai.teaserApplied"));
    setResult({ ...r, picked: [...r.picked, field] });
  };

  const applyPassage = (r: Extract<Result, { kind: "passage" }>) => {
    if (!editor) return;
    const range = getAiTarget(editor.state) ?? r.range;
    // Typed into the passage since: replacing would throw those edits away
    if (editor.state.doc.textBetween(range.from, range.to, "\n\n") !== r.sourceText) {
      toast.error(t("editor.ai.selectionChanged"));
      return;
    }
    if (!replaceWithHtml(editor, range, r.html)) {
      toast.error(t("editor.ai.failed"));
      return;
    }
    editor.commands.focus();
    setResult(null);
    toast.success(t("editor.ai.replaced"), { action: { label: t("editor.ai.undo"), onClick: () => editor.commands.undo() } });
  };

  const actionButton = (key: Action, disabled = false) => (
    <button
      key={key}
      type="button"
      onClick={() => run(key)}
      disabled={busy !== null || disabled}
      className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        {busy === key ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4 text-primary" aria-hidden="true" />}
        {t(`editor.ai.actions.${key}.label`)}
      </span>
      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{t(`editor.ai.actions.${key}.description`)}</span>
    </button>
  );

  return (
    <div className="space-y-5">
      <p className="text-xs leading-snug text-muted-foreground">{t("editor.ai.intro")}</p>

      {result && (
        <section className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-3" aria-live="polite" aria-label={t("editor.ai.suggestion")}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t(`editor.ai.actions.${result.kind === "seo" ? "seo" : result.action}.label`)}
            <button
              type="button"
              onClick={() => setResult(null)}
              className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={t("editor.ai.discard")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {result.kind === "options" && (
            <ol className="space-y-1.5">
              {result.options.map((option, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => pickOption(result, i)}
                    aria-pressed={result.picked === i}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      result.picked === i ? "border-primary bg-primary/15 text-foreground" : "border-border/60 bg-background/60 text-foreground/90 hover:border-primary/60",
                    )}
                  >
                    <span className="block">{option}</span>
                    <span className="mt-1 flex items-center justify-between text-[11px]">
                      <Count value={option.length} limit={LIMITS[result.action]} />
                      {result.picked === i && (
                        <span className="flex items-center gap-1 text-primary">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          {t("editor.ai.applied")}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {result.kind === "seo" &&
            (["title", "description"] as const).map((field) =>
              result[field] ? (
                <div key={field} className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-2.5">
                  <p className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    {t(field === "title" ? "editor.ai.seoTitle" : "editor.ai.seoDescription")}
                    <Count value={result[field].length} limit={LIMITS[field]} />
                  </p>
                  <p className="text-sm text-foreground">{result[field]}</p>
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" disabled={result.picked.includes(field)} onClick={() => pickSeo(result, field)}>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {result.picked.includes(field) ? t("editor.ai.applied") : t(field === "title" ? "editor.ai.applyAsTitle" : "editor.ai.applyAsTeaser")}
                  </Button>
                </div>
              ) : null,
            )}

          {result.kind === "passage" && (
            <>
              <div
                className="prose prose-invert prose-sm max-h-72 max-w-none overflow-y-auto rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(result.html) }}
              />
              <p className="text-[11px] text-muted-foreground">
                {t("editor.ai.wordsChange", { from: countWords(result.sourceText), to: htmlWords(result.html) })}
              </p>
              {result.lostLinks > 0 && (
                <p className="flex gap-1.5 text-xs text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {t("editor.ai.lostLinks", { count: result.lostLinks })}
                </p>
              )}
              <Button size="sm" className="w-full gap-1.5" onClick={() => applyPassage(result)}>
                <Check className="h-4 w-4" aria-hidden="true" />
                {t("editor.ai.replace")}
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="w-full gap-1.5 text-xs"
            disabled={busy !== null}
            onClick={() => run(result.kind === "seo" ? "seo" : result.action, result)}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("editor.ai.regenerate")}
          </Button>
        </section>
      )}

      <section className="space-y-2" aria-labelledby="ai-group-meta">
        <h3 id="ai-group-meta" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("editor.ai.groupMeta")}</h3>
        {META_ACTIONS.map((key) => actionButton(key))}
      </section>

      <section className="space-y-2" aria-labelledby="ai-group-passage">
        <h3 id="ai-group-passage" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("editor.ai.groupPassage")}</h3>
        <p className={cn("text-xs", selectedWords ? "text-primary" : "text-muted-foreground")} aria-live="polite">
          {selectedWords ? t("editor.ai.selectionWords", { count: selectedWords }) : t("editor.ai.selectionNone")}
        </p>
        {PASSAGE_ACTIONS.map((key) => actionButton(key, !selectedWords))}
      </section>
    </div>
  );
}
