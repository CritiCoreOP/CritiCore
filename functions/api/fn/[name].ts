/**
 * Cloudflare Pages Function for /api/fn/<name>: a cache in front of the read-only Supabase
 * functions (TMDB, IGDB, AniList, OMDb, TVDB, status). The site sends the same POST body it would
 * send to Supabase; identical questions from any visitor or crawler are answered from Cloudflare's
 * cache and do not count as Supabase function invocations. Only misses reach Supabase.
 */
import { cacheKeyUrl, isCachedFunction, MAX_BODY, ttlFor } from "../../../src/lib/edgeCache";
import { isBot } from "../../../src/lib/bot";

interface FnEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** The same values the build uses; Cloudflare passes Pages variables to Functions too */
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: FnEnv;
  params: Record<string, string | string[]>;
  waitUntil(promise: Promise<unknown>): void;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const name = String(context.params.name ?? "");
  if (!isCachedFunction(name)) return json({ error: "Unknown function" }, 404);

  const text = await context.request.text();
  if (text.length > MAX_BODY) return json({ error: "Request too large" }, 413);
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const base = (context.env.SUPABASE_URL ?? context.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = context.env.SUPABASE_ANON_KEY ?? context.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!base || !key) return json({ error: "Supabase not configured" }, 503);

  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const origin = new URL(context.request.url).origin;
  const cacheKey = new Request(await cacheKeyUrl(origin, name, body));
  const hit = await cache?.match(cacheKey);
  if (hit) {
    const res = new Response(hit.body, hit);
    res.headers.set("X-Fn-Cache", "HIT");
    return res;
  }

  const upstream = await fetch(`${base}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      apikey: key,
      // Crawlers get the answer, but the function does not keep it in api_cache (supabase/functions/_shared/crawler.ts)
      ...(isBot(context.request.headers.get("User-Agent") ?? "") ? { "x-cc-crawler": "1" } : {}),
    },
    body: text || "{}",
  });
  const payload = await upstream.text();
  const headers = { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json; charset=utf-8" };

  // Errors are passed on but never kept, so a hiccup at TMDB does not stick for an hour
  if (!upstream.ok) return new Response(payload, { status: upstream.status, headers: { ...headers, "Cache-Control": "no-store", "X-Fn-Cache": "MISS" } });

  const ttl = ttlFor(name, body);
  const response = new Response(payload, { status: 200, headers: { ...headers, "Cache-Control": `public, max-age=${ttl}`, "X-Fn-Cache": "MISS" } });
  if (cache) context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
