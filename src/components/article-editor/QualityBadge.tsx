import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Crosshair,
  Info,
  Loader2,
  Meh,
  RefreshCw,
  Smile,
  Frown,
  Wand2,
} from "lucide-react";

export type QualityScore = "good" | "medium" | "bad" | null;

export interface QualityIssue {
  type: "spelling" | "grammar" | "style" | "structure" | "substance" | "voice";
  severity: "high" | "medium" | "low";
  /** Exact passage from the article, "" when the issue concerns the whole text */
  quote: string;
  suggestion: string;
  /** Replacement for `quote`, "" when the author has to decide */
  fix: string;
}

export interface QualityAnalysis {
  score: QualityScore;
  summary: string;
  // Since 2026-10-04; an older analyze-article answer only has reasons/ai_detected/spelling_issues
  strengths?: string[];
  dimensions?: Partial<Record<"correctness" | "clarity" | "structure" | "substance" | "voice", number>>;
  issues?: QualityIssue[];
  generic_phrasing?: boolean;
  reasons: string[];
  ai_detected: boolean;
  spelling_issues: number;
}

interface QualityBadgeProps {
  analysis: QualityAnalysis | null;
  loading: boolean;
  /** The text changed since this analysis */
  stale: boolean;
  /** Enough text to analyze */
  canAnalyze: boolean;
  onAnalyze: () => void;
  onImprove?: () => void;
  improving?: boolean;
  onJump: (quote: string) => boolean;
  onApply: (quote: string, fix: string) => boolean;
  /** Applies several fixes at once; returns the indexes that were applied */
  onApplyAll?: (fixes: { index: number; quote: string; fix: string }[]) => number[];
}

const SCORE = {
  good: { icon: Smile, text: "text-score-high", box: "border-score-high/30 bg-score-high/10" },
  medium: { icon: Meh, text: "text-yellow-500", box: "border-yellow-500/30 bg-yellow-500/10" },
  bad: { icon: Frown, text: "text-destructive", box: "border-destructive/30 bg-destructive/10" },
} as const;

const SEVERITY_DOT = { high: "bg-destructive", medium: "bg-yellow-500", low: "bg-muted-foreground/60" } as const;
const DIMENSIONS = ["correctness", "clarity", "structure", "substance", "voice"] as const;

/** 1 to 5 as five small segments; the number stays readable next to it */
function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("h-1.5 w-5 rounded-full", n <= value ? "bg-primary" : "bg-border")} />
        ))}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{value}/5</span>
    </div>
  );
}

