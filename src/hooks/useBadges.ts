import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  condition_type: string;
  condition_value: number | null;
  sort_order: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  seen: boolean;
}

export interface UserBadgeWithDef extends UserBadge {
  badge: BadgeDefinition;
}

/** All badge definitions; `enabled` false skips the request until something shows a badge */
export const useBadgeDefinitions = (enabled = true) =>
  useQuery({
    queryKey: ["badge-definitions"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_definitions")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as unknown as BadgeDefinition[];
    },
    staleTime: 1000 * 60 * 60, // definitions change with a migration, not while someone browses
  });

/** Badges earned by a specific user */
export const useUserBadges = (userId: string | undefined) =>
  useQuery({
    queryKey: ["user-badges", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId!)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data as unknown as UserBadge[];
    },
    enabled: !!userId,
  });

/** Unseen badges for the current user */
export const useUnseenBadges = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unseen-badges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", user!.id)
        .eq("seen", false);
      if (error) throw error;
      return data as unknown as UserBadge[];
    },
    enabled: !!user,
    refetchInterval: 5 * 60_000, // plus on window focus
  });
};

/** Mark badges as seen */
export const useMarkBadgesSeen = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (badgeIds: string[]) => {
      const { error } = await supabase
        .from("user_badges")
        .update({ seen: true } as never)
        .eq("user_id", user!.id)
        .in("badge_id", badgeIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unseen-badges"] });
      queryClient.invalidateQueries({ queryKey: ["user-badges"] });
    },
  });
};

/**
 * Check and award badges for the current user.
 * All criteria are re-computed server-side by the `claim_badges` function —
 * clients cannot insert badges directly.
 */
export const useCheckBadges = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc("claim_badges");
      if (error) throw error;
      return (data || []) as { badge_id: string; slug: string }[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-badges"] });
      queryClient.invalidateQueries({ queryKey: ["unseen-badges"] });
    },
  });
};
