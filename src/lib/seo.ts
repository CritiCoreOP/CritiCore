/**
 * SEO helper – sets meta tags, Open Graph, Twitter Card, canonical, hreflang alternates and JSON-LD.
 * Call once when detail-page data is available.
 */
import i18n from "@/i18n";
import { LANG_TO_LOCALE, SUPPORTED_LANGS } from "@/lib/routeTranslations";
import { localizedUrl } from "@/lib/sitemap";

interface SeoOptions {
  title: string;
  description: string;
  /** Canonical path with German segments ("/filme/603"); the language prefix and translation are added here */
  url: string;
  image?: string | null;
  type?: "article" | "website" | "video.movie" | "video.tv_show";
  jsonLd?: Record<string, unknown>;
  /** Language of the x-default version; an article's original language, otherwise German */
  defaultLang?: string;
}

const SITE_NAME = "CritiCore";

function getOrCreateMeta(attr: string, value: string): HTMLMetaElement {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr.includes("property") ? "property" : "name", value);
    document.head.appendChild(el);
  }
  return el;
}

function getOrCreateLink(rel: string): HTMLLinkElement {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  return el;
}

/**
 * <link rel="alternate" hreflang> for every language version of the page, the same set the sitemap
 * lists. x-default is German, for articles their original language. Pages with an absolute URL get none.
 */
function setAlternates(path: string | null, defaultLang = "de") {
  document.querySelectorAll("link[data-seo-hreflang]").forEach((el) => el.remove());
  if (!path) return;
  for (const lang of [...SUPPORTED_LANGS, "x-default"]) {
    const el = document.createElement("link");
    el.setAttribute("rel", "alternate");
    el.setAttribute("hreflang", lang);
    el.setAttribute("href", localizedUrl(path, lang === "x-default" ? defaultLang : lang));
    el.setAttribute("data-seo-hreflang", "");
    document.head.appendChild(el);
  }
}

/**
 * Canonical, og:url and language versions of a page from its route alone. RouteEffects calls this on
 * every navigation, so pages without their own setSeo no longer inherit the start page canonical
 * from index.html (which told Google they were copies of the start page). setSeo overrides it.
 */
export function setPageLinks(path: string, lang: string, defaultLang = "de") {
  const href = localizedUrl(path, LANG_TO_LOCALE[lang] ? lang : "de");
  getOrCreateLink("canonical").setAttribute("href", href);
  getOrCreateMeta("property", "og:url").setAttribute("content", href);
  setAlternates(path, defaultLang);
}

export function setSeo({ title, description, url, image, type = "website", jsonLd, defaultLang }: SeoOptions) {
  // The page in the language it is shown in. Without the prefix the canonical pointed at a URL that
  // only redirects, and did not match the sitemap
  const lang = (i18n.language || "de").slice(0, 2);
  const external = url.startsWith("http");
  const fullUrl = external ? url : localizedUrl(url, LANG_TO_LOCALE[lang] ? lang : "de");
  const desc = description.slice(0, 160);

  // Title
  document.title = title;

  // Basic meta
  getOrCreateMeta("name", "description").setAttribute("content", desc);

  // Open Graph
  getOrCreateMeta("property", "og:title").setAttribute("content", title);
  getOrCreateMeta("property", "og:description").setAttribute("content", desc);
  getOrCreateMeta("property", "og:type").setAttribute("content", type);
  getOrCreateMeta("property", "og:url").setAttribute("content", fullUrl);
  getOrCreateMeta("property", "og:site_name").setAttribute("content", SITE_NAME);
  if (image) {
    getOrCreateMeta("property", "og:image").setAttribute("content", image);
  }

  // Twitter Card
  getOrCreateMeta("name", "twitter:card").setAttribute("content", image ? "summary_large_image" : "summary");
  getOrCreateMeta("name", "twitter:title").setAttribute("content", title);
  getOrCreateMeta("name", "twitter:description").setAttribute("content", desc);
  if (image) {
    getOrCreateMeta("name", "twitter:image").setAttribute("content", image);
  }

  // Canonical and language versions
  getOrCreateLink("canonical").setAttribute("href", fullUrl);
  setAlternates(external ? null : url, defaultLang && LANG_TO_LOCALE[defaultLang] ? defaultLang : "de");

  // JSON-LD
  if (jsonLd) {
    let script = document.querySelector<HTMLScriptElement>('script[data-seo-jsonld]');
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({ "@context": "https://schema.org", ...jsonLd });
  }
}

/** Clean up JSON-LD on unmount */
export function cleanupSeo() {
  document.querySelector('script[data-seo-jsonld]')?.remove();
  document.querySelectorAll("link[data-seo-hreflang]").forEach((el) => el.remove());
}
