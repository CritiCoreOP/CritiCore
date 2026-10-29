import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { localizedUrl } from "@/lib/sitemap";
import type { QueueResult } from "./inbox";
import { dailyBuckets } from "./kpis";
import type { Platform } from "./social/postTemplates";

const DAY = 86_400_000;
/** Queues and counters refresh on their own; a minute keeps the badges honest without hammering the database */
const LIVE = 60_000;

/* ── Who is looking ───────────────────────────────────────────────────────── */

export function useDashboardAccess() {
  const { user, loading } = useAuth();
  const roles = useQuery({
    queryKey: ["dash", "roles", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.role as string));
    },
  });
  const isAdmin = roles.data?.has("admin") ?? false;
  const isPress = roles.data?.has("press") ?? false;
  return {
    user,
    loading: loading || (!!user && roles.isLoading),
    error: roles.isError,
    isAdmin,
    isPress,
    canUse: isAdmin || isPress,
  };
}

/* ── What waits for an admin ──────────────────────────────────────────────── */

type Row = { id: string; at: string; title: string };

async function queue(kind: QueueResult["kind"], run: () => PromiseLike<{ data: unknown[] | null; count: number | null; error: unknown }>, map: (r: never) => Row): Promise<QueueResult> {
  const { data, count, error } = await run();
  if (error) throw error;
  return { kind, count: count ?? 0, rows: ((data ?? []) as never[]).map(map) };
}

export function useQueues(enabled: boolean) {
  return useQuery({
    queryKey: ["dash", "queues"],
    enabled,
    refetchInterval: LIVE,
    queryFn: async (): Promise<QueueResult[]> => {
      const n = 8;
      const settled = await Promise.allSettled([
        queue(
          "reports",
          () => supabase.from("reports").select("id, reason, target_type, created_at", { count: "exact" }).eq("status", "open").order("created_at").limit(n),
          (r: { id: string; reason: string; target_type: string; created_at: string }) => ({ id: r.id, at: r.created_at, title: `${r.reason} (${r.target_type})` }),
        ),
        queue(
          "support",
          () => supabase.from("support_tickets").select("id, subject, created_at", { count: "exact" }).in("status", ["open", "in_progress"]).order("created_at").limit(n),
          (r: { id: string; subject: string; created_at: string }) => ({ id: r.id, at: r.created_at, title: r.subject }),
        ),
        queue(
          "dmca",
          () => supabase.from("dmca_requests").select("id, full_name, content_url, created_at", { count: "exact" }).in("status", ["pending", "in_review"]).order("created_at").limit(n),
          (r: { id: string; full_name: string; content_url: string; created_at: string }) => ({ id: r.id, at: r.created_at, title: `${r.full_name}: ${r.content_url}` }),
        ),
        queue(
          "press",
          () => supabase.from("press_profiles").select("id, organization, created_at", { count: "exact" }).eq("verified", false).order("created_at").limit(n),
          (r: { id: string; organization: string | null; created_at: string }) => ({ id: r.id, at: r.created_at, title: r.organization || "" }),
        ),
        queue(
          "images",
          () => supabase.from("media_images").select("id, image_type, media_type, created_at", { count: "exact" }).eq("status", "pending").order("created_at").limit(n),
          (r: { id: string; image_type: string; media_type: string; created_at: string }) => ({ id: r.id, at: r.created_at, title: `${r.image_type} (${r.media_type})` }),
        ),
        queue(
          "review",
          () => supabase.from("articles").select("id, title, updated_at", { count: "exact" }).eq("status", "review").order("updated_at").limit(n),
          (r: { id: string; title: string; updated_at: string }) => ({ id: r.id, at: r.updated_at, title: r.title }),
        ),
      ]);
      // One queue the database refuses (a missing policy) must not hide the others
      return settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
    },
  });
}

/* ── Numbers of the last 30 days ──────────────────────────────────────────── */

export interface Kpi {
  id: string;
  total: number;
  buckets: number[];
}

async function datesSince(table: "profiles" | "reviews" | "comments", since: string): Promise<string[]> {
  const { data, error } = await supabase.from(table).select("created_at").gte("created_at", since).limit(10000);
  if (error) throw error;
  return (data ?? []).map((r) => r.created_at);
}

