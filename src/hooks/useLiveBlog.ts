import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyChange, type LiveUpdate } from "@/lib/liveBlog";
import { isBot } from "@/lib/bot";

const COLUMNS = "id, article_id, author_id, title, body, image_url, is_key, is_pinned, created_at, updated_at";

/**
 * The updates of a live blog. While it runs, Realtime pushes new, changed and deleted updates into
 * the list; `fresh` holds the ids that arrived that way, so the page can mark them as new.
 */
export function useLiveUpdates(articleId: string | undefined, running: boolean) {
  const client = useQueryClient();
  const key = ["live-updates", articleId];
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const subscribedOnce = useRef(false);

  const query = useQuery({
    queryKey: key,
    enabled: !!articleId,
    staleTime: running ? 30_000 : 10 * 60_000,
    queryFn: async (): Promise<LiveUpdate[]> => {
      const { data, error } = await supabase
        .from("article_live_updates")
        .select(COLUMNS)
        .eq("article_id", articleId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as LiveUpdate[];
    },
  });

  useEffect(() => {
    // Crawlers get the list as it is; no socket for them
    if (!articleId || !running || isBot()) return;
    subscribedOnce.current = false;
    const channel = supabase
      .channel(`live-updates-${articleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "article_live_updates", filter: `article_id=eq.${articleId}` },
        (payload) => {
          const event = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
          const row = (event === "DELETE" ? payload.old : payload.new) as Partial<LiveUpdate>;
          // Deletions are not filtered by article; applyChange ignores ids that are not in the list
          if (event !== "DELETE" && row.article_id !== articleId) return;
          client.setQueryData<LiveUpdate[]>(key, (prev) => applyChange(prev ?? [], event, row));
          if (event === "INSERT" && row.id) setFresh((s) => new Set(s).add(row.id!));
        },
      )
      .subscribe((status) => {
        // After a dropped connection (phone asleep, network change) catch up on what was missed
        if (status === "SUBSCRIBED") {
          if (subscribedOnce.current) void client.invalidateQueries({ queryKey: key });
          subscribedOnce.current = true;
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key is derived from articleId
  }, [articleId, running, client]);

  const clearFresh = useCallback(() => setFresh(new Set()), []);
  return { ...query, fresh, clearFresh };
}

/**
 * Ids of the live blogs running right now, for the LIVE badge in lists. One small request shared by
 * every list on the page; when it fails (e.g. before the migration) lists simply show no badge.
 */
export function useLiveArticleIds() {
  const { data } = useQuery({
    queryKey: ["live-article-ids"],
    staleTime: 2 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("id").eq("live_status", "live").eq("published", true).limit(20);
      if (error) return new Set<string>();
      return new Set((data ?? []).map((a) => a.id));
    },
  });
  return data ?? new Set<string>();
}
