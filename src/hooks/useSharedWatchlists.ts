import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SharedWatchlist {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SharedWatchlistMember {
  id: string;
  watchlist_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface SharedWatchlistItem {
  id: string;
  watchlist_id: string;
  media_id: string;
  media_type: string;
  media_title: string;
  media_poster: string | null;
  added_by: string;
  added_at: string;
  sort_order: number;
}

export function useMySharedWatchlists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["shared-watchlists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("shared_watchlists").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SharedWatchlist[];
    },
  });
}

export function useSharedWatchlistMembers(watchlistId: string | undefined) {
  return useQuery({
    queryKey: ["shared-watchlist-members", watchlistId],
    enabled: !!watchlistId,
    queryFn: async () => {
      const { data, error } = await supabase.from("shared_watchlist_members").select("*").eq("watchlist_id", watchlistId!);
      if (error) throw error;
      return (data || []) as SharedWatchlistMember[];
    },
  });
}

export function useSharedWatchlistItems(watchlistId: string | undefined) {
  return useQuery({
    queryKey: ["shared-watchlist-items", watchlistId],
    enabled: !!watchlistId,
    queryFn: async () => {
      const { data, error } = await supabase.from("shared_watchlist_items").select("*").eq("watchlist_id", watchlistId!).order("sort_order");
      if (error) throw error;
      return (data || []) as SharedWatchlistItem[];
    },
  });
}

export function useCreateSharedWatchlist() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("shared_watchlists")
        .insert({ name, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      // Add creator as member
      await supabase.from("shared_watchlist_members").insert({
        watchlist_id: data.id,
        user_id: user!.id,
        role: "owner",
      });
      return data as SharedWatchlist;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared-watchlists"] });
      toast.success("Gemeinsame Watchlist erstellt!");
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });
}

export function useAddSharedWatchlistMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ watchlistId, userId }: { watchlistId: string; userId: string }) => {
      const { error } = await supabase.from("shared_watchlist_members").insert({
        watchlist_id: watchlistId,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { watchlistId }) => {
      qc.invalidateQueries({ queryKey: ["shared-watchlist-members", watchlistId] });
      toast.success("Freund hinzugefügt!");
    },
    onError: () => toast.error("Fehler – ist die Person ein Freund?"),
  });
}

export function useAddSharedWatchlistItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ watchlistId, mediaId, mediaType, mediaTitle, mediaPoster }: {
      watchlistId: string; mediaId: string; mediaType: string; mediaTitle: string; mediaPoster?: string;
    }) => {
      const { error } = await supabase.from("shared_watchlist_items").insert({
        watchlist_id: watchlistId,
        media_id: mediaId,
        media_type: mediaType,
        media_title: mediaTitle,
        media_poster: mediaPoster || null,
        added_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, { watchlistId }) => {
      qc.invalidateQueries({ queryKey: ["shared-watchlist-items", watchlistId] });
      toast.success("Hinzugefügt!");
    },
    onError: () => toast.error("Fehler"),
  });
}

export function useDeleteSharedWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (watchlistId: string) => {
      const { error } = await supabase.from("shared_watchlists").delete().eq("id", watchlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared-watchlists"] });
      toast.success("Watchlist gelöscht");
    },
    onError: () => toast.error("Fehler"),
  });
}
