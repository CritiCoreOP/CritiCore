import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isBot } from "@/lib/bot";

export function useFollowStatus(targetId: string, targetType: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["follow", targetId, targetType, user?.id],
    enabled: !!user && !!targetId,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("user_id", user!.id)
        .eq("target_id", targetId)
        .eq("target_type", targetType)
        .maybeSingle();
      return data;
    },
  });
}

export function useFollowCount(targetId: string, targetType: string) {
  return useQuery({
    queryKey: ["follow-count", targetId, targetType],
    // Crawlers render every detail page; the count is no content for them
    enabled: !!targetId && !isBot(),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("target_id", targetId)
        .eq("target_type", targetType);
      return count ?? 0;
    },
  });
}

export function useToggleFollow() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      targetId: string;
      targetType: string;
      targetName: string;
      targetImage?: string | null;
      isFollowing: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (params.isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("user_id", user.id)
          .eq("target_id", params.targetId)
          .eq("target_type", params.targetType);
      } else {
        await supabase.from("follows").insert({
          user_id: user.id,
          target_id: params.targetId,
          target_type: params.targetType,
          target_name: params.targetName,
          target_image: params.targetImage ?? null,
        });
      }
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ["follow", params.targetId, params.targetType] });
      qc.invalidateQueries({ queryKey: ["follow-count", params.targetId, params.targetType] });
    },
  });
}
