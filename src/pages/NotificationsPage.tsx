import { useState } from "react";
import {
  useNotifications,
  type NotifFilter,
  filterNotifications,
  groupNotificationsByDate,
} from "@/hooks/useNotifications";
import { getNotifLink, getNotifText } from "@/components/NotificationBell";
import { Link } from "@/lib/locale-router";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AtSign as AlternateEmailTwoTone, MessageCircle as ChatBubbleTwoTone, Check as CheckTwoTone, Trash2 as DeleteSweepTwoTone, Trophy as EmojiEventsTwoTone, Inbox as InboxTwoTone, Info as InfoTwoTone, Tv as LiveTvTwoTone, BellRing as NewReleasesTwoTone, Bell as NotificationsTwoTone, ListChecks as PlaylistAddCheckTwoTone, ThumbsUp as ThumbUpTwoTone, BadgeCheck as VerifiedTwoTone, AlertTriangle as WarningTwoTone } from "lucide-react";
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

const FILTERS: { key: NotifFilter; labelKey: string }[] = [
  { key: "all", labelKey: "notifications.filterAll" },
  { key: "unread", labelKey: "notifications.filterUnread" },
  { key: "social", labelKey: "notifications.filterSocial" },
  { key: "media", labelKey: "notifications.filterMedia" },
  { key: "system", labelKey: "notifications.filterSystem" },
];

const NotificationsPage = () => {
  const { t } = useTranslation();
  const {
    notifications, unreadCount, loading,
    markAsRead, markAllRead, deleteNotification, deleteAllRead,
  } = useNotifications();
  const [filter, setFilter] = useState<NotifFilter>("all");

  const filtered = filterNotifications(notifications, filter);
  const groups = groupNotificationsByDate(filtered);

  const DATE_LABELS: Record<string, string> = {
    today: t("notifications.today"),
    yesterday: t("notifications.yesterday"),
    thisWeek: t("notifications.thisWeek"),
    older: t("notifications.older"),
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <NotificationsTwoTone className="!text-[28px] text-primary" />
              {t("notifications.title")}
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("notifications.unreadCount", { count: unreadCount })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs gap-1.5">
                <CheckTwoTone className="!text-[16px]" />
                {t("notifications.markAllRead")}
              </Button>
            )}
            {notifications.some(n => n.read) && (
              <Button variant="ghost" size="sm" onClick={deleteAllRead} className="text-xs gap-1.5 text-muted-foreground hover:text-destructive">
                <DeleteSweepTwoTone className="!text-[16px]" />
                {t("notifications.clearRead")}
              </Button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center px-3.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {t(f.labelKey)}
              {f.key === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && notifications.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-sm">
            {t("common.loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <InboxTwoTone className="!text-[48px] text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("notifications.empty")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("notifications.emptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map(group => (
              <div key={group.label}>
                <div className="px-1 py-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {DATE_LABELS[group.label] || group.label}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map(n => {
                    const Icon = getNotifIcon(n.type);
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "group flex items-start gap-3 px-4 py-3 rounded-xl transition-colors",
                          !n.read ? "bg-primary/[0.06] hover:bg-primary/[0.1]" : "hover:bg-accent/40"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 shrink-0 rounded-full flex items-center justify-center",
                          n.type === "warning" ? "bg-destructive/10" :
                          n.type === "badge_earned" ? "bg-amber-500/10" :
                          "bg-primary/10"
                        )}>
                          <Icon className={cn(
                            "!text-[20px]",
                            n.type === "warning" ? "text-destructive" :
                            n.type === "badge_earned" ? "text-amber-500" :
                            "text-primary"
                          )} />
                        </div>
                        <Link to={getNotifLink(n)} onClick={() => !n.read && markAsRead(n.id)} className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-2 leading-snug">
                            {getNotifText(n, t)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(n.created_at)}
                          </p>
                        </Link>
                        <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-0">
                          {!n.read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-md text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
                              title={t("notifications.markRead")}
                              aria-label={t("notifications.markRead")}
                            >
                              <CheckTwoTone className="!text-[16px]" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                            title={t("common.delete")}
                            aria-label={t("common.delete")}
                          >
                            <DeleteSweepTwoTone className="!text-[16px]" />
                          </button>
                        </div>
                        {!n.read && (
                          <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-3" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
