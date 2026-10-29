import { supabase } from "@/integrations/supabase/client";
import { canonicalJson, ttlFor, type CachedFunction } from "./edgeCache";

/**
 * Calls a read-only Supabase function (TMDB, IGDB, AniList, OMDb, TVDB, status) the cheap way:
 * - the same question twice within a few minutes is answered from memory, so remounts and
 *   refetches on tab focus cost nothing;
 * - on the live site the request goes to /api/fn/<name>, which answers from Cloudflare's cache
 *   and only asks Supabase on a miss (functions/api/fn/[name].ts);
 * - in development, and if that route is missing, it calls Supabase directly as before.
 */

const MEMORY_MAX_MS = 10 * 60_000;
const MEMORY_MAX_ENTRIES = 400;

const memory = new Map<string, { at: number; ttl: number; promise: Promise<unknown> }>();

export class EdgeCallError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function direct<T>(name: CachedFunction, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    throw new EdgeCallError(error.message || `Edge function ${name} failed`, status);
  }
  if (data == null) throw new EdgeCallError(`Edge function ${name} returned no data`);
  return data as T;
}

async function viaCache<T>(name: CachedFunction, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/fn/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // No cache route (a preview without Functions): the static site answers 404/405 with HTML
  const isJson = (res.headers.get("Content-Type") ?? "").includes("json");
  if (!isJson && (res.status === 404 || res.status === 405)) return direct<T>(name, body);
  // Cache route broken or not configured: the site keeps working, it only costs a direct call
  if (res.status >= 500) return direct<T>(name, body);
  if (!res.ok) throw new EdgeCallError(`Edge function ${name} returned ${res.status}`, res.status);
  const data = (await res.json()) as T;
  if (data == null) throw new EdgeCallError(`Edge function ${name} returned no data`);
  return data;
}

export function callEdge<T>(name: CachedFunction, body: Record<string, unknown> = {}): Promise<T> {
  const key = `${name}:${canonicalJson(body)}`;
  const now = Date.now();
  const hit = memory.get(key);
  if (hit && now - hit.at < hit.ttl) return hit.promise as Promise<T>;

  const promise = import.meta.env.DEV ? direct<T>(name, body) : viaCache<T>(name, body);
  memory.set(key, { at: now, ttl: Math.min(MEMORY_MAX_MS, ttlFor(name, body) * 1000), promise });
  // A failed request must not be remembered
  promise.catch(() => {
    if (memory.get(key)?.promise === promise) memory.delete(key);
  });
  if (memory.size > MEMORY_MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  return promise;
}

/** For tests */
export function clearEdgeMemory() {
  memory.clear();
}
