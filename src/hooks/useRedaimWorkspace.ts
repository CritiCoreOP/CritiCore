import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RwWorkspace {
  id: string;
  name: string;
  icon: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface RwMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

export function useRedaimWorkspaces() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading: loading } = useQuery({
    queryKey: ["rw-workspaces", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("rw_workspaces" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      return (data as any as RwWorkspace[]) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const createWorkspace = async (name: string) => {
    if (!user) return null;
    const { data, error } = await supabase.rpc("create_rw_workspace", { p_name: name });
    if (error || !data) return null;
    queryClient.invalidateQueries({ queryKey: ["rw-workspaces"] });
    return data as any as RwWorkspace;
  };

  const deleteWorkspace = async (id: string) => {
    await supabase.from("rw_workspaces" as any).delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["rw-workspaces"] });
  };

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["rw-workspaces"] });
  }, [queryClient]);

  return { workspaces, loading, createWorkspace, deleteWorkspace, refetch };
}

export function useRedaimMembers(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading: loading } = useQuery({
    queryKey: ["rw-members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("rw_members" as any)
        .select("*")
        .eq("workspace_id", workspaceId);
      const raw = (data as any as RwMember[]) || [];
      const userIds = raw.map((m) => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
        raw.forEach((m) => {
          const p = profileMap.get(m.user_id);
          if (p) m.profile = { display_name: p.display_name, avatar_url: p.avatar_url };
        });
      }
      return raw;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["rw-members", workspaceId] });
  }, [queryClient, workspaceId]);

  return { members, loading, refetch };
}

export function useRedaimMyRole(workspaceId: string | undefined) {
  const { user } = useAuth();
  const { members } = useRedaimMembers(workspaceId);
  const me = members.find((m) => m.user_id === user?.id);
  return me?.role || null;
}