export function useAdminKpis(enabled: boolean) {
  return useQuery({
    queryKey: ["dash", "kpis", "admin"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Kpi[]> => {
      const now = new Date();
      const since = new Date(now.getTime() - 30 * DAY).toISOString();
      const [users, reviews, comments, articles] = await Promise.all([
        datesSince("profiles", since),
        datesSince("reviews", since),
        datesSince("comments", since),
        supabase.from("articles").select("published_at").eq("published", true).gte("published_at", since).limit(5000),
      ]);
      if (articles.error) throw articles.error;
      const published = (articles.data ?? []).map((a) => a.published_at);
      return [
        { id: "users", dates: users },
        { id: "reviews", dates: reviews },
        { id: "articles", dates: published },
        { id: "comments", dates: comments },
      ].map(({ id, dates }) => ({ id, total: dates.length, buckets: dailyBuckets(dates, 30, now) }));
    },
  });
}

export interface OwnArticles {
  published30: number;
  buckets: number[];
  inProgress: number;
  inReview: number;
}

export function useOwnArticles(userId: string | undefined) {
  return useQuery({
    queryKey: ["dash", "own-articles", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<OwnArticles> => {
      const { data, error } = await supabase.from("articles").select("status, published_at").eq("user_id", userId!).limit(1000);
      if (error) throw error;
      const now = new Date();
      const since = now.getTime() - 30 * DAY;
      const rows = data ?? [];
      const published = rows.filter((a) => a.status === "published" && a.published_at && new Date(a.published_at).getTime() >= since).map((a) => a.published_at);
      return {
        published30: published.length,
        buckets: dailyBuckets(published, 30, now),
        inProgress: rows.filter((a) => a.status === "idea" || a.status === "research" || a.status === "writing").length,
        inReview: rows.filter((a) => a.status === "review").length,
      };
    },
  });
}

/* ── What happened lately ─────────────────────────────────────────────────── */

export interface ActivityItem {
  id: string;
  kind: "moderation" | "signup" | "published";
  at: string;
  /** What happened, ready to show: the article title, the username, the action */
  text: string;
  detail?: string;
  href?: string;
}

export function useActivity(isAdmin: boolean, enabled: boolean) {
  return useQuery({
    queryKey: ["dash", "activity", isAdmin],
    enabled,
    refetchInterval: LIVE,
    queryFn: async (): Promise<ActivityItem[]> => {
      const published = supabase.from("articles").select("id, title, slug, published_at").eq("published", true).order("published_at", { ascending: false }).limit(6);
      const [articles, logs, signups] = await Promise.all([
        published,
        isAdmin ? supabase.from("moderation_logs").select("id, action, target_type, created_at").order("created_at", { ascending: false }).limit(6) : null,
        isAdmin ? supabase.from("profiles").select("id, username, display_name, created_at").order("created_at", { ascending: false }).limit(5) : null,
      ]);
      const items: ActivityItem[] = [
        ...(articles.data ?? []).filter((a) => a.published_at).map((a) => ({ id: `a-${a.id}`, kind: "published" as const, at: a.published_at!, text: a.title, href: `/news/${a.slug}` })),
        ...(logs?.data ?? []).map((l) => ({ id: `m-${l.id}`, kind: "moderation" as const, at: l.created_at, text: l.action.replace(/_/g, " "), detail: l.target_type })),
        ...(signups?.data ?? []).map((p) => ({ id: `u-${p.id}`, kind: "signup" as const, at: p.created_at, text: p.display_name || p.username || "" })),
      ];
      return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
    },
  });
}

/* ── Published articles and where they were shared ────────────────────────── */

export interface PublishedArticle {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  category: string | null;
  articleType: string | null;
  language: string;
  cover: string | null;
  publishedAt: string;
  url: string;
}

export function usePublishedArticles(search: string, limit = 30) {
  return useQuery({
    queryKey: ["dash", "published", search, limit],
    staleTime: 60_000,
    queryFn: async (): Promise<PublishedArticle[]> => {
      let q = supabase
        .from("articles")
        .select("id, title, excerpt, slug, category, article_type, language, cover_image_url, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(limit);
      const term = search.trim().replace(/[%,()]/g, " ");
      if (term) q = q.ilike("title", `%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt,
        slug: a.slug,
        category: a.category,
        articleType: a.article_type,
        language: a.language || "de",
        cover: a.cover_image_url,
        publishedAt: a.published_at ?? "",
        url: localizedUrl(`/news/${encodeURIComponent(a.slug)}`, a.language || "de"),
      }));
    },
  });
}

export interface ShareMark {
  id: string;
  articleId: string;
  platform: Platform;
  sharedAt: string;
  postUrl: string | null;
}

export function useShares(articleIds: string[]) {
  const ids = [...articleIds].sort();
  return useQuery({
    queryKey: ["dash", "shares", ids],
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<ShareMark[]> => {
      const { data, error } = await supabase.from("social_shares").select("id, article_id, platform, shared_at, post_url").in("article_id", ids);
      if (error) throw error;
      return (data ?? []).map((s) => ({ id: s.id, articleId: s.article_id, platform: s.platform as Platform, sharedAt: s.shared_at, postUrl: s.post_url }));
    },
  });
}

export function useShareToggle() {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ articleId, platform, mark }: { articleId: string; platform: Platform; mark: ShareMark | undefined }) => {
      if (mark) {
        const { error } = await supabase.from("social_shares").delete().eq("id", mark.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("social_shares").insert({ article_id: articleId, platform, shared_by: user?.id });
        if (error) throw error;
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["dash", "shares"] }),
  });
}

/** Why a direct Bluesky post failed, as the function reports it */
export type BlueskyPostError = { code: string; postUrl?: string };

/** Posts straight to the CritiCore Bluesky account (function bluesky-post) and marks the article as shared */
export function useBlueskyPost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ articleId, text }: { articleId: string; text: string }): Promise<string> => {
      const { data, error } = await supabase.functions.invoke("bluesky-post", { body: { articleId, text } });
      if (error) {
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw { code: body?.error ?? "bluesky_error", postUrl: body?.postUrl } satisfies BlueskyPostError;
      }
      return (data as { postUrl: string }).postUrl;
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["dash", "shares"] }),
  });
}

/* ── System health for the admin overview ─────────────────────────────────── */

export function useSystemHealth(enabled: boolean) {
  return useQuery({
    queryKey: ["dash", "health"],
    enabled,
    refetchInterval: 5 * LIVE,
    queryFn: async () => {
      const since = new Date(Date.now() - DAY).toISOString();
      const [mails, incidents] = await Promise.all([
        supabase.from("email_send_log").select("id", { count: "exact", head: true }).in("status", ["failed", "dlq"]).gte("created_at", since),
        supabase.from("api_status_events").select("id, service_name, status, started_at, ended_at").is("ended_at", null).order("started_at", { ascending: false }).limit(5),
      ]);
      return {
        // Null: the database does not let us read the log (migration not applied yet)
        failedMails: mails.error ? null : (mails.count ?? 0),
        incidents: incidents.data ?? [],
      };
    },
  });
}
