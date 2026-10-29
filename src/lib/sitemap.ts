import { LANG_TO_LOCALE, SUPPORTED_LANGS, translatePath } from "./routeTranslations";

/**
 * Builds the XML of the sitemaps. Pure functions without network access: the Cloudflare Pages
 * Function in functions/sitemaps loads the data and calls these. Every page exists in all five
 * languages (articles are translated when read), so each URL lists the others as hreflang
 * alternates and every language version is its own entry, as Google asks for.
 */

export const SITE_URL = "https://criticore.cc";

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Absolute URL of a canonical (German) path in one language, e.g. ("/filme/1", "en") → …/en-US/movies/1 */
export const localizedUrl = (path: string, lang: string) => {
  const localized = translatePath(path, lang);
  return `${SITE_URL}/${LANG_TO_LOCALE[lang] ?? LANG_TO_LOCALE.de}${localized === "/" ? "/" : localized}`;
};

const day = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);

export interface SitemapPage {
  /** Canonical path with German segments, e.g. "/news/mein-artikel" */
  path: string;
  lastmod?: string | null;
  /** Language whose version is the default for x-default (the article's original language) */
  defaultLang?: string;
  images?: string[];
}

/** One <url> per language, each with the full set of alternates */
function pageEntries(page: SitemapPage): string[] {
  const alternates = [
    ...SUPPORTED_LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(localizedUrl(page.path, l))}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(page.path, page.defaultLang ?? "de"))}"/>`,
  ].join("\n");
  const lastmod = day(page.lastmod);
  const images = (page.images ?? [])
    .filter((src) => /^https:\/\//.test(src))
    .map((src) => `    <image:image><image:loc>${escapeXml(src)}</image:loc></image:image>`)
    .join("\n");
  return SUPPORTED_LANGS.map((lang) =>
    [
      "  <url>",
      `    <loc>${escapeXml(localizedUrl(page.path, lang))}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
      alternates,
      images || null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export function urlset(pages: SitemapPage[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.flatMap(pageEntries).join("\n")}
</urlset>
`;
}

/**
 * Public pages without parameters. Private ones (account, settings, editor, admin) and test pages
 * stay out; they are not meant to be found through search.
 */
export const STATIC_PATHS = [
  "/",
  "/filme",
  "/serien",
  "/games",
  "/anime",
  "/news",
  "/entdecken",
  "/umfragen",
  "/presse",
  "/roadmap",
  "/developers",
  "/status",
  "/spenden",
  "/support",
  "/transparenz",
  "/ueber-uns",
  "/jobs",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/dmca",
];

export interface SitemapArticle {
  slug: string;
  title: string;
  language: string | null;
  updated_at: string;
  created_at: string;
  published_at?: string | null;
  cover_image_url: string | null;
}

export const articlePage = (a: SitemapArticle): SitemapPage => ({
  path: `/news/${encodeURIComponent(a.slug)}`,
  lastmod: a.updated_at,
  defaultLang: a.language && LANG_TO_LOCALE[a.language] ? a.language : "de",
  images: a.cover_image_url ? [a.cover_image_url] : [],
});

/**
 * Google News sitemap: articles of the last two days, in their original language only. Google
 * News ignores older entries; the regular article sitemap lists everything.
 */
export function newsSitemap(articles: SitemapArticle[], now = Date.now()): string {
  const recent = articles.filter((a) => now - new Date(a.published_at ?? a.created_at).getTime() < 2 * 86_400_000);
  const entries = recent.map((a) => {
    const lang = a.language && LANG_TO_LOCALE[a.language] ? a.language : "de";
    return `  <url>
    <loc>${escapeXml(localizedUrl(`/news/${encodeURIComponent(a.slug)}`, lang))}</loc>
    <news:news>
      <news:publication>
        <news:name>CritiCore</news:name>
        <news:language>${lang}</news:language>
      </news:publication>
      <news:publication_date>${new Date(a.published_at ?? a.created_at).toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>
  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join("\n")}
</urlset>
`;
}

export type MediaKind = "movie" | "series" | "game" | "anime";

/** Detail route of a media type as stored in the database ("tv" is the older name of "series") */
export const MEDIA_ROUTE: Record<string, string> = { movie: "/filme", series: "/serien", tv: "/serien", game: "/games", anime: "/anime" };

export interface SitemapMedia {
  type: string;
  id: string;
  lastmod?: string | null;
}

export const mediaPage = (m: SitemapMedia): SitemapPage | null =>
  MEDIA_ROUTE[m.type] && /^\d+$/.test(m.id) ? { path: `${MEDIA_ROUTE[m.type]}/${m.id}`, lastmod: m.lastmod } : null;

/** Media referenced by several sources, once each with the newest date */
export function mergeMedia(lists: SitemapMedia[][]): SitemapMedia[] {
  const map = new Map<string, SitemapMedia>();
  for (const m of lists.flat()) {
    const type = m.type === "tv" ? "series" : m.type;
    const key = `${type}:${m.id}`;
    const prev = map.get(key);
    if (!prev || (m.lastmod && (!prev.lastmod || m.lastmod > prev.lastmod))) map.set(key, { type, id: String(m.id), lastmod: m.lastmod ?? prev?.lastmod });
  }
  return [...map.values()];
}

export const SITEMAPS = ["pages", "articles", "news", "media"] as const;

export function sitemapIndex(lastmod?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAPS.map(
  (name) => `  <sitemap>
    <loc>${SITE_URL}/sitemaps/${name}.xml</loc>${lastmod ? `\n    <lastmod>${day(lastmod)}</lastmod>` : ""}
  </sitemap>`,
).join("\n")}
</sitemapindex>
`;
}
