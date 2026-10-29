import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isBot } from "@/lib/bot";

const SYNCED_KEY = "cc_tag_sync";
// Genres of a title rarely change; once a week per browser is plenty
const SYNC_TTL = 7 * 24 * 3600_000;

function syncedRecently(key: string): boolean {
  try {
    const map = JSON.parse(localStorage.getItem(SYNCED_KEY) || "{}") as Record<string, number>;
    return Date.now() - (map[key] ?? 0) < SYNC_TTL;
  } catch {
    return false;
  }
}

function markSynced(key: string) {
  try {
    const map = JSON.parse(localStorage.getItem(SYNCED_KEY) || "{}") as Record<string, number>;
    map[key] = Date.now();
    // Keep the newest 300 titles
    const kept = Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 300));
    localStorage.setItem(SYNCED_KEY, JSON.stringify(kept));
  } catch {
    /* storage blocked */
  }
}

/**
 * Automatically syncs genres/tags from TMDB or IGDB into
 * the tags + media_tags tables via edge function.
 * Requires an authenticated user (edge function validates JWT).
 */
export function useAutoTags(
  mediaId: string | undefined,
  mediaType: "movie" | "series" | "game",
  genres: { name: string; slug?: string }[] | undefined,
) {
  const { user } = useAuth();
  const synced = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !mediaId || !genres || genres.length === 0) return;

    const key = `${mediaType}-${mediaId}`;
    if (synced.current === key || isBot() || syncedRecently(key)) return;
    synced.current = key;
    markSynced(key);

    supabase.functions.invoke("sync-media-tags", {
      body: { media_id: String(mediaId), media_type: mediaType, genres },
    }).catch((err) => console.warn("Auto-tag sync failed:", err));
  }, [user, mediaId, mediaType, genres]);
}
