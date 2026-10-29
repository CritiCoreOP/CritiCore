import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { normalizeUrl } from "./utils";
import { Plus as AddTwoTone, X as CloseTwoTone, Trash as DeleteTwoTone, Link as LinkTwoTone, ClipboardList as AssignmentTwoTone, Calendar as EventTwoTone } from "lucide-react";

interface BriefingLink {
  label: string;
  url: string;
}

interface BriefingRow {
  id: string;
  body: string;
  links: BriefingLink[];
  deadline: string | null;
  author_id: string;
  created_at: string;
}

interface ArticleBriefingsPanelProps {
  articleId: string | null;
  userId: string | undefined;
}

const ArticleBriefingsPanel = ({ articleId, userId }: ArticleBriefingsPanelProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [body, setBody] = useState("");
  const [deadline, setDeadline] = useState("");
  const [links, setLinks] = useState<BriefingLink[]>([]);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!articleId) return;
    const { data } = await supabase
      .from("article_briefings")
      .select("id, body, links, deadline, author_id, created_at")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false });
    if (data) {
      setBriefings(
        data.map((b) => ({
          ...b,
          // Links already stored may predate the URL check; drop anything that is not http(s)
          links: (Array.isArray(b.links) ? (b.links as unknown as BriefingLink[]) : [])
            .map((l) => ({ ...l, url: normalizeUrl(String(l?.url ?? "")) ?? "" }))
            .filter((l) => l.url),
        })),
      );
    }
  }, [articleId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const addLink = () => {
    if (!linkUrl.trim()) return;
    // Only http(s): a javascript: link would run in the session of whoever clicks it
    const url = normalizeUrl(linkUrl);
    if (!url) {
      toast.error(t("workflow.invalidUrl"));
      return;
    }
    setLinks((prev) => [...prev, { label: linkLabel.trim() || url, url }]);
    setLinkLabel("");
    setLinkUrl("");
  };

  const saveBriefing = async () => {
    if (!articleId || !userId) {
      toast.error(t("workflow.saveArticleFirst"));
      return;
    }
    if (!body.trim() && links.length === 0 && !deadline) return;
    setBusy(true);
    const { error } = await supabase.from("article_briefings").insert({
      article_id: articleId,
      author_id: userId,
      body: body.trim(),
      links: links as never,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    } as never);
    setBusy(false);
    if (error) {
      toast.error(t("workflow.briefingError"));
      return;
    }
    setBody("");
    setDeadline("");
    setLinks([]);
    toast.success(t("workflow.briefingAdded"));
    load();
  };

  const deleteBriefing = async (id: string) => {
    const { error } = await supabase.from("article_briefings").delete().eq("id", id);
    if (error) {
      toast.error(t("workflow.briefingError"));
      return;
    }
    load();
  };

  const formatDeadline = (iso: string) => {
    const d = new Date(iso);
    const overdue = d.getTime() < Date.now();
    return { text: d.toLocaleDateString(), overdue };
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title={t("workflow.briefings")}>
          <AssignmentTwoTone className="w-4 h-4" />
          <span className="sr-only">{t("workflow.briefings")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AssignmentTwoTone className="w-5 h-5 text-primary" />
            {t("workflow.briefings")}
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">{t("workflow.briefingsDesc")}</p>
        </SheetHeader>

        {/* Composer */}
        <div className="mt-4 rounded-xl border border-border/50 bg-card/40 p-3 space-y-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("workflow.briefingPlaceholder")}
            rows={3}
            className="resize-none"
          />

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <EventTwoTone className="w-4 h-4" /> {t("workflow.deadline")}
            </label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <LinkTwoTone className="w-4 h-4" /> {t("workflow.researchLinks")}
            </label>
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1">
                <span className="truncate flex-1">{l.label}</span>
                <button
                  type="button"
                  onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                  aria-label={t("article.linkDialog.remove")}
                  className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <CloseTwoTone className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
            <div className="flex gap-1.5">
              <Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder={t("workflow.linkLabel")} className="text-xs h-8" />
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                placeholder="https://…"
                inputMode="url"
                aria-label="URL"
                className="text-xs h-8"
              />
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={addLink} aria-label={t("workflow.researchLinks")}>
                <AddTwoTone className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button size="sm" className="w-full gap-1.5" disabled={busy} onClick={saveBriefing}>
            <AddTwoTone className="w-4 h-4" />
            {t("workflow.addBriefing")}
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
          {briefings.map((b) => (
            <div key={b.id} className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2">
              {b.body && <p className="text-sm text-foreground whitespace-pre-wrap">{b.body}</p>}
              {b.deadline && (
                <Badge
                  variant={formatDeadline(b.deadline).overdue ? "destructive" : "secondary"}
                  className="gap-1 text-[11px]"
                >
                  <EventTwoTone className="w-3.5 h-3.5" />
                  {formatDeadline(b.deadline).text}
                </Badge>
              )}
              {b.links.length > 0 && (
                <div className="space-y-1">
                  {b.links.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate"
                    >
                      <LinkTwoTone className="w-3.5 h-3.5 shrink-0" />
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBriefing(b.id)} aria-label={t("common.delete")}>
                  <DeleteTwoTone className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {briefings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t("workflow.noBriefings")}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ArticleBriefingsPanel;
