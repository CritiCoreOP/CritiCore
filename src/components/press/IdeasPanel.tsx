import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Link } from "@/lib/locale-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { articleLanguage } from "@/lib/press";
import { createIdea } from "@/lib/storyIdeas";
import { Lightbulb, PenLine, Plus, Sparkles, Wand2 } from "lucide-react";
import type { DashArticle } from "@/hooks/usePressDashboard";
import DashboardSection from "./DashboardSection";
import { focusRing } from "./styles";
import DiscoverIdeasDialog from "./DiscoverIdeasDialog";
import ExpandIdeaDialog from "./ExpandIdeaDialog";

interface Props {
  ideas: DashArticle[];
  userId: string;
  onChanged: () => void;
}

/** Note an idea in one line, get ideas from what is trending, grow an idea into a plan */
export default function IdeasPanel({ ideas, userId, onChanged }: Props) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [expanding, setExpanding] = useState<DashArticle | null>(null);

  const capture = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      await createIdea({ userId, title, language: articleLanguage(i18n.language) });
      setDraft("");
      toast.success(t("redaktion.dash.ideas.saved"));
      onChanged();
    } catch (err) {
      toast.error(t("redaktion.dash.ideas.saveError"), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardSection id="dash-ideas" title={t("redaktion.dash.ideas.title")}>
      <form onSubmit={capture} className="space-y-2">
        <Label htmlFor="dash-idea-input">{t("redaktion.dash.ideas.label")}</Label>
        <div className="flex gap-2">
          <Input
            id="dash-idea-input"
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("redaktion.dash.ideas.placeholder")}
          />
          <Button type="submit" size="icon" disabled={!draft.trim() || saving} aria-label={t("redaktion.dash.ideas.save")}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <Button variant="outline" size="sm" className="mt-3 w-full gap-1.5" onClick={() => setDiscoverOpen(true)}>
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        {t("redaktion.dash.discover.open")}
      </Button>

      {ideas.length === 0 ? (
        <p className="mt-4 flex gap-2 text-sm text-muted-foreground">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("redaktion.dash.ideas.empty")}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {ideas.slice(0, 6).map((idea) => (
            <li key={idea.id} className="rounded-xl border border-border/40 bg-background/40 p-3">
              <p className="text-sm font-medium leading-snug text-foreground">{idea.title}</p>
              {idea.excerpt && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{idea.excerpt}</p>}
              <div className="mt-2 flex gap-1">
                <Button size="sm" variant="secondary" className="h-7 gap-1.5 px-2.5 text-xs" onClick={() => setExpanding(idea)}>
                  <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("redaktion.dash.ideas.expand")}
                </Button>
                <Button asChild size="sm" variant="ghost" className="h-7 gap-1.5 px-2.5 text-xs">
                  <Link to={`/news/schreiben?edit=${idea.id}`} className={focusRing}>
                    <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("redaktion.dash.ideas.write")}
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {ideas.length > 6 && <p className="mt-2 text-xs text-muted-foreground">{t("redaktion.dash.pipeline.more", { count: ideas.length - 6 })}</p>}

      <DiscoverIdeasDialog open={discoverOpen} onOpenChange={setDiscoverOpen} userId={userId} onSaved={onChanged} />
      <ExpandIdeaDialog idea={expanding} onOpenChange={(open) => !open && setExpanding(null)} />
    </DashboardSection>
  );
}
