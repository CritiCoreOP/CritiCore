import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_STATUSES, type ArticleStatus } from "@/lib/articleStatus";
import { htmlWordCount } from "@/lib/press";

export interface DashArticle {
  id: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  article_type: string;
  status: ArticleStatus;
  published: boolean;
  slug: string;
  user_id: string;
  updated_at: string;
  cover_image_url: string | null;
}

export interface DashBriefing {
  id: string;
  body: string;
  deadline: string | null;
  created_at: string;
  article_id: string;
}

export interface DashComment {
  id: string;
  article_id: string;
  body: string;
  created_at: string;
}

export interface PressDashboard {
  /** The user's own articles, newest edit first */
  mine: DashArticle[];
  /** Board scope: everything for admins, the own articles for everyone else */
  pipeline: DashArticle[];
  briefings: DashBriefing[];
  /** Unresolved comments others left on the user's articles */
  feedback: DashComment[];
  /** Reactions per published article of the user */
  reactions: Record<string, number>;
  /** Words of the most recently edited draft ("continue writing") */
  continueWords: number | null;
  /** May publish without review (trusted press or admin) */
  canPublish: boolean;
}

const COLUMNS = "id, title, excerpt, category, article_type, status, published, slug, user_id, updated_at, cover_image_url";

export const pressDashboardKey = (userId: string | undefined, isAdmin: boolean) => ["press-dashboard", userId, isAdmin] as const;

async function loadDashboard(userId: string, isAdmin: boolean): Promise<PressDashboard> {
  // Published articles of everyone are readable too, so the own ones are filtered explicitly
  const ownQuery = supabase.from("articles").select(COLUMNS).eq("user_id", userId).order("updated_at", { ascending: false }).limit(100);
  const allQuery = isAdmin
    ? supabase.from("articles").select(COLUMNS).order("updated_at", { ascending: false }).limit(100)
    : null;
  const [own, all, publishRight] = await Promise.all([ownQuery, allQuery, supabase.rpc("can_press_publish", { _user_id: userId })]);
  if (own.error) throw own.error;

  const normalize = (rows: unknown[] | null) =>
    ((rows ?? []) as DashArticle[]).map((a) => ({
      ...a,
      status: ARTICLE_STATUSES.includes(a.status) ? a.status : "idea",
    }));
  const mine = normalize(own.data);
  const pipeline = all?.data ? normalize(all.data) : mine;
  const ids = mine.map((a) => a.id);
  const publishedIds = mine.filter((a) => a.published).map((a) => a.id);
  const draft = mine.find((a) => !a.published && a.status !== "idea");

  const [briefings, feedback, reactions, draftContent] = await Promise.all([
    ids.length
      ? supabase.from("article_briefings").select("id, body, deadline, created_at, article_id").in("article_id", ids).order("created_at", { ascending: false }).limit(30)
      : null,
    ids.length
      ? supabase
          .from("article_comments")
          .select("id, article_id, body, created_at")
          .in("article_id", ids)
          .eq("resolved", false)
          .neq("author_id", userId)
          .order("created_at", { ascending: false })
          .limit(30)
      : null,
    publishedIds.length ? supabase.from("article_reactions").select("article_id").in("article_id", publishedIds).limit(5000) : null,
    draft ? supabase.from("articles").select("content").eq("id", draft.id).maybeSingle() : null,
  ]);

  const counts: Record<string, number> = {};
  for (const r of (reactions?.data ?? []) as { article_id: string }[]) counts[r.article_id] = (counts[r.article_id] ?? 0) + 1;

  return {
    mine,
    pipeline,
    briefings: (briefings?.data ?? []) as DashBriefing[],
    feedback: (feedback?.data ?? []) as DashComment[],
    reactions: counts,
    continueWords: draftContent?.data ? htmlWordCount((draftContent.data as { content: string }).content) : null,
    canPublish: isAdmin || !!publishRight.data,
  };
}

export function usePressDashboard(userId: string | undefined, isAdmin: boolean, enabled: boolean) {
  const queryClient = useQueryClient();
  const key = pressDashboardKey(userId, isAdmin);
  const query = useQuery({
    queryKey: key,
    queryFn: () => loadDashboard(userId!, isAdmin),
    enabled: enabled && !!userId,
    staleTime: 30_000,
  });
  return {
    ...query,
    refresh: () => queryClient.invalidateQueries({ queryKey: key }),
    /** Changes the cached data at once; the next refresh brings the stored state */
    patch: (fn: (data: PressDashboard) => PressDashboard) => queryClient.setQueryData<PressDashboard>(key, (d) => (d ? fn(d) : d)),
  };
}
