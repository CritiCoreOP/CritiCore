/**
 * Cloudflare Pages Function for /media/yt/<id>.jpg (thumbnail) and /media/yt/<id>.json (title and
 * channel) of YouTube videos in articles. The reader's browser only talks to criticore.cc: this
 * function fetches from YouTube itself, without cookies or the reader's address, and keeps the
 * answer in Cloudflare's cache. Before, articles showed no preview at all, because loading it from
 * YouTube directly would have contacted Google before the reader clicked play.
 */

interface PagesContext {
  request: Request;
  params: Record<string, string | string[]>;
  next(): Promise<Response>;
  waitUntil(promise: Promise<unknown>): void;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const WEEK = 7 * 24 * 3600;
const DAY = 24 * 3600;

async function thumbnail(id: string): Promise<Response> {
  // maxresdefault only exists for HD uploads; hqdefault always does (4:3 with bars, cropped by the player)
  for (const size of ["maxresdefault", "hqdefault"]) {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`, { cf: { cacheTtl: WEEK } } as RequestInit);
    if (res.ok) {
      return new Response(res.body, {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": `public, max-age=${WEEK}` },
      });
    }
  }
  return new Response("Not found", { status: 404, headers: { "Cache-Control": `public, max-age=${DAY}` } });
}

async function meta(id: string): Promise<Response> {
  const watch = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
  const res = await fetch(`https://www.youtube.com/oembed?url=${watch}&format=json`);
  if (!res.ok) return new Response("Not found", { status: 404, headers: { "Cache-Control": `public, max-age=${DAY}` } });
  const data = (await res.json()) as { title?: string; author_name?: string };
  // Only the two fields the page shows; oEmbed's HTML snippet would be an iframe
  return new Response(JSON.stringify({ title: data.title ?? null, author: data.author_name ?? null }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${DAY}` },
  });
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const match = /^([A-Za-z0-9_-]{11})\.(jpg|json)$/.exec(String(context.params.file ?? ""));
  if (!match || !YOUTUBE_ID.test(match[1])) return context.next();
  const [, id, kind] = match;

  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const cached = await cache?.match(context.request);
  if (cached) return cached;

  try {
    const response = kind === "jpg" ? await thumbnail(id) : await meta(id);
    if (cache && response.ok) context.waitUntil(cache.put(context.request, response.clone()));
    return response;
  } catch (e) {
    console.error(`youtube ${kind} ${id}:`, e instanceof Error ? e.message : e);
    return new Response("Unavailable", { status: 503, headers: { "Retry-After": "300" } });
  }
}

export async function onRequestHead(context: PagesContext): Promise<Response> {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, headers: response.headers });
}