export default function QualityBadge({ analysis, loading, stale, canAnalyze, onAnalyze, onImprove, improving, onJump, onApply, onApplyAll }: QualityBadgeProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  // A new analysis has new issues; "applied" marks belong to the old list
  useEffect(() => setApplied(new Set()), [analysis]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1" role="status">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">{t("article.quality.analyzing")}</span>
      </div>
    );
  }

  if (!analysis?.score) {
    if (!canAnalyze) return null;
    return (
      <Button type="button" variant="ghost" size="sm" onClick={onAnalyze} className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground">
        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        {t("article.quality.check")}
      </Button>
    );
  }

  const config = SCORE[analysis.score];
  const Icon = config.icon;
  const issues = analysis.issues ?? [];
  const openIssues = issues.filter((_, i) => !applied.has(i)).length;
  const dims = analysis.dimensions;
  const generic = analysis.generic_phrasing ?? analysis.ai_detected;
  const directFixes = issues.flatMap((issue, index) => (issue.quote && issue.fix && !applied.has(index) ? [{ index, quote: issue.quote, fix: issue.fix }] : []));

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn("relative flex items-center gap-1.5 rounded-md border px-2 py-1 transition-opacity hover:opacity-80", config.box, stale && "opacity-70")}
            >
              <Icon className={cn("h-4 w-4", config.text)} aria-hidden="true" />
              <span className={cn("text-xs font-medium", config.text)}>{t(`article.quality.${analysis.score}`)}</span>
              {openIssues > 0 && (
                <span className="rounded-full bg-background/70 px-1.5 text-[10px] font-semibold tabular-nums text-foreground">{openIssues}</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{analysis.summary}</p>
            {stale && <p className="mt-1 text-xs text-muted-foreground">{t("article.quality.staleShort")}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={cn("h-5 w-5", config.text)} aria-hidden="true" />
              {t("article.quality.title")}
            </DialogTitle>
            <DialogDescription className="sr-only">{t("article.quality.description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className={cn("rounded-xl border p-4", config.box)}>
              <p className={cn("font-semibold", config.text)}>{t(`article.quality.${analysis.score}`)}</p>
              {analysis.summary && <p className="mt-1 text-sm text-foreground/85">{analysis.summary}</p>}
              {analysis.score === "bad" && <p className="mt-2 text-xs text-destructive">{t("article.quality.cannotPublish")}</p>}
            </div>

            {stale && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">{t("article.quality.stale")}</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={onAnalyze}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t("article.quality.recheck")}
                </Button>
              </div>
            )}

            {dims && (
              <section aria-labelledby="quality-dims" className="space-y-2">
                <h3 id="quality-dims" className="text-sm font-semibold text-foreground">{t("article.quality.dimensionsTitle")}</h3>
                {DIMENSIONS.map((d) => (dims[d] ? <Meter key={d} value={dims[d]!} label={t(`article.quality.dimension.${d}`)} /> : null))}
              </section>
            )}

            {!!analysis.strengths?.length && (
              <section aria-labelledby="quality-strengths" className="space-y-2">
                <h3 id="quality-strengths" className="text-sm font-semibold text-foreground">{t("article.quality.strengths")}</h3>
                <ul className="space-y-1.5">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-score-high" aria-hidden="true" />
                      {s}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {generic && (
              <p className="flex gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-foreground/85">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {t("article.quality.generic")}
              </p>
            )}

            {issues.length > 0 ? (
              <section aria-labelledby="quality-issues" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="quality-issues" className="text-sm font-semibold text-foreground">
                    {t("article.quality.issuesTitle", { count: issues.length })}
                  </h3>
                  {onApplyAll && directFixes.length > 1 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => {
                        const done = onApplyAll(directFixes);
                        if (done.length) setApplied((s) => new Set([...s, ...done]));
                      }}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("article.quality.applyAll", { count: directFixes.length })}
                    </Button>
                  )}
                </div>
                <ol className="space-y-2">
                  {issues.map((issue, i) => {
                    const done = applied.has(i);
                    return (
                      <li key={i} className={cn("rounded-xl border border-border/50 bg-card/40 p-3", done && "opacity-60")}>
                        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <span className={cn("h-2 w-2 rounded-full", SEVERITY_DOT[issue.severity])} aria-hidden="true" />
                          {t(`article.quality.type.${issue.type}`)}
                          <span className="sr-only">, {t(`article.quality.severity.${issue.severity}`)}</span>
                        </p>
                        {issue.quote && (
                          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span className={cn("rounded bg-muted/60 px-1.5 py-0.5 italic", issue.fix && "line-through decoration-destructive/70")}>{issue.quote}</span>
                            {issue.fix && (
                              <>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                <span className="rounded bg-score-high/10 px-1.5 py-0.5 text-score-high">{issue.fix}</span>
                              </>
                            )}
                          </p>
                        )}
                        <p className="mt-2 text-sm text-foreground/85">{issue.suggestion}</p>
                        {issue.quote && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {issue.fix && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 gap-1.5 text-xs"
                                disabled={done}
                                onClick={() => {
                                  if (onApply(issue.quote, issue.fix)) setApplied((s) => new Set(s).add(i));
                                }}
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                {done ? t("article.quality.applied") : t("article.quality.apply")}
                              </Button>
                            )}
                            {!done && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1.5 text-xs"
                                onClick={() => {
                                  if (onJump(issue.quote)) setOpen(false);
                                }}
                              >
                                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("article.quality.jump")}
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : (
              // Answer of an older analyze-article version: plain reasons only
              analysis.reasons.length > 0 && (
                <ul className="space-y-1.5">
                  {analysis.reasons.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{r}</li>
                  ))}
                </ul>
              )
            )}

            <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
              {!stale && (
                <Button variant="outline" className="gap-1.5" onClick={onAnalyze}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t("article.quality.recheck")}
                </Button>
              )}
              {analysis.score !== "good" && onImprove && (
                <Button
                  className="gap-1.5"
                  disabled={improving}
                  onClick={() => {
                    setOpen(false);
                    onImprove();
                  }}
                >
                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                  {improving ? t("article.quality.improving") : t("article.quality.improve")}
                </Button>
              )}
            </div>
            {analysis.score !== "good" && onImprove && <p className="-mt-3 text-xs text-muted-foreground">{t("article.quality.improveHint")}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
