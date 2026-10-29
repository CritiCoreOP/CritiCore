import { useQuery, useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { isBot } from "@/lib/bot";
import { useAuth } from "@/hooks/useAuth";
import {
  getAnilistTrending,
  getAnilistPopular,
  getAnilistSeasonal,
  searchAnilist,
  getAnilistDetail,
  currentSeason,
  type AnimeTitleLang,
} from "@/lib/anilist";

/* ── Title-language preference ────────────────────────────────────────────── */

export function useAnimeTitleLang(): AnimeTitleLang {
  const { user } = useAuth();
  const [lang, setLang] = useState<AnimeTitleLang>(() => {
    const stored = typeof window !== "undefined"
      ? (localStorage.getItem("anime_title_language") as AnimeTitleLang | null)
      : null;
    return stored ?? "romaji";
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("anime_title_language")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const v = (data as any)?.anime_title_language as AnimeTitleLang | null | undefined;
        if (v && (v === "romaji" || v === "english" || v === "native")) {
          setLang(v);
          try { localStorage.setItem("anime_title_language", v); } catch {}
        }
      });
  }, [user]);

  return lang;
}

/* ── List / discovery ─────────────────────────────────────────────────────── */

export const useAnimeTrending = (perPage = 24) =>
  useInfiniteQuery({
    queryKey: ["anime", "trending", perPage],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getAnilistTrending(pageParam as number, perPage),
    getNextPageParam: (last) =>
      last.Page.pageInfo.hasNextPage ? last.Page.pageInfo.currentPage + 1 : undefined,
    staleTime: 1000 * 60 * 30,
  });

export const useAnimePopular = (perPage = 24) =>
  useInfiniteQuery({
    queryKey: ["anime", "popular", perPage],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getAnilistPopular(pageParam as number, perPage),
    getNextPageParam: (last) =>
      last.Page.pageInfo.hasNextPage ? last.Page.pageInfo.currentPage + 1 : undefined,
    staleTime: 1000 * 60 * 30,
  });

export const useAnimeSeasonal = (perPage = 24) => {
  const { season, year } = currentSeason();
  return useInfiniteQuery({
    queryKey: ["anime", "seasonal", season, year, perPage],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getAnilistSeasonal(season, year, pageParam as number, perPage),
    getNextPageParam: (last) =>
      last.Page.pageInfo.hasNextPage ? last.Page.pageInfo.currentPage + 1 : undefined,
    staleTime: 1000 * 60 * 30,
  });
};

export const useAnimeSearch = (query: string, perPage = 24) =>
  useQuery({
    queryKey: ["anime", "search", query, perPage],
    queryFn: () => searchAnilist(query, 1, perPage),
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });

/* ── Detail ───────────────────────────────────────────────────────────────── */

export const useAnimeDetail = (id: number | null) =>
  useQuery({
    queryKey: ["anime", "detail", id],
    queryFn: () => getAnilistDetail(id!),
    enabled: !!id && Number.isFinite(id),
    staleTime: 1000 * 60 * 60,
  });

/* ── Background sync into DB (best-effort) ────────────────────────────────── */

const synced = new Set<number>();

/**
 * Stores an anime's data in media_metadata, which the Explore page reads. The RPC needs the
 * AniList id and a signed-in user; before, it was called without the id for everyone and failed
 * every time. Runs once per title and session, never for crawlers.
 */
export async function syncAnilistMedia(media: { id: number }) {
  if (!media?.id || synced.has(media.id) || isBot()) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  synced.add(media.id);
  const { error } = await supabase.rpc("sync_anilist_media", { p_anilist_id: media.id, p_payload: media as unknown as Json });
  if (error) {
    synced.delete(media.id);
    console.warn("sync_anilist_media failed", error.message);
  }
}
