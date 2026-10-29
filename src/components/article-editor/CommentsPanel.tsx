import { useState, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CheckCircle2 as CheckCircleTwoTone, Trash as DeleteTwoTone, Lock as LockTwoTone, AlertTriangle as WarningAmberTwoTone, MessageSquarePlus as AddCommentTwoTone, MessageCircle as CommentTwoTone } from "lucide-react";

interface CommentRow {
  id: string;
  anchor_id: string;
  quoted_text: string;
  body: string;
  resolved: boolean;
  author_id: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

interface CommentsPanelProps {
  articleId: string | null;
  userId: string | undefined;
  editor: Editor | null;
}

const genAnchor = () =>
  `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const getOverlappingAnchors = (editor: Editor, from: number, to: number) => {
  const anchors = new Set<string>();
  const markType = editor.state.schema.marks.commentMark;
  if (!markType) return anchors;
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return;
    node.marks.forEach((m) => {
      if (m.type === markType && m.attrs.commentId) anchors.add(m.attrs.commentId as string);
    });
  });
  return anchors;
};

const CommentsPanel = ({ articleId, userId, editor }: CommentsPanelProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newBody, setNewBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectionText, setSelectionText] = useState("");
  const [overlaps, setOverlaps] = useState(false);

  const load = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("article_comments")
        .select("id, anchor_id, quoted_text, body, resolved, author_id, created_at")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false });

      if (!data) {
        setComments([]);
        return;
      }
      const authorIds = [...new Set(data.map((c) => c.author_id))];
      let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (authorIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", authorIds);
        profileMap = (profiles || []).reduce((acc: Record<string, { display_name: string | null; avatar_url: string | null }>, p) => {
          acc[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          return acc;
        }, {});
      }
      setComments(data.map((c) => ({ ...c, profile: profileMap[c.author_id] })));
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelectionText("");
        setOverlaps(false);
        return;
      }
      setSelectionText(editor.state.doc.textBetween(from, to, " "));
      setOverlaps(getOverlappingAnchors(editor, from, to).size > 0);
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const addComment = async () => {
    if (!editor || !articleId || !userId) {
      toast.error(t("workflow.articleNotSaved"));
      return;
    }
    const { from, to } = editor.state.selection;
    const quoted = editor.state.doc.textBetween(from, to, " ").trim();
    if (!quoted) {
      toast.error(t("workflow.selectTextFirst"));
      return;
    }
    if (getOverlappingAnchors(editor, from, to).size > 0) {
      toast.error(t("workflow.overlapError"));
      return;
    }
    if (!newBody.trim()) return;
    setBusy(true);
    const anchorId = genAnchor();
    const { error } = await supabase.from("article_comments").insert({
      article_id: articleId,
      author_id: userId,
      anchor_id: anchorId,
      quoted_text: quoted.slice(0, 500),
      body: newBody.trim(),
    } as never);
    setBusy(false);
    if (error) {
      toast.error(t("workflow.commentError"));
      return;
    }
    editor.chain().focus().setCommentMark(anchorId).run();
    setNewBody("");
    toast.success(t("workflow.commentAdded"));
    load();
  };

  const scrollToComment = (anchorId: string) => {
    if (!editor) return;
    const el = editor.view.dom.querySelector(`[data-comment-id="${anchorId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "rounded-sm");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary", "rounded-sm"), 1500);
    } else {
      toast.message(t("workflow.overlapWarning"), { description: "" });
    }
  };

  const resolveComment = async (c: CommentRow) => {
    if (!userId) return;
    const { error } = await supabase
      .from("article_comments")
      .update({ resolved: true, resolved_by: userId, resolved_at: new Date().toISOString() } as never)
      .eq("id", c.id);
    if (error) {
      toast.error(t("workflow.commentError"));
      return;
    }
    editor?.chain().focus().unsetCommentMark(c.anchor_id).run();
    toast.success(t("workflow.commentResolved"));
    load();
  };

  const deleteComment = async (c: CommentRow) => {
    const { error } = await supabase.from("article_comments").delete().eq("id", c.id);
    if (error) {
      toast.error(t("workflow.commentError"));
      return;
    }
    editor?.chain().focus().unsetCommentMark(c.anchor_id).run();
    load();
  };

  const openComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);
  const openCount = openComments.length;

  const canAdd = !!articleId && !!userId && !!selectionText.trim() && !overlaps && !!newBody.trim();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 relative focus-visible:ring-2 focus-visible:ring-primary" aria-label={t("workflow.comments")} title={t("workflow.comments")}>
          <CommentTwoTone className="w-4 h-4" />
          {openCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
              {openCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CommentTwoTone className="w-5 h-5 text-primary" />
            {t("workflow.comments")}
          </SheetTitle>
        </SheetHeader>

        {!articleId ? (
          <div className="mt-4 rounded-xl border border-border/50 bg-card/40 p-4 flex items-start gap-2 text-sm text-muted-foreground">
            <LockTwoTone className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t("workflow.articleNotSaved")}</span>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border/50 bg-card/40 p-3 space-y-2">
            {selectionText.trim() ? (
              <p className="text-xs text-muted-foreground line-clamp-2 italic border-l-2 border-primary pl-2">
                “{selectionText}”
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("workflow.selectTextHint")}</p>
            )}
            {overlaps && (
              <p className="text-xs text-amber-500 flex items-center gap-1.5">
                <WarningAmberTwoTone className="w-4 h-4 shrink-0" />
                {t("workflow.overlapWarning")}
              </p>
            )}
            <Textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder={t("workflow.commentPlaceholder")}
              rows={2}
              className="resize-none focus-visible:ring-2 focus-visible:ring-primary"
              disabled={busy}
            />
            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={busy || !canAdd}
              onClick={addComment}
            >
              <AddCommentTwoTone className="w-4 h-4" />
              {t("workflow.addComment")}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1" aria-busy={loading}>
          {loading ? (
            <ul className="space-y-3 list-none p-0 m-0">
              {[0, 1, 2].map((i) => (
                <li key={i} className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex justify-between pt-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <ul className="space-y-3 list-none p-0 m-0" aria-label={t("workflow.openComments")}>
                {openComments.map((c) => (
                  <li key={c.id} className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2">
                    <button
                      onClick={() => scrollToComment(c.anchor_id)}
                      className="text-left text-xs text-muted-foreground italic border-l-2 border-primary/60 pl-2 line-clamp-2 hover:text-foreground w-full focus-visible:underline outline-none"
                    >
                      “{c.quoted_text}”
                    </button>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {c.profile?.display_name || t("article.unknownAuthor")}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-green-500" onClick={() => resolveComment(c)}>
                          <CheckCircleTwoTone className="w-4 h-4" />
                          {t("workflow.resolve")}
                        </Button>
                        {c.author_id === userId && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteComment(c)} aria-label={t("workflow.deleteComment")}>
                            <DeleteTwoTone className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {openComments.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-10 px-4 gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CommentTwoTone className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {resolvedComments.length > 0 ? t("workflow.allResolved") : t("workflow.noComments")}
                  </p>
                  {resolvedComments.length === 0 && (
                    <p className="text-xs text-muted-foreground max-w-[15rem]">{t("workflow.noCommentsHint")}</p>
                  )}
                </div>
              )}

              {resolvedComments.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <CheckCircleTwoTone className="w-4 h-4" />
                    {t("workflow.resolved")} ({resolvedComments.length})
                  </p>
                  <ul className="list-none p-0 m-0 space-y-2" aria-label={t("workflow.resolvedComments")}>
                    {resolvedComments.map((c) => (
                      <li key={c.id} className="rounded-lg border border-border/30 bg-muted/20 p-2.5 opacity-70">
                        <p className="text-xs text-muted-foreground line-through line-clamp-1">“{c.quoted_text}”</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.body}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="outline" className="text-[10px]">{t("workflow.resolved")}</Badge>
                          {c.author_id === userId && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70" onClick={() => deleteComment(c)} aria-label={t("workflow.deleteComment")}>
                              <DeleteTwoTone className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CommentsPanel;
