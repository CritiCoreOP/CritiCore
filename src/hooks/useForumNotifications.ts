import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ForumNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  target_type: string;
  target_id: string;
  read: boolean;
  created_at: string;
  actor_profile?: { display_name: string | null; avatar_url: string | null };
}

export function useForumNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!data) return;

    const actorIds = [...new Set(data.filter((n) => n.actor_id).map((n) => n.actor_id!))];
    const { data: profiles } = actorIds.length > 0
      ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", actorIds)
      : { data: [] };

    const enriched: ForumNotification[] = data.map((n) => ({
      ...n,
      actor_profile: profiles?.find((p) => p.user_id === n.actor_id) || undefined,
    }));

    setNotifications(enriched);
    setUnreadCount(enriched.filter((n) => !n.read).length);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => loadNotifications()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [user]);

  return { notifications, unreadCount, markAsRead, markAllRead, reload: loadNotifications };
}
