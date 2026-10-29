import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  roles: string[];
}

export interface AuthorProfile {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
}

const nameOf = (p: { user_id: string; display_name: string | null; username: string | null }) => p.display_name || p.username || p.user_id.slice(0, 8);

/** Everyone who can write articles: the press team and the admins, with name and picture */
export function useTeamMembers(enabled = true) {
  return useQuery({
    queryKey: ["article-team-members"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TeamMember[]> => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id, role").in("role", ["press", "admin"]);
      if (error) throw error;
      const byUser = new Map<string, string[]>();
      for (const r of roles ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
      if (!byUser.size) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", [...byUser.keys()]);
      return (profiles ?? [])
        .map((p) => ({ user_id: p.user_id, name: nameOf(p), username: p.username, avatar_url: p.avatar_url, roles: byUser.get(p.user_id) ?? [] }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

/** Name and picture of the authors of several articles, one request for all */
export async function loadAuthors(userIds: string[]): Promise<Record<string, AuthorProfile>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", ids);
  return Object.fromEntries((data ?? []).map((p) => [p.user_id, { user_id: p.user_id, name: nameOf(p), username: p.username, avatar_url: p.avatar_url }]));
}

/** Name and picture of one user, also when they are not (or no longer) in the team */
export function useAuthorProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["article-author", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => (await loadAuthors([userId!]))[userId!] ?? null,
  });
}

/**
 * Sets a new author; admins only (the database keeps the old one for everyone else) and logged for
 * moderation. No RETURNING: admins have no read policy for other people's drafts, so a draft handed
 * to someone else could not be read back.
 */
export async function changeArticleAuthor(articleId: string, from: string | null, to: string, adminId: string) {
  const { error } = await supabase.from("articles").update({ user_id: to }).eq("id", articleId);
  if (error) throw error;
  await supabase.from("moderation_logs").insert({ admin_id: adminId, target_type: "article", target_id: articleId, action: "change_author", reason: `${from ?? "?"} -> ${to}` });
}
