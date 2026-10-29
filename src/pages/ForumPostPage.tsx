import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useNavigate, Link } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useForumVote } from "@/hooks/useForumVote";
import { setSeo, cleanupSeo } from "@/lib/seo";
import { detailUrl } from "@/lib/imageOptimize";
import OfficialBadge from "@/components/OfficialBadge";
import FlairBadge from "@/components/forum/FlairBadge";
import VoteButton from "@/components/forum/VoteButton";
import ForumMarkdown from "@/components/forum/ForumMarkdown";
import CommentThread, { type ForumComment } from "@/components/forum/CommentThread";
import { getCategoryByKey } from "@/components/forum/forumCategories";
import CommunityIcon from "@/components/forum/CommunityIcon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/locale";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Send, Trash2, Share2, Bookmark,
  Clock, TrendingUp, Zap, MessageSquare, Pencil, X, Check
} from "lucide-react";

type CommentSort = "best" | "new" | "controversial";

const ForumPostPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vote } = useForumVote();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postVote, setPostVote] = useState<"up" | "down" | null>(null);
  const [commentSort, setCommentSort] = useState<CommentSort>("best");

  // Inline edit state
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: postData } = await supabase.from("forum_posts").select("*").eq("id", id).maybeSingle();
    if (!postData) { setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url, is_official").eq("user_id", postData.user_id).maybeSingle();

    let communityInfo = null;
    if (postData.community_id) {
      const { data: comm } = await supabase.from("forum_communities").select("slug, name, icon").eq("id", postData.community_id).maybeSingle();
      communityInfo = comm;
    }

    // Load flair if assigned
    let flairInfo = null;
    if ((postData as any).flair_id) {
      const { data: flair } = await supabase.from("forum_flairs").select("name, color, bg_color, emoji, icon_url").eq("id", (postData as any).flair_id).maybeSingle();
      flairInfo = flair;
    }

    const enrichedPost = { ...postData, profile, community: communityInfo, flair: flairInfo };
    setPost(enrichedPost);

    // SEO
    setSeo({
      title: `${postData.title} — CritiCore Forum`,
      description: postData.content.slice(0, 160),
      url: `/forum/${id}`,
      image: postData.image_url || undefined,
      type: "article",
    });

    const { data: commentsData } = await supabase.from("forum_comments").select("*").eq("post_id", id);

    const userIds = [...new Set((commentsData || []).map((c) => c.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, display_name, avatar_url, is_official").in("user_id", userIds)
      : { data: [] };

    let votes: any[] = [];
    if (user) {
      const allTargets = [id, ...(commentsData || []).map((c) => c.id)];
      const { data: v } = await supabase.from("forum_votes").select("target_id, vote_type, target_type").eq("user_id", user.id).in("target_id", allTargets);
      votes = v || [];
      setPostVote(votes.find((v) => v.target_id === id && v.target_type === "post")?.vote_type || null);
    }

    const enriched: ForumComment[] = (commentsData || []).map((c) => ({
      ...c,
      profile: profiles?.find((p) => p.user_id === c.user_id),
      userVote: votes.find((v) => v.target_id === c.id && v.target_type === "comment")?.vote_type || null,
    }));

    const buildTree = (items: ForumComment[], parentId: string | null = null, depth = 0): ForumComment[] => {
      if (depth >= 4) return [];
      return items
        .filter((c) => c.parent_id === parentId)
        .map((c) => ({ ...c, replies: buildTree(items, c.id, depth + 1) }));
    };

    const tree = buildTree(enriched);
    const sortFn = (a: ForumComment, b: ForumComment) => {
      switch (commentSort) {
        case "new": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "controversial": return (Math.min(a.upvotes, a.downvotes) / Math.max(a.upvotes, a.downvotes, 1)) - (Math.min(b.upvotes, b.downvotes) / Math.max(b.upvotes, b.downvotes, 1));
        default: return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      }
    };
    tree.sort(sortFn);
    setComments(tree);
    setLoading(false);
  }, [id, user, commentSort]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { return () => { cleanupSeo(); }; }, []);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`forum-post-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_comments", filter: `post_id=eq.${id}` }, () => loadData())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "forum_posts", filter: `id=eq.${id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, loadData]);

  // Atomic vote handlers
  const handlePostVote = async (voteType: "up" | "down") => {
    if (!post) return;
    const result = await vote(post.id, "post", voteType);
    if (result) await loadData();
  };

  const handleCommentVote = async (comment: ForumComment, voteType: "up" | "down") => {
    const result = await vote(comment.id, "comment", voteType);
    if (result) await loadData();
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!user || !id) return;
    const { error } = await supabase.from("forum_comments").insert({ post_id: id, user_id: user.id, parent_id: parentId, content });
    if (!error) {
      await supabase.from("forum_posts").update({ comment_count: (post?.comment_count || 0) + 1 }).eq("id", id);
      await loadData();
    } else { toast.error("Kommentar konnte nicht gepostet werden."); }
  };

  const handleEditPost = async () => {
    if (!user || !post || !editTitle.trim() || !editContent.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("forum_posts")
      .update({ title: editTitle.trim(), content: editContent.trim(), is_edited: true, edited_at: new Date().toISOString() })
      .eq("id", post.id);
    if (!error) {
      setEditingPost(false);
      toast.success("Post aktualisiert");
      await loadData();
    } else { toast.error("Bearbeiten fehlgeschlagen."); }
    setSubmitting(false);
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!user) return;
    const { error } = await supabase.from("forum_comments")
      .update({ content: newContent, is_edited: true, edited_at: new Date().toISOString() })
      .eq("id", commentId);
    if (!error) { await loadData(); toast.success("Kommentar aktualisiert"); }
    else { toast.error("Bearbeiten fehlgeschlagen."); }
  };

  const handleDeletePost = async () => {
    if (!user || !post) return;
    if (!window.confirm("Bist du sicher, dass du diesen Post löschen möchtest?")) return;
    const { error } = await supabase.from("forum_posts").delete().eq("id", post.id);
    if (!error) { toast.success("Post gelöscht"); navigate("/forum"); }
    else toast.error("Löschen fehlgeschlagen.");
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    if (!window.confirm("Kommentar löschen?")) return;
    const { error } = await supabase.from("forum_comments").delete().eq("id", commentId);
    if (!error) {
      await supabase.from("forum_posts").update({ comment_count: Math.max(0, (post?.comment_count || 1) - 1) }).eq("id", id!);
      await loadData();
      toast.success("Kommentar gelöscht");
    }
  };

  const submitTopComment = async () => {
    if (!user || !id || !newComment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("forum_comments").insert({ post_id: id, user_id: user.id, parent_id: null, content: newComment.trim() });
    if (!error) {
      await supabase.from("forum_posts").update({ comment_count: (post?.comment_count || 0) + 1 }).eq("id", id);
      setNewComment("");
      await loadData();
    } else { toast.error("Kommentar konnte nicht gepostet werden."); }
    setSubmitting(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (navigator.share) {
      navigator.share({ title: post?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link kopiert!");
    }
  };

  const handleSave = async () => {
    if (!user || !post) { toast.error("Bitte anmelden."); return; }
    await supabase.from("user_saves").upsert({ user_id: user.id, target_type: "forum_post", target_id: post.id });
    toast.success("Gespeichert!");
  };

  const score = post ? post.upvotes - post.downvotes : 0;
  const cat = post ? getCategoryByKey(post.category) : null;

  if (loading) return (
    <div className="space-y-3 max-w-3xl mx-auto px-4 py-4">
       <div className="h-48 bg-muted animate-pulse border border-border rounded-lg" />
       <div className="h-32 bg-muted animate-pulse border border-border rounded-lg" />
    </div>
  );

  if (!post) return (
    <div className="text-center py-16 max-w-3xl mx-auto">
      <p className="text-muted-foreground">Post nicht gefunden.</p>
      <Link to="/forum"><Button variant="outline" className="mt-4">Zurück zum Forum</Button></Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4">
      {/* Back */}
      <Link to="/forum" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      {/* Post */}
      <div className="bg-card border border-border rounded-lg mb-4 overflow-hidden">
        <div className="flex">
          <div className="hidden sm:flex flex-col items-center py-4 px-3 bg-muted/30">
            <VoteButton score={score} userVote={postVote} onVote={handlePostVote} vertical size="md" />
          </div>

          <div className="flex-1 p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
              {cat && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted">
                  {cat.label}
                </span>
              )}
              {post.flair && (
                <FlairBadge
                  name={post.flair.name}
                  color={post.flair.color}
                  bgColor={post.flair.bg_color}
                  emoji={post.flair.emoji}
                  iconUrl={post.flair.icon_url}
                />
              )}
              {post.community && (
                <Link to={`/forum/c/${post.community.slug}`} className="flex items-center gap-1 font-medium text-foreground hover:underline">
                  <CommunityIcon icon={post.community.icon} size="sm" />
                  c/{post.community.slug}
                </Link>
              )}
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={post.profile?.avatar_url || ""} />
                  <AvatarFallback className="text-[9px]">{(post.profile?.display_name || "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground">{post.profile?.display_name || "Anonym"}</span>
                {post.profile?.is_official && <OfficialBadge />}
              </div>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-muted-foreground">{formatDate(post.created_at)}</span>
              {post.is_edited && (
                <span className="text-muted-foreground/60 flex items-center gap-0.5 text-[10px]">
                  <Pencil className="w-2 h-2" /> bearbeitet
                </span>
              )}
            </div>

            {/* Title + Content — editable */}
            {editingPost ? (
              <div className="space-y-3">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xl font-bold bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="text-sm"
                  placeholder="Markdown unterstützt..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEditPost} disabled={submitting || !editTitle.trim() || !editContent.trim()}>
                    <Check className="w-3 h-3 mr-1" /> Speichern
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingPost(false)}>
                    <X className="w-3 h-3 mr-1" /> Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{post.title}</h1>
                <ForumMarkdown content={post.content} className="text-sm leading-relaxed" />
              </>
            )}

            {post.image_url && (
              <div className="mt-4 overflow-hidden border border-border rounded-lg">
                <img src={detailUrl(post.image_url)} alt="" className="w-full max-h-[500px] object-contain bg-muted" loading="lazy" />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border">
              <div className="flex sm:hidden">
                <VoteButton score={score} userVote={postVote} onVote={handlePostVote} vertical={false} size="sm" />
              </div>

              <button onClick={handleShare} className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors min-h-[44px] sm:min-h-0" aria-label="Post teilen">
                <Share2 className="w-3.5 h-3.5" /> Teilen
              </button>

              <button onClick={handleSave} className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors min-h-[44px] sm:min-h-0" aria-label="Post speichern">
                <Bookmark className="w-3.5 h-3.5" /> Speichern
              </button>

              {user && user.id === post.user_id && !editingPost && (
                <button onClick={() => { setEditTitle(post.title); setEditContent(post.content); setEditingPost(true); }} className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors min-h-[44px] sm:min-h-0" aria-label="Post bearbeiten">
                  <Pencil className="w-3.5 h-3.5" /> Bearbeiten
                </button>
              )}

              {user && user.id === post.user_id && (
                <button onClick={handleDeletePost} className="flex items-center gap-1.5 px-2 py-1 text-destructive hover:text-destructive/80 text-xs font-medium transition-colors min-h-[44px] sm:min-h-0" aria-label="Post löschen">
                  <Trash2 className="w-3.5 h-3.5" /> Löschen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">{post.comment_count} Kommentare</h2>
          </div>
          <div className="flex items-center border-b border-border">
            {([
              { key: "best" as const, label: "Beste", icon: TrendingUp },
              { key: "new" as const, label: "Neu", icon: Clock },
              { key: "controversial" as const, label: "Kontrovers", icon: Zap },
            ]).map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setCommentSort(s.key)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px",
                    commentSort === s.key
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {user ? (
          <div className="flex gap-2 mb-5">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Kommentar schreiben... (Markdown unterstützt)"
              rows={3}
              className="flex-1 text-sm"
            />
            <Button onClick={submitTopComment} disabled={submitting || !newComment.trim()} className="self-end">
              <Send className="w-4 h-4 mr-1" /> Senden
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-5">
            <Link to="/auth" className="text-primary hover:underline">Anmelden</Link> um zu kommentieren.
          </p>
        )}

        <div className="divide-y divide-border">
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Noch keine Kommentare. Sei der Erste!</p>
          ) : (
            comments.map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                maxDepth={4}
                onVote={handleCommentVote}
                onReply={handleReply}
                onDelete={handleDeleteComment}
                onEdit={handleEditComment}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumPostPage;
