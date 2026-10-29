import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MediaStatusEntry {
  id: string;
  user_id: string;
  media_id: string;
  media_type: string;
  media_title: string;
  media_poster: string | null;
  status: string;
  created_at: string;
}

export function useMediaStatus(mediaId: string, mediaType: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["media-status", user?.id, mediaId, mediaType],
    enabled: !!user && !!mediaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_status")
        .select("*")
        .eq("user_id", user!.id)
        .eq("media_id", mediaId)
        .eq("media_type", mediaType)
        .maybeSingle();
      if (error) throw error;
      return data as MediaStatusEntry | null;
    },
  });
}

export function useToggleMediaStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      mediaId: string;
      mediaType: string;
      mediaTitle: string;
      mediaPoster?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if already exists
      const { data: existing } = await supabase
        .from("media_status")
        .select("id")
        .eq("user_id", user.id)
        .eq("media_id", params.mediaId)
        .eq("media_type", params.mediaType)
        .maybeSingle();

      if (existing) {
        // Remove
        const { error } = await supabase
          .from("media_status")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return null;
      } else {
        // Insert
        const status = params.mediaType === "game" ? "played" : "watched";
        const { data, error } = await supabase
          .from("media_status")
          .insert({
            user_id: user.id,
            media_id: params.mediaId,
            media_type: params.mediaType,
            media_title: params.mediaTitle,
            media_poster: params.mediaPoster ?? null,
            status,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["media-status", user?.id, vars.mediaId, vars.mediaType] });
      qc.invalidateQueries({ queryKey: ["media-status-all"] });
    },
  });
}

export function useAllMediaStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["media-status-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_status")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MediaStatusEntry[];
    },
  });
}
