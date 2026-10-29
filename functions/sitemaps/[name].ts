/**
 * Cloudflare Pages Function for /sitemaps/pages.xml, articles.xml, news.xml and media.xml.
 * The index (/sitemap.xml) is a static file in public/. Every other path under /sitemaps/ falls
 * through to the static assets. Answers are kept in Cloudflare's cache, so Supabase sees at most
 * one request per sitemap and hour (news: a quarter of an hour) and data centre.
 */
import { renderSitemap, type SitemapEnv, type SitemapName } from "../../src/lib/sitemapData";

interface PagesContext {
  request: Request;
  env: SitemapEnv;
  params: Record<string, string | string[]>;
  next(): Promise<Response>;
  waitUntil(promise: Promise<unknown>): void;
}

const MAX_AGE: Record<SitemapName, number> = { pages: 86_400, articles: 3_600, news: 900, media: 3_600 };

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const file = String(context.params.name ?? "");
  const match = /^(pages|articles|news|media)\.xml$/.exec(file);
  if (!match) return context.next();
  const name = match[1] as SitemapName;

  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const cached = await cache?.match(context.request);
  if (cached) return cached;

  try {
    const xml = await renderSitemap(name, context.env);
    const response = new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": `public, max-age=${MAX_AGE[name]}`,
        // A sitemap is for crawlers, not a page of its own in the results
        "X-Robots-Tag": "noindex",
      },
    });
    if (cache) context.waitUntil(cache.put(context.request, response.clone()));
    return response;
  } catch (e) {
    console.error(`sitemap ${name}:`, e instanceof Error ? e.message : e);
    // 503 + Retry-After: crawlers come back later instead of dropping the URLs
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
  }
}

/** HEAD fell through to the app and answered with HTML; it now gets the sitemap's status and headers */
export async function onRequestHead(context: PagesContext): Promise<Response> {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, headers: response.headers });
}
