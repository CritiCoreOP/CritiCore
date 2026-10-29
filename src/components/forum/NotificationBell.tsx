import { useForumNotifications } from "@/hooks/useForumNotifications";
import { Link } from "@/lib/locale-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/locale";
import { Bell, Check, MessageSquare, ArrowUp, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NOTIF_ICONS: Record<string, any> = {
  reply: MessageSquare,
  vote: ArrowUp,
  mention: AtSign,
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useForumNotifications();

  const getNotifText = (n: any) => {
    const actor = n.actor_profile?.display_name || "Jemand";
    switch (n.type) {
      case "reply_post": return `${actor} hat auf deinen Post geantwortet`;
      case "reply_comment": return `${actor} hat auf deinen Kommentar geantwortet`;
      case "mention": return `${actor} hat dich erwähnt`;
      default: return `${actor} hat interagiert`;
    }
  };

  const getNotifLink = (n: any) => {
    if (n.target_type === "post") return `/forum/${n.target_id}`;
    if (n.target_type === "comment") return `/forum/${n.target_id}`;
    return "/forum";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Benachrichtigungen">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Benachrichtigungen</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Alle gelesen
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Keine Benachrichtigungen
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = NOTIF_ICONS[n.type?.split("_")[0]] || MessageSquare;
            return (
              <Link
                key={n.id}
                to={getNotifLink(n)}
                onClick={() => !n.read && markAsRead(n.id)}
                className={cn(
                  "flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent/30 transition-colors border-b border-border last:border-b-0",
                  !n.read && "bg-primary/5"
                )}
              >
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarImage src={n.actor_profile?.avatar_url || ""} />
                  <AvatarFallback className="text-[9px]">
                    <Icon className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2">{getNotifText(n)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(n.created_at)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                )}
              </Link>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
