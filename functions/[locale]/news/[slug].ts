/**
 * Cloudflare Pages Function for /<locale>/news/<slug>: the app's index.html with the article's own
 * title, teaser and cover in the meta tags, so links shared on X, Bluesky, WhatsApp, Facebook or
 * Discord show the article instead of the general CritiCore card (those crawlers run no JavaScript).
 * Everything else under the path (the editor at /news/schreiben, drafts, unknown slugs) gets the
 * page unchanged. The article is kept in Cloudflare's cache for ten minutes per data centre.
 */
import { articleShareMeta, injectShareMeta, type ShareArticle } from "../../../src/lib/shareMeta";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** The same values the build uses; Cloudflare passes Pages variables to Functions too */
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  next(): Promise<Response>;
  waitUntil(promise: Promise<unknown>): void;
}

const TTL = 600;
const COLUMNS = "title,excerpt,cover_image_url,article_type,language,published_at,created_at";
const LIVE_COLUMNS = `${COLUMNS},live_status`;

async function loadArticle(slug: string, context: PagesContext): Promise<ShareArticle | null> {
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const key = new Request(`https://share-meta.criticore.internal/${encodeURIComponent(slug)}`);
  const hit = await cache?.match(key);
  if (hit) return (await hit.json()) as ShareArticle | null;

  const base = (context.env.SUPABASE_URL ?? context.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const apiKey = context.env.SUPABASE_ANON_KEY ?? context.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!base || !apiKey) return null;
  const ask = (columns: string) =>
    fetch(`${base}/rest/v1/articles?select=${columns}&slug=eq.${encodeURIComponent(slug)}&published=eq.true&limit=1`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
    });
  let res = await ask(LIVE_COLUMNS);
  // 400: the database does not have live_status yet; the preview works without it
  if (res.status === 400) res = await ask(COLUMNS);
  if (!res.ok) return null;
  const rows = (await res.json()) as ShareArticle[];
  const article = rows[0] ?? null;
  // Unknown slugs are kept too, so the editor's paths do not ask Supabase on every visit
  if (cache) context.waitUntil(cache.put(key, new Response(JSON.stringify(article), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${TTL}` } })));
  return article;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const page = await context.next();
  if (!page.ok || !(page.headers.get("Content-Type") ?? "").includes("text/html")) return page;
  const slug = String(context.params.slug ?? "");
  if (!/^[a-z0-9][a-z0-9-]{0,199}$/i.test(slug)) return page;

  let article: ShareArticle | null = null;
  try {
    article = await loadArticle(slug, context);
  } catch {
    // The page works without the preview tags; never fail the article because of them
  }
  if (!article) return page;

  const url = new URL(context.request.url);
  const html = injectShareMeta(await page.text(), articleShareMeta(article, `${url.origin}${url.pathname}`));
  const headers = new Headers(page.headers);
  headers.delete("Content-Length");
  return new Response(html, { status: page.status, headers });
}
