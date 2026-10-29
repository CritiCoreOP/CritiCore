import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNavigate } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { articleTypeLabel } from "@/lib/article-labels";
import { applyExpansion, expandIdea, type IdeaExpansion, type IdeaType } from "@/lib/storyIdeas";
import { ArrowRight, Copy, RefreshCw, Wand2 } from "lucide-react";
import type { DashArticle } from "@/hooks/usePressDashboard";
import { focusRing } from "./styles";

interface Props {
  idea: DashArticle | null;
  onOpenChange: (open: boolean) => void;
}

const TYPES: IdeaType[] = ["news", "review", "opinion"];

/** Turns a one-line idea into a headline, an angle, an outline and questions to research */
export default function ExpandIdeaDialog({ idea, onOpenChange }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<IdeaExpansion | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [headline, setHeadline] = useState(0);
  const [angle, setAngle] = useState(-1);
  const [type, setType] = useState<IdeaType>("news");
  const [applying, setApplying] = useState(false);

  const run = async (target: DashArticle) => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const result = await expandIdea({ title: target.title, note: target.excerpt }, i18n.language);
      setData(result);
      setHeadline(0);
      setAngle(-1);
      setType(result.type);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editor.ai.failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idea) run(idea);
    // A new idea starts a new expansion; the language is read when it runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea?.id]);

  // The author's own wording stays the first choice
  const headlines = idea && data ? [idea.title, ...data.headlines.filter((h) => h !== idea.title)] : [];

  const apply = async () => {
    if (!idea || !data) return;
    setApplying(true);
    try {
      const { data: row } = await supabase.from("articles").select("content").eq("id", idea.id).maybeSingle();
      await applyExpansion(
        idea.id,
        { headline: headlines[headline], type, outline: data.outline, pitch: angle >= 0 ? data.angles[angle].pitch : undefined },
        (row as { content?: string } | null)?.content ?? "",
      );
      onOpenChange(false);
      navigate(`/news/schreiben?edit=${idea.id}`);
    } catch (e) {
      toast.error(t("redaktion.dash.ideas.saveError"), { description: e instanceof Error ? e.message : undefined });
    } finally {
      setApplying(false);
    }
  };

  const copyQuestions = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.questions.map((q) => `- ${q}`).join("\n"));
      toast.success(t("redaktion.dash.expand.copied"));
    } catch {
      toast.error(t("editor.ai.failed"));
    }
  };

  const choice = (selected: boolean) =>
    cn(
      "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
      focusRing,
      selected ? "border-primary bg-primary/15 text-foreground" : "border-border/50 text-foreground/90 hover:border-primary/50",
    );

  return (
    <Dialog open={!!idea} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("redaktion.dash.expand.title")}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{idea?.title}</DialogDescription>
        </DialogHeader>

        <div aria-live="polite" aria-busy={loading}>
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {error && !loading && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
              <p>{error}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => idea && run(idea)}>
                {t("redaktion.dash.retry")}
              </Button>
            </div>
          )}
          {data && !loading && (
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-foreground">{t("redaktion.dash.expand.headline")}</legend>
                <div className="space-y-1.5">
                  {headlines.map((h, i) => (
                    <button key={i} type="button" aria-pressed={headline === i} onClick={() => setHeadline(i)} className={choice(headline === i)}>
                      {h}
                      {i === 0 && <span className="ml-2 text-xs text-muted-foreground">{t("redaktion.dash.expand.yours")}</span>}
                    </button>
                  ))}
                </div>
              </fieldset>

              {data.angles.length > 0 && (
                <fieldset>
                  <legend className="mb-1 text-sm font-semibold text-foreground">{t("redaktion.dash.expand.angle")}</legend>
                  <p className="mb-2 text-xs text-muted-foreground">{t("redaktion.dash.expand.angleHint")}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {data.angles.map((a, i) => (
                      <button key={i} type="button" aria-pressed={angle === i} onClick={() => setAngle(angle === i ? -1 : i)} className={choice(angle === i)}>
                        <span className="block font-medium">{a.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{a.pitch}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-foreground">{t("redaktion.dash.expand.type")}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((ty) => (
                    <button
                      key={ty}
                      type="button"
                      aria-pressed={type === ty}
                      onClick={() => setType(ty)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        focusRing,
                        type === ty ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {articleTypeLabel(t, ty)}
                    </button>
                  ))}
                </div>
              </fieldset>

              {data.outline.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{t("redaktion.dash.expand.outline")}</h3>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground/90">
                    {data.outline.map((o, i) => <li key={i}>{o}</li>)}
                  </ol>
                  <p className="mt-2 text-xs text-muted-foreground">{t("redaktion.dash.expand.outlineHint")}</p>
                </section>
              )}

              {data.questions.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{t("redaktion.dash.expand.questions")}</h3>
                    <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={copyQuestions}>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("redaktion.dash.expand.copy")}
                    </Button>
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
                    {data.questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        {data && !loading && (
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" className="gap-1.5" onClick={() => idea && run(idea)}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t("redaktion.dash.expand.again")}
            </Button>
            <Button className="gap-1.5" onClick={apply} disabled={applying}>
              {t("redaktion.dash.expand.apply")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
