import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import i18n from "@/i18n";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  target_type: string;
  target_id: string;
  read: boolean;
  created_at: string;
  actor_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export type NotifFilter = "all" | "unread" | "social" | "media" | "system";

const SOCIAL_TYPES = ["reply_post", "reply_comment", "mention", "vote_up", "like", "review_reaction"];
const MEDIA_TYPES = ["list_follow", "release", "new_episode", "new_season", "new_article", "new_content"];
const SYSTEM_TYPES = ["badge_earned", "warning", "press_approved", "press_rejected", "system"];

export function filterNotifications(notifs: AppNotification[], filter: NotifFilter): AppNotification[] {
  switch (filter) {
    case "unread": return notifs.filter(n => !n.read);
    case "social": return notifs.filter(n => SOCIAL_TYPES.includes(n.type));
    case "media": return notifs.filter(n => MEDIA_TYPES.includes(n.type));
    case "system": return notifs.filter(n => SYSTEM_TYPES.includes(n.type));
    default: return notifs;
  }
}

export function groupNotificationsByDate(notifs: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: AppNotification[] }[] = [
    { label: "today", items: [] },
    { label: "yesterday", items: [] },
    { label: "thisWeek", items: [] },
    { label: "older", items: [] },
  ];

  for (const n of notifs) {
    const d = new Date(n.created_at);
    if (d >= today) groups[0].items.push(n);
    else if (d >= yesterday) groups[1].items.push(n);
    else if (d >= weekAgo) groups[2].items.push(n);
    else groups[3].items.push(n);
  }

  return groups.filter(g => g.items.length > 0);
}

function getNotifToastText(type: string, actorName?: string): string {
  const t = i18n.t.bind(i18n);
  const actor = actorName || t("notifications.someone");
  switch (type) {
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

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) {
      setLoading(false);
      return;
    }

    const actorIds = [...new Set(data.filter(n => n.actor_id).map(n => n.actor_id!))];
    const { data: profiles } = actorIds.length > 0
      ? await supabase.from("profiles").select("user_id, display_name, avatar_url, username").in("user_id", actorIds)
      : { data: [] };

    const enriched: AppNotification[] = data.map(n => ({
      ...n,
      actor_profile: profiles?.find(p => p.user_id === n.actor_id) || undefined,
    }));

    // Show toast for truly new notifications (not on initial load)
    if (initialLoadDone.current) {
      for (const n of enriched) {
        if (!knownIds.current.has(n.id)) {
          const actorName = n.actor_profile?.display_name || n.actor_profile?.username || undefined;
          toast(getNotifToastText(n.type, actorName), {
            duration: 5000,
          });
        }
      }
    }

    knownIds.current = new Set(enriched.map(n => n.id));
    initialLoadDone.current = true;

    setNotifications(enriched);
    setUnreadCount(enriched.filter(n => !n.read).length);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`app-notifications-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadNotifications()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const n = notifications.find(x => x.id === notificationId);
    await supabase.from("notifications").delete().eq("id", notificationId);
    setNotifications(prev => prev.filter(x => x.id !== notificationId));
    if (n && !n.read) setUnreadCount(c => Math.max(0, c - 1));
  }, [notifications]);

  const deleteAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id).eq("read", true);
    setNotifications(prev => prev.filter(n => !n.read));
  }, [user]);

  return {
    notifications, unreadCount, loading,
    markAsRead, markAllRead, deleteNotification, deleteAllRead,
    reload: loadNotifications,
  };
}
