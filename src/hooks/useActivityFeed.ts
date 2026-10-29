import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  media_id: string | null;
  media_type: string | null;
  media_poster: string | null;
  target_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useActivityFeed() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`activity-feed-realtime-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, () => {
        qc.invalidateQueries({ queryKey: ["activity-feed"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ["activity-feed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as ActivityItem[];
    },
  });
}

export function useLogActivity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (activity: Omit<ActivityItem, "id" | "user_id" | "created_at">) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("activity_feed").insert([{
        user_id: user.id,
        activity_type: activity.activity_type,
        title: activity.title,
        description: activity.description ?? undefined,
        media_id: activity.media_id ?? undefined,
        media_type: activity.media_type ?? undefined,
        media_poster: activity.media_poster ?? undefined,
        target_url: activity.target_url ?? undefined,
        metadata: activity.metadata as any ?? undefined,
      }]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity-feed"] }),
  });
}
