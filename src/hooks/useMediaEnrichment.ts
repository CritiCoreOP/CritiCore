// Client-side helpers for AI-enriched metadata (media_enrichment table).
// - useEnrichmentBatch(items): loads existing rows + lazily triggers Claude
//   enrichment for missing items (deduped, capped concurrency).
// - useTriggerEnrichment(type, id): one-shot lazy trigger for detail pages.
// - useAvailableAiTags(): distinct tags actually present in the DB, for chips.
//
// All failures are silent — the UI must keep working without enrichment.

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isBot } from "@/lib/bot";

export type EnrichmentMediaType = "movie" | "tv" | "game";

export interface EnrichmentRow {
  media_type: EnrichmentMediaType;
  source_id: string;
  tags: string[];
  categories: string[];
  description_de: string | null;
}

// Convert an ExploreMediaCard item type ("movie" | "series" | "game") to the
// media_enrichment schema type. Returns null for unsupported values.
export function toEnrichmentType(
  t: string | undefined | null,
): EnrichmentMediaType | null {
  if (t === "movie") return "movie";
  if (t === "series" || t === "tv") return "tv";
  if (t === "game") return "game";
  return null;
}

// Module-level dedup so multiple mounted components / re-renders can't fire
// the same enrichment invoke twice within a session.
const triggered = new Set<string>();
let inflightCount = 0;
const MAX_CONCURRENT = 3;
const queue: (() => void)[] = [];

function schedule(fn: () => Promise<void>) {
  const run = () => {
    inflightCount++;
    fn().finally(() => {
      inflightCount--;
      const next = queue.shift();
      if (next) next();
    });
  };
  if (inflightCount < MAX_CONCURRENT) run();
  else queue.push(run);
}

async function triggerOne(mediaType: EnrichmentMediaType, id: string) {
  const key = `${mediaType}:${id}`;
  // Crawlers walk thousands of titles; enrichment waits for a real visitor
  if (triggered.has(key) || isBot()) return;
  triggered.add(key);
  try {
    const { error } = await supabase.functions.invoke("enrich-metadata", {
      body: { media_type: mediaType, id },
    });
    if (error) throw error;
  } catch {
    // silent — enrichment is best-effort
    triggered.delete(key); // allow retry on next visit
  }
}

interface EnrichableItem {
  id: string | number;
  type: string;
}

/**
 * Load existing enrichment rows for the given items and lazily trigger
 * enrichment for any item that does not yet have a row.
 */
export function useEnrichmentBatch(items: EnrichableItem[]) {
  const keys = useMemo(() => {
    const out: { key: string; mediaType: EnrichmentMediaType; id: string }[] = [];
    const seen = new Set<string>();
    for (const it of items) {
      const mt = toEnrichmentType(it.type);
      if (!mt) continue;
      const id = String(it.id);
      const key = `${mt}:${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, mediaType: mt, id });
    }
    return out;
  }, [items]);

  const signature = keys.map((k) => k.key).join("|");

  const { data } = useQuery({
    queryKey: ["enrichment-batch", signature],
    queryFn: async () => {
      if (keys.length === 0) return new Map<string, EnrichmentRow>();
      // Build a WHERE (media_type,source_id) IN (...) via .or clauses.
      // Postgres supports .in with a tuple only via rpc, so batch per media_type.
      const byType = new Map<EnrichmentMediaType, string[]>();
      for (const k of keys) {
        if (!byType.has(k.mediaType)) byType.set(k.mediaType, []);
        byType.get(k.mediaType)!.push(k.id);
      }
      const rows: EnrichmentRow[] = [];
      for (const [mt, ids] of byType) {
        const { data: r } = await supabase
          .from("media_enrichment")
          .select("media_type, source_id, tags, categories, description_de")
          .eq("media_type", mt)
          .in("source_id", ids);
        if (r) rows.push(...(r as EnrichmentRow[]));
      }
      const map = new Map<string, EnrichmentRow>();
      for (const r of rows) map.set(`${r.media_type}:${r.source_id}`, r);
      return map;
    },
    staleTime: 5 * 60 * 1000,
    enabled: keys.length > 0,
  });

  // Fire-and-forget: trigger enrichment for missing entries.
  useEffect(() => {
    if (!data) return;
    for (const k of keys) {
      if (!data.has(k.key) && !triggered.has(k.key)) {
        schedule(() => triggerOne(k.mediaType, k.id));
      }
    }
  }, [data, keys]);

  return data ?? new Map<string, EnrichmentRow>();
}

/**
 * One-shot lazy trigger for a single detail page. Safe to call on every
 * render — module-level dedup ensures at most one invocation per session.
 */
export function useTriggerEnrichment(
  mediaType: EnrichmentMediaType | null,
  id: string | number | null | undefined,
) {
  const qc = useQueryClient();
  useEffect(() => {
    // Crawlers never start an enrichment (see triggerOne), so the check would only cost a request
    if (!mediaType || !id || isBot()) return;
    const sid = String(id);
    if (triggered.has(`${mediaType}:${sid}`)) return;
    // Check DB first — if a row exists, skip.
    supabase
      .from("media_enrichment")
      .select("media_type")
      .eq("media_type", mediaType)
      .eq("source_id", sid)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) schedule(() => triggerOne(mediaType, sid).then(() => {
          qc.invalidateQueries({ queryKey: ["ai-tags-available"] });
        }));
      }, () => {
        // silent — enrichment is best-effort
      });
  }, [mediaType, id, qc]);
}

/**
 * Load a single enrichment row for a detail page.
 * Silent on failure — the page must render without enrichment.
 */
export function useEnrichmentRow(
  mediaType: EnrichmentMediaType | null,
  id: string | number | null | undefined,
) {
  return useQuery({
    queryKey: ["enrichment-row", mediaType, id ? String(id) : null],
    queryFn: async () => {
      if (!mediaType || !id) return null;
      const { data } = await supabase
        .from("media_enrichment")
        .select("media_type, source_id, tags, categories, description_de")
        .eq("media_type", mediaType)
        .eq("source_id", String(id))
        .maybeSingle();
      return (data as EnrichmentRow | null) ?? null;
    },
    enabled: !!mediaType && !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * All distinct AI tags actually stored in media_enrichment — used to render
 * the discovery filter-chip cloud. Refreshed every 10 minutes.
 */
export function useAvailableAiTags() {
  return useQuery({
    queryKey: ["ai-tags-available"],
    queryFn: async () => {
      const { data } = await supabase
        .from("media_enrichment")
        .select("tags")
        .limit(2000);
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        for (const t of (row as { tags?: string[] }).tags ?? []) {
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Merge extra tag names (from AI enrichment or another source) into a genre
// list, deduped case-insensitively. Extras get synthetic ids and are appended.
export function mergeEnrichmentIntoGenres<
  G extends { id: string | number; name: string },
>(genres: G[] | undefined | null, extraNames: (string | undefined | null)[] | undefined | null) {
  const list: Array<G | { id: string; name: string }> = [...(genres ?? [])];
  const seen = new Set(list.map((g) => g.name.toLowerCase()));
  for (const name of extraNames ?? []) {
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ id: `ai-${key}`, name });
  }
  return list;
}
