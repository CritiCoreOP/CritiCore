import { useState } from "react";
import VoteButton from "./VoteButton";
import OfficialBadge from "@/components/OfficialBadge";
import ForumMarkdown from "./ForumMarkdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/locale";
import { useAuth } from "@/hooks/useAuth";
import { useDataOptOut } from "@/hooks/useDataOptOut";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Reply, Trash2, Send, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ForumComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  is_edited?: boolean;
  edited_at?: string | null;
  profile?: { display_name: string | null; avatar_url: string | null; is_official?: boolean };
  userVote?: "up" | "down" | null;
  replies?: ForumComment[];
}

interface CommentThreadProps {
  comment: ForumComment;
  depth?: number;
  maxDepth?: number;
  onVote: (comment: ForumComment, type: "up" | "down") => void;
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newContent: string) => Promise<void>;
}

const CommentThread = ({ comment, depth = 0, maxDepth = 4, onVote, onReply, onDelete, onEdit }: CommentThreadProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { guardOptOut } = useDataOptOut();
  const [collapsed, setCollapsed] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const score = comment.upvotes - comment.downvotes;

  const handleReply = async () => {
    if (guardOptOut()) return;
    if (!replyContent.trim()) return;
    setSubmitting(true);
    await onReply(comment.id, replyContent.trim());
    setReplyContent("");
    setShowReply(false);
    setSubmitting(false);
  };

  const handleEdit = async () => {
    if (!editContent.trim() || !onEdit) return;
    setSubmitting(true);
    await onEdit(comment.id, editContent.trim());
    setEditing(false);
    setSubmitting(false);
  };

  return (
    <div className={cn(depth > 0 && "ml-4 sm:ml-5 border-l border-border pl-3 sm:pl-4")}>
      <article className="py-2" aria-expanded={!collapsed}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label={collapsed ? "Kommentar aufklappen" : "Kommentar zuklappen"}
            aria-controls={`comment-body-${comment.id}`}
          >
            {collapsed ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>

          <Avatar className="h-5 w-5">
            <AvatarImage src={comment.profile?.avatar_url || ""} />
            <AvatarFallback className="text-[9px]">{(comment.profile?.display_name || "?").charAt(0)}</AvatarFallback>
          </Avatar>

          <span className="text-sm font-medium text-foreground">
            {comment.profile?.display_name || "Anonym"}
          </span>
          {comment.profile?.is_official && <OfficialBadge />}

          <time className="text-xs text-muted-foreground" dateTime={comment.created_at}>
            {formatDate(comment.created_at)}
          </time>

          {comment.is_edited && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
              <Pencil className="w-2 h-2" /> bearbeitet
            </span>
          )}

          {collapsed && (
            <span className="text-xs text-muted-foreground">
              [{(comment.replies?.length || 0)} Antworten]
            </span>
          )}
        </div>

        {!collapsed && (
          <div id={`comment-body-${comment.id}`}>
            {editing ? (
              <div className="ml-8 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEdit} disabled={submitting || !editContent.trim()}>
                    <Check className="w-3 h-3 mr-1" /> Speichern
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditContent(comment.content); }}>
                    <X className="w-3 h-3 mr-1" /> Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="ml-8">
                <ForumMarkdown content={comment.content} className="text-sm" />
              </div>
            )}

            <div className="flex items-center gap-2 ml-8 mt-1">
              <VoteButton
                score={score}
                userVote={comment.userVote || null}
                onVote={(type) => onVote(comment, type)}
                vertical={false}
                size="sm"
              />

              {depth < maxDepth && user && (
                <button
                  onClick={() => setShowReply(!showReply)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label="Antworten"
                  aria-expanded={showReply}
                >
                  <Reply className="w-3 h-3" />
                  Antworten
                </button>
              )}

              {user && user.id === comment.user_id && onEdit && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label="Bearbeiten"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}

              {user && user.id === comment.user_id && onDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label="Löschen"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {showReply && user && (
              <div className="ml-8 mt-2 flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Antwort schreiben... (Markdown unterstützt)"
                  rows={2}
                  className="flex-1 text-sm"
                  autoFocus
                />
                <Button size="sm" onClick={handleReply} disabled={submitting || !replyContent.trim()} className="self-end">
                  <Send className="w-3.5 h-3.5" />
                  <span className="sr-only">Antwort senden</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </article>

      {!collapsed && comment.replies && comment.replies.length > 0 && (
        <ul className="list-none p-0 m-0" role="group">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentThread
                comment={reply}
                depth={depth + 1}
                maxDepth={maxDepth}
                onVote={onVote}
                onReply={onReply}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CommentThread;
