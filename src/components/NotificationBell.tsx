import { useState } from "react";
import { useNotifications, type AppNotification, groupNotificationsByDate } from "@/hooks/useNotifications";
import { Link } from "@/lib/locale-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getDefaultAvatar } from "@/lib/defaultAvatars";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AtSign as AlternateEmailTwoTone, FileText as ArticleTwoTone, MessageCircle as ChatBubbleTwoTone, Check as CheckTwoTone, Trash2 as DeleteSweepTwoTone, Trophy as EmojiEventsTwoTone, Info as InfoTwoTone, Tv as LiveTvTwoTone, BellRing as NewReleasesTwoTone, Bell as NotificationsTwoTone, ExternalLink as OpenInNewTwoTone, ListChecks as PlaylistAddCheckTwoTone, ThumbsUp as ThumbUpTwoTone, BadgeCheck as VerifiedTwoTone, AlertTriangle as WarningTwoTone } from "lucide-react";
const NOTIF_ICONS: Record<string, typeof InfoTwoTone> = {
  reply: ChatBubbleTwoTone,
  mention: AlternateEmailTwoTone,
  vote: ThumbUpTwoTone,
  like: ThumbUpTwoTone,
  badge: EmojiEventsTwoTone,
  list: PlaylistAddCheckTwoTone,
  warning: WarningTwoTone,
  release: NewReleasesTwoTone,
  press: VerifiedTwoTone,
  system: InfoTwoTone,
  new: LiveTvTwoTone,
};

function getNotifIcon(type: string) {
  const prefix = type.split("_")[0];
  return NOTIF_ICONS[prefix] || InfoTwoTone;
}

export function getNotifLink(n: AppNotification): string {
  if (n.target_type === "post" || n.target_type === "comment") return `/forum/${n.target_id}`;
  if (n.type === "badge_earned") return "/profil";
  if (n.target_type === "list") return `/listen/${n.target_id}`;
  if (n.type === "warning") return "/profil";
  if (n.type === "press_approved" || n.type === "press_rejected") return "/profil";
  if (n.target_type === "review") return "/profil";
  if (n.type === "new_article" && n.target_type === "article") return `/news`;
  if (n.type === "new_episode" || n.type === "new_season") return `/serien/${n.target_id}`;
  if (n.type === "new_content") {
    if (n.target_type === "movie") return `/filme/${n.target_id}`;
    if (n.target_type === "series") return `/serien/${n.target_id}`;
    if (n.target_type === "game") return `/games/${n.target_id}`;
  }
  return "/";
}

export function getNotifText(n: AppNotification, t: (key: string, opts?: Record<string, string>) => string): string {
  const actor = n.actor_profile?.display_name || n.actor_profile?.username || t("notifications.someone");
  switch (n.type) {
    case "reply_post": return t("notifications.replyPost", { actor });
    case "reply_comment": return t("notifications.replyComment", { actor });
    case "mention": return t("notifications.mention", { actor });
    case "vote_up":
    case "like": return t("notifications.like", { actor });
    case "badge_earned": return t("notifications.badgeEarned");
    case "list_follow": return t("notifications.listFollow", { actor });
    case "review_reaction": return t("notifications.reviewReaction", { actor });
    case "warning": return t("notifications.warning");
    case "press_approved": return t("notifications.pressApproved");
    case "press_rejected": return t("notifications.pressRejected");
    case "system": return t("notifications.system");
    case "new_article": return t("notifications.newArticle");
    case "new_episode": return t("notifications.newEpisode");
    case "new_season": return t("notifications.newSeason");
    case "new_content": return t("notifications.newContent");
    default: return t("notifications.interaction", { actor });
  }
}

const NotificationItem = ({
  n,
  onRead,
  onClose,
}: {
  n: AppNotification;
  onRead: (id: string) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const Icon = getNotifIcon(n.type);

  return (
    <Link
      to={getNotifLink(n)}
      onClick={() => {
        if (!n.read) onRead(n.id);
        onClose();
      }}
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors",
        !n.read && "bg-primary/[0.06]"
      )}
    >
      <div className={cn(
        "w-9 h-9 shrink-0 rounded-full flex items-center justify-center mt-0.5",
        n.type === "warning" ? "bg-destructive/10" :
        n.type === "badge_earned" ? "bg-amber-500/10" :
        "bg-primary/10"
      )}>
        <Icon className={cn(
          "!text-[18px]",
          n.type === "warning" ? "text-destructive" :
          n.type === "badge_earned" ? "text-amber-500" :
          "text-primary"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground line-clamp-2 leading-snug">
          {getNotifText(n, t)}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatDate(n.created_at)}
        </p>
      </div>
      {!n.read && (
        <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2.5" />
      )}
    </Link>
  );
};

const NotificationBell = () => {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllRead, deleteAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const groups = groupNotificationsByDate(notifications);

  const DATE_LABELS: Record<string, string> = {
    today: t("notifications.today"),
    yesterday: t("notifications.yesterday"),
    thisWeek: t("notifications.thisWeek"),
    older: t("notifications.older"),
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-accent/40"
          aria-label={t("notifications.title")}
        >
          <NotificationsTwoTone className="size-[18px]" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center leading-none animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(380px,calc(100vw-24px))] p-0 overflow-hidden"
        style={{ borderRadius: "var(--mcc-shape-lg, 16px)" }}
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <span className="text-sm font-semibold text-foreground">{t("notifications.title")}</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
              >
                <CheckTwoTone className="!text-[14px]" />
                {t("notifications.markAllRead")}
              </button>
            )}
            {notifications.some(n => n.read) && (
              <button
                onClick={deleteAllRead}
                className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 px-2 py-1 rounded-md hover:bg-destructive/10 transition-colors"
                title={t("notifications.clearRead")}
              >
                <DeleteSweepTwoTone className="!text-[14px]" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <NotificationsTwoTone className="!text-[40px] text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("notifications.empty")}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t("notifications.emptyHint")}</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-2 bg-muted/30 sticky top-0 z-10">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {DATE_LABELS[group.label] || group.label}
                  </span>
                </div>
                {group.items.map(n => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onRead={markAsRead}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </div>
            ))
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2.5 bg-card">
            <Link
              to="/benachrichtigungen"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline flex items-center gap-1 justify-center"
            >
              {t("notifications.viewAll")}
              <OpenInNewTwoTone className="!text-[12px]" />
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
