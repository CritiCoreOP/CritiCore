import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

/**
 * Atomic vote via RPC — replaces all client-side vote logic.
 * Returns a function that does optimistic update + RPC call.
 */
export function useForumVote() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const vote = useCallback(
    async (targetId: string, targetType: "post" | "comment", voteType: "up" | "down") => {
      if (!user) {
        toast.error(t("forum.loginToVote"));
        return null;
      }

      const { data, error } = await supabase.rpc("forum_vote", {
        p_user_id: user.id,
        p_target_id: targetId,
        p_target_type: targetType,
        p_vote_type: voteType,
      });

      if (error) {
        console.error("Vote error:", error);
        toast.error("Vote fehlgeschlagen.");
        return null;
      }

      // Recalculate karma for the post/comment author in background
      // We don't await this — fire and forget
      if (targetType === "post") {
        supabase
          .from("forum_posts")
          .select("user_id")
          .eq("id", targetId)
          .maybeSingle()
          .then(({ data: post }) => {
            if (post?.user_id) {
              supabase.rpc("recalculate_karma", { p_user_id: post.user_id });
            }
          });
      } else {
        supabase
          .from("forum_comments")
          .select("user_id")
          .eq("id", targetId)
          .maybeSingle()
          .then(({ data: comment }) => {
            if (comment?.user_id) {
              supabase.rpc("recalculate_karma", { p_user_id: comment.user_id });
            }
          });
      }

      return data as { action: string; vote_type: string | null } | null;
    },
    [user, t]
  );

  return { vote };
}
