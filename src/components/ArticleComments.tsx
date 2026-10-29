import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/locale";
import { toast } from "sonner";
import { Link } from "@/lib/locale-router";
import { Trash as DeleteTwoTone } from "lucide-react";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
}

interface ArticleCommentsProps {
  articleId: string;
}

const ArticleComments = ({ articleId }: ArticleCommentsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadComments(); }, [articleId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("target_type", "article")
      .eq("target_id", articleId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (profiles) for (const p of profiles) profileMap[p.user_id] = p;
      setComments(data.map(c => ({ ...c, profile: profileMap[c.user_id] || null })));
    } else {
      setComments([]);
    }
  };

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      target_type: "article",
      target_id: articleId,
      content: newComment.trim(),
    });
    if (error) {
      toast.error(error.message);
    } else {
      setNewComment("");
      await loadComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    await loadComments();
  };

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        {t("article.comments", "Kommentare")} ({comments.length})
      </h2>

      {/* Comment input */}
      {user ? (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0 mt-1">
            <AvatarFallback className="text-xs">U</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder={t("article.commentPlaceholder", "Schreibe einen Kommentar…")}
              className="min-h-[80px] resize-none bg-card/50 border-border/50"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newComment.trim() || submitting}
                className="rounded-xl"
              >
                {t("article.commentSubmit", "Kommentieren")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("article.loginToComment", "Melde dich an, um zu kommentieren.")}
        </p>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-3 group">
            <Link to={`/user/${comment.user_id}`}>
              <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                <AvatarImage src={comment.profile?.avatar_url || ""} />
                <AvatarFallback className="text-xs">
                  {(comment.profile?.display_name || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link to={`/user/${comment.user_id}`} className="text-sm font-medium text-foreground hover:underline">
                  {comment.profile?.display_name || t("article.unknownAuthor")}
                </Link>
                <span className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</span>
                {user?.id === comment.user_id && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-auto"
                  >
                    <DeleteTwoTone className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("article.noComments", "Noch keine Kommentare. Sei der Erste!")}
          </p>
        )}
      </div>
    </section>
  );
};

export default ArticleComments;
