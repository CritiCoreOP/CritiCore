import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CustomList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomListItem {
  id: string;
  list_id: string;
  media_id: string;
  media_type: string;
  media_title: string;
  media_poster: string | null;
  sort_order: number;
  added_at: string;
}

export const useMyLists = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["custom-lists", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_lists")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CustomList[];
    },
    enabled: !!user,
  });
};

export const usePublicLists = (userId: string | undefined) =>
  useQuery({
    queryKey: ["public-lists", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_lists")
        .select("*")
        .eq("user_id", userId!)
        .eq("is_public", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CustomList[];
    },
    enabled: !!userId,
  });

export const useListItems = (listId: string | undefined) =>
  useQuery({
    queryKey: ["list-items", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_list_items")
        .select("*")
        .eq("list_id", listId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as unknown as CustomListItem[];
    },
    enabled: !!listId,
  });

export const useCreateList = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { name: string; description?: string; is_public?: boolean }) => {
      const { data, error } = await supabase
        .from("custom_lists")
        .insert({ user_id: user!.id, name: params.name, description: params.description || null, is_public: params.is_public ?? false })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CustomList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
    },
  });
};

export const useDeleteList = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase.from("custom_lists").delete().eq("id", listId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
    },
  });
};

export const useUpdateList = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; description?: string; is_public?: boolean }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("custom_lists").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
    },
  });
};

export const useAddToList = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { list_id: string; media_id: string; media_type: string; media_title: string; media_poster?: string | null }) => {
      const { error } = await supabase.from("custom_list_items").insert({
        list_id: params.list_id,
        media_id: params.media_id,
        media_type: params.media_type,
        media_title: params.media_title,
        media_poster: params.media_poster || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["list-items", vars.list_id] });
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
      queryClient.invalidateQueries({ queryKey: ["media-in-lists"] });
    },
  });
};

export const useRemoveFromList = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { list_id: string; media_id: string; media_type: string }) => {
      const { error } = await supabase
        .from("custom_list_items")
        .delete()
        .eq("list_id", params.list_id)
        .eq("media_id", params.media_id)
        .eq("media_type", params.media_type);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["list-items", vars.list_id] });
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
      queryClient.invalidateQueries({ queryKey: ["media-in-lists"] });
    },
  });
};

/** Check which of the user's lists contain a specific media item */
export const useMediaInLists = (mediaId: string, mediaType: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["media-in-lists", user?.id, mediaId, mediaType],
    queryFn: async () => {
      const { data: lists } = await supabase
        .from("custom_lists")
        .select("id")
        .eq("user_id", user!.id);
      if (!lists || lists.length === 0) return [];
      const listIds = lists.map(l => l.id);
      const { data: items } = await supabase
        .from("custom_list_items")
        .select("list_id")
        .eq("media_id", mediaId)
        .eq("media_type", mediaType)
        .in("list_id", listIds);
      return (items || []).map(i => i.list_id);
    },
    enabled: !!user && !!mediaId,
  });
};
