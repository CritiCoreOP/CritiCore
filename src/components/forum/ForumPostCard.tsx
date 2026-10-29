import { Link } from "@/lib/locale-router";
import CommunityIcon from "./CommunityIcon";
import VoteButton from "./VoteButton";
import { getCategoryByKey } from "./forumCategories";
import OfficialBadge from "@/components/OfficialBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/locale";
import { thumbUrl } from "@/lib/imageOptimize";
import { MessageSquare, Share2, Bookmark, Pin, ExternalLink, Type, ImageIcon, LinkIcon, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import FlairBadge from "./FlairBadge";

interface ForumPostCardProps {
  post: any;
  onVote: (post: any, type: "up" | "down") => void;
  onSave?: (post: any) => void;
  onShare?: (post: any) => void;
  showCommunity?: boolean;
}

function extractDomain(text: string): string | null {
  const match = text.match(/https?:\/\/([^/\s)]+)/);
  return match ? match[1] : null;
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s)]+/);
  return match ? match[0] : null;
}

function getPostType(post: any): "image" | "link" | "text" {
  if (post.image_url) return "image";
  const url = extractUrl(post.content);
  if (url && post.content.startsWith("[")) return "link";
  return "text";
}

const TYPE_BADGES: Record<string, { label: string; icon: any }> = {
  image: { label: "Bild", icon: ImageIcon },
  link: { label: "Link", icon: LinkIcon },
  text: { label: "Text", icon: Type },
};

const ForumPostCard = ({ post, onVote, onSave, onShare, showCommunity = true }: ForumPostCardProps) => {
  const score = post.upvotes - post.downvotes;
  const cat = getCategoryByKey(post.category);
  const postType = getPostType(post);
  const typeBadge = TYPE_BADGES[postType];
  const linkUrl = postType === "link" ? extractUrl(post.content) : null;
  const linkDomain = linkUrl ? extractDomain(linkUrl) : null;

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShare) {
      onShare(post);
    } else {
      const url = `${window.location.origin}/forum/${post.id}`;
      navigator.clipboard.writeText(url);
      toast.success("Link kopiert!");
    }
  };

  return (
    <div className={cn(
      "group bg-[hsl(var(--mcc-surface-container-lowest))] transition-all duration-[var(--mcc-t-mid)] hover:bg-[hsl(var(--mcc-surface-container))]",
      post.pinned && "bg-primary/[0.02]"
    )}>
      <div className="flex">
        {/* Left vote column — desktop */}
        <div className="hidden sm:flex flex-col items-center py-3.5 px-3">
          <VoteButton
            score={score}
            userVote={post.userVote}
            onVote={(type) => onVote(post, type)}
            vertical
            size="sm"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-3 px-3 sm:py-3.5 sm:px-4 sm:pl-0">
          {/* Header meta */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[11px] sm:text-xs mb-2">
            {post.pinned && <Pin className="w-3 h-3 text-primary/60" />}

            <span className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-[hsl(var(--mcc-surface-container))] rounded-[var(--mcc-shape-full)]">
              {cat.label}
            </span>

            {post.flair && (
              <FlairBadge
                name={post.flair.name}
                color={post.flair.color}
                bgColor={post.flair.bg_color}
                emoji={post.flair.emoji}
                iconUrl={post.flair.icon_url}
              />
            )}

            <span className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60 bg-[hsl(var(--mcc-surface-container))]/50 rounded-[var(--mcc-shape-full)]">
              <typeBadge.icon className="w-2.5 h-2.5" />
              {typeBadge.label}
            </span>

            {showCommunity && post.community && (
              <Link
                to={`/forum/c/${post.community.slug}`}
                className="flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors truncate max-w-[140px] sm:max-w-none"
                onClick={(e) => e.stopPropagation()}
              >
                <CommunityIcon icon={post.community.icon} size="sm" />
                <span className="truncate">c/{post.community.slug}</span>
                {post.community.status_icon_url && (
                  <img src={post.community.status_icon_url} alt="" className="w-3.5 h-3.5 rounded object-cover shrink-0" loading="lazy" />
                )}
                {!post.community.status_icon_url && post.community.status_emoji && (
                  <span className="text-[11px]">{post.community.status_emoji}</span>
                )}
              </Link>
            )}

            <span className="text-muted-foreground/20 hidden sm:inline">·</span>

            <div className="hidden sm:flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarImage src={post.profile?.avatar_url || ""} />
                <AvatarFallback className="text-[8px]">{(post.profile?.display_name || "?").charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground">{post.profile?.display_name || "Anonym"}</span>
              {post.profile?.is_official && <OfficialBadge />}
              {post.userFlair && (
                <FlairBadge
                  name={post.userFlair.name}
                  color={post.userFlair.color}
                  bgColor={post.userFlair.bg_color}
                  emoji={post.userFlair.emoji}
                  iconUrl={post.userFlair.icon_url}
                />
              )}
            </div>

            <span className="text-muted-foreground/20 hidden sm:inline">·</span>
            <span className="text-muted-foreground/60 hidden sm:inline">{formatDate(post.created_at)}</span>
            {post.is_edited && (
              <span className="text-muted-foreground/40 hidden sm:inline flex items-center gap-0.5">
                <Pencil className="w-2.5 h-2.5" /> bearbeitet
              </span>
            )}
          </div>

          {/* Title + content + thumbnail */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <Link to={`/forum/${post.id}`} className="block group/title">
                <h3 className="font-semibold text-foreground text-sm sm:text-[15px] leading-snug mb-1 group-hover/title:text-primary transition-colors duration-[var(--mcc-t-fast)] line-clamp-2">
                  {post.title}
                </h3>

                {postType === "link" && linkUrl && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--mcc-surface-container))] border border-border/30 rounded-[var(--mcc-shape-sm)] mt-1 mb-1">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-primary truncate">{linkDomain}</span>
                  </div>
                )}

                {postType === "text" && (
                  <p className="text-xs sm:text-sm text-muted-foreground/70 line-clamp-2 leading-relaxed">{post.content}</p>
                )}
              </Link>
            </div>

            {post.image_url && (
              <Link to={`/forum/${post.id}`} className="shrink-0">
                <div className="w-16 h-12 sm:w-[88px] sm:h-16 rounded-[var(--mcc-shape-sm)] overflow-hidden bg-[hsl(var(--mcc-surface-container))]">
                  <img src={thumbUrl(post.image_url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 mt-2.5">
            <div className="flex sm:hidden items-center">
              <VoteButton
                score={score}
                userVote={post.userVote}
                onVote={(type) => onVote(post, type)}
                vertical={false}
                size="sm"
              />
            </div>

            <Link
              to={`/forum/${post.id}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--mcc-surface-container))] text-[11px] sm:text-xs font-medium transition-all duration-[var(--mcc-t-fast)] rounded-[var(--mcc-shape-full)]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{post.comment_count}</span>
            </Link>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--mcc-surface-container))] text-[11px] sm:text-xs font-medium transition-all duration-[var(--mcc-t-fast)] rounded-[var(--mcc-shape-full)]"
              aria-label="Post teilen"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Teilen</span>
            </button>

            {onSave && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(post); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--mcc-surface-container))] text-[11px] sm:text-xs font-medium transition-all duration-[var(--mcc-t-fast)] rounded-[var(--mcc-shape-full)]"
                aria-label="Post speichern"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Speichern</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumPostCard;
