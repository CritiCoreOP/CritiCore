import { useQuery } from "@tanstack/react-query";
import { getTvdbSeriesLink, getTvdbSeriesDetail, type TvdbSeries } from "@/lib/api";

/**
 * Lazy TVDB enrichment for a TMDB series.
 *
 * Two-step: resolve TMDB→TVDB id via the server-cached `tvdb-link` function
 * (7d TTL), then fetch `/series/{id}/extended`. Any failure or negative match
 * yields `undefined` so callers can conditionally render — no error UI, no
 * layout shift.
 */
export function useTvdbSeriesEnrichment(params: {
  tmdbId: string | number | undefined;
  name: string | undefined;
  year?: string | number | null;
  enabled?: boolean;
}) {
  const { tmdbId, name, year, enabled = true } = params;

  return useQuery<TvdbSeries | null>({
    queryKey: ["tvdb-enrich", "series", String(tmdbId ?? "")],
    enabled: enabled && !!tmdbId && !!name,
    staleTime: 1000 * 60 * 60 * 24, // 24h client cache; server caches 7d
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
    queryFn: async () => {
      try {
        const link = await getTvdbSeriesLink({
          tmdbId: tmdbId!,
          name: name!,
          year: year ?? null,
        });
        if (!link?.tvdb_id) return null;
        const detail = await getTvdbSeriesDetail(link.tvdb_id);
        return detail ?? null;
      } catch {
        return null;
      }
    },
  });
}
