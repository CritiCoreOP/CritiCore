import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { articleTypeLabel } from "@/lib/article-labels";
import { articleLanguage } from "@/lib/press";
import { createIdea, discoverIdeas, KIND_CATEGORY, trendingReleases, type DiscoveredIdea, type ReleaseKind } from "@/lib/storyIdeas";
import { Bookmark, BookmarkCheck, RefreshCw, Sparkles } from "lucide-react";
import { focusRing } from "./styles";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved: () => void;
}

const FOCUS: ("all" | ReleaseKind)[] = ["all", "movie", "series", "game", "anime"];
const ALL_KINDS: ReleaseKind[] = ["movie", "series", "game", "anime"];

/** Article ideas about what is trending on CritiCore right now */
export default function DiscoverIdeasDialog({ open, onOpenChange, userId, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const [focus, setFocus] = useState<"all" | ReleaseKind>("all");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [ideas, setIdeas] = useState<DiscoveredIdea[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const run = async () => {
    setState("loading");
    setSaved(new Set());
    try {
      const releases = await trendingReleases(focus === "all" ? ALL_KINDS : [focus]);
      if (!releases.length) throw new Error(t("redaktion.dash.discover.noTrends"));
      setIdeas(await discoverIdeas(releases, i18n.language));
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editor.ai.failed"));
      setState("error");
    }
  };

  const save = async (idea: DiscoveredIdea, index: number) => {
    try {
      await createIdea({
        userId,
        title: idea.headline,
        pitch: idea.pitch,
        articleType: idea.type,
        category: KIND_CATEGORY[idea.kind],
        language: articleLanguage(i18n.language),
      });
      setSaved((s) => new Set(s).add(index));
      toast.success(t("redaktion.dash.ideas.saved"));
      onSaved();
    } catch (e) {
      toast.error(t("redaktion.dash.ideas.saveError"), { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("redaktion.dash.discover.title")}
          </DialogTitle>
          <DialogDescription>{t("redaktion.dash.discover.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("redaktion.dash.discover.focus")}>
            {FOCUS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={focus === f}
                onClick={() => setFocus(f)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  focusRing,
                  focus === f ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`redaktion.dash.discover.kind.${f}`)}
              </button>
            ))}
          </div>
          <Button size="sm" className="ml-auto gap-1.5" onClick={run} disabled={state === "loading"}>
            {state === "done" ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {state === "done" ? t("redaktion.dash.discover.again") : t("redaktion.dash.discover.run")}
          </Button>
        </div>

        <div aria-live="polite" aria-busy={state === "loading"}>
          {state === "idle" && <p className="py-6 text-center text-sm text-muted-foreground">{t("redaktion.dash.discover.hint")}</p>}
          {state === "loading" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-border/40 p-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          )}
          {state === "error" && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
              <p>{error}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={run}>
                {t("redaktion.dash.retry")}
              </Button>
            </div>
          )}
          {state === "done" && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {ideas.map((idea, i) => (
                <li key={i} className="flex flex-col rounded-xl border border-border/50 bg-background/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    {t(`redaktion.dash.discover.kindOne.${idea.kind}`)} · {idea.title}
                  </p>
                  <h3 className="mt-1.5 font-semibold leading-snug text-foreground">{idea.headline}</h3>
                  {idea.pitch && <p className="mt-1 flex-1 text-sm text-muted-foreground">{idea.pitch}</p>}
                  <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{articleTypeLabel(t, idea.type)}</span>
                  <Button
                    size="sm"
                    variant={saved.has(i) ? "secondary" : "outline"}
                    className="gap-1.5"
                    disabled={saved.has(i)}
                    onClick={() => save(idea, i)}
                  >
                    {saved.has(i) ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
                    {saved.has(i) ? t("redaktion.dash.ideas.savedShort") : t("redaktion.dash.ideas.save")}
                  </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("redaktion.dash.discover.factsNote")}</p>
      </DialogContent>
    </Dialog>
  );
}
