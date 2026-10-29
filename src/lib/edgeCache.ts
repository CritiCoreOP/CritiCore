/**
 * Shared rules for the Cloudflare cache in front of the read-only Supabase functions
 * (functions/api/fn/[name].ts). Every visitor and every crawler asks the same TMDB, IGDB or
 * AniList questions; answered from Cloudflare's cache they no longer count as Supabase function
 * invocations, which the Free plan limits to 500 000 a month.
 */

export type CachedFunction = "tmdb" | "igdb" | "anilist" | "omdb" | "tvdb" | "tvdb-link" | "api-status";

export const CACHED_FUNCTIONS: CachedFunction[] = ["tmdb", "igdb", "anilist", "omdb", "tvdb", "tvdb-link", "api-status"];

export const isCachedFunction = (name: string): name is CachedFunction => (CACHED_FUNCTIONS as string[]).includes(name);

const MIN = 60;
const HOUR = 3600;
const DAY = 86_400;

/** Largest request body the cache forwards; the real ones are a few hundred bytes */
export const MAX_BODY = 8 * 1024;

/** How long an answer may come from the cache, in seconds; lists change faster than details */
export function ttlFor(name: CachedFunction, body: unknown): number {
  const b = (body ?? {}) as Record<string, unknown>;
  switch (name) {
    case "api-status":
      return 2 * MIN;
    case "tmdb": {
      const endpoint = String(b.endpoint ?? "");
      if (endpoint.startsWith("/search")) return 30 * MIN;
      if (/^\/(trending|discover)|\/(popular|top_rated|now_playing|upcoming|on_the_air|airing_today)$/.test(endpoint)) return HOUR;
      return 12 * HOUR;
    }
    case "igdb":
      return String(b.endpoint ?? "") === "/popularity_primitives" ? HOUR : 6 * HOUR;
    case "anilist":
      return b.op === "detail" ? 12 * HOUR : HOUR;
    case "omdb":
    case "tvdb":
      return DAY;
    case "tvdb-link":
      return 7 * DAY;
  }
}

/** Stable JSON: the same request with keys in another order hits the same cache entry */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Cache key as a GET URL (the Cache API only stores GET requests) */
export async function cacheKeyUrl(origin: string, name: CachedFunction, body: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(body));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${origin}/__fn-cache/${name}/${hex}`;
}
