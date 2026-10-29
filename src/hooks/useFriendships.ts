import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
}

export function useFriendships() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friendships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      if (error) throw error;
      return (data || []) as Friendship[];
    },
  });
}

export function useFriends() {
  const { data: friendships = [] } = useFriendships();
  const { user } = useAuth();
  const accepted = friendships.filter(f => f.status === "accepted");
  return accepted.map(f => f.requester_id === user?.id ? f.addressee_id : f.requester_id);
}

export function usePendingRequests() {
  const { data: friendships = [] } = useFriendships();
  const { user } = useAuth();
  return friendships.filter(f => f.status === "pending" && f.addressee_id === user?.id);
}

export function useSentRequests() {
  const { data: friendships = [] } = useFriendships();
  const { user } = useAuth();
  return friendships.filter(f => f.status === "pending" && f.requester_id === user?.id);
}

export function useFriendshipStatus(targetUserId: string | undefined) {
  const { data: friendships = [] } = useFriendships();
  const { user } = useAuth();
  if (!user || !targetUserId) return null;
  return friendships.find(
    f => (f.requester_id === user.id && f.addressee_id === targetUserId) ||
         (f.requester_id === targetUserId && f.addressee_id === user.id)
  ) || null;
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (addresseeId: string) => {
      const { error } = await supabase.from("friendships").insert({
        requester_id: user!.id,
        addressee_id: addresseeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendships"] });
      toast.success("Freundschaftsanfrage gesendet!");
    },
    onError: () => toast.error("Fehler beim Senden der Anfrage"),
  });
}

export function useRespondFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
        .eq("id", friendshipId);
      if (error) throw error;
    },
    onSuccess: (_, { accept }) => {
      qc.invalidateQueries({ queryKey: ["friendships"] });
      qc.invalidateQueries({ queryKey: ["activity-feed"] });
      toast.success(accept ? "Freundschaftsanfrage angenommen!" : "Anfrage abgelehnt");
    },
    onError: () => toast.error("Fehler"),
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendships"] });
      toast.success("Freund entfernt");
    },
    onError: () => toast.error("Fehler"),
  });
}
