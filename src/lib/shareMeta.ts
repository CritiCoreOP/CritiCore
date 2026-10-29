import { isOpinion, opinionWord } from "./article-labels";

/**
 * Link previews for shared articles. X, Bluesky, WhatsApp, Facebook and Discord read the HTML as
 * it comes from the server and run no JavaScript, so the meta tags the app sets later never reach
 * them: every shared article showed the general CritiCore card. The Pages Function
 * functions/[locale]/news/[slug].ts writes the article's own title, teaser and cover into the HTML.
 */

export interface ShareArticle {
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  article_type: string | null;
  language: string | null;
  published_at: string | null;
  created_at: string;
  /** Missing on databases without live blogs */
  live_status?: string | null;
}

export interface ShareMeta {
  title: string;
  description: string;
  image: string;
  url: string;
  locale: string;
  publishedTime: string;
}

export const DEFAULT_SHARE_IMAGE = "https://criticore.cc/og-image.jpg";

const OG_LOCALES: Record<string, string> = { de: "de_DE", en: "en_US", fr: "fr_FR", es: "es_ES", th: "th_TH" };
const LIVE_WORDS: Record<string, string> = { de: "LIVE", en: "LIVE", fr: "EN DIRECT", es: "EN DIRECTO", th: "สด" };

/** What a preview of this article shows; opinion pieces carry their label in the title */
export function articleShareMeta(article: ShareArticle, url: string): ShareMeta {
  const lang = article.language || "de";
  const labelled = isOpinion(article.article_type) ? `${opinionWord(lang, article.article_type)}: ${article.title}` : article.title;
  // A running live blog says so in the preview; once it ended the plain title is enough
  const title = article.live_status === "live" ? `${LIVE_WORDS[lang] ?? LIVE_WORDS.de}: ${labelled}` : labelled;
  const description = (article.excerpt || article.title).replace(/\s+/g, " ").trim().slice(0, 300);
  const image = article.cover_image_url && /^https:\/\//.test(article.cover_image_url) ? article.cover_image_url : DEFAULT_SHARE_IMAGE;
  return {
    title: `${title} – CritiCore News`,
    description,
    image,
    url,
    locale: OG_LOCALES[lang] ?? OG_LOCALES.de,
    publishedTime: article.published_at || article.created_at,
  };
}

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function setMeta(html: string, kind: "name" | "property", key: string, value: string): string {
  const pattern = new RegExp(`(<meta\\s+${kind}="${key.replace(/[:.]/g, "\\$&")}"\\s+content=")[^"]*(")`);
  return pattern.test(html) ? html.replace(pattern, `$1${attr(value)}$2`) : html.replace("</head>", `  <meta ${kind}="${key}" content="${attr(value)}" />\n</head>`);
}

/** The index.html with the article's preview tags; tags it lacks are added before </head> */
export function injectShareMeta(html: string, meta: ShareMeta): string {
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${attr(meta.title)}</title>`);
  out = setMeta(out, "name", "description", meta.description);
  out = setMeta(out, "property", "og:type", "article");
  out = setMeta(out, "property", "og:title", meta.title);
  out = setMeta(out, "property", "og:description", meta.description);
  out = setMeta(out, "property", "og:image", meta.image);
  out = setMeta(out, "property", "og:url", meta.url);
  out = setMeta(out, "property", "og:locale", meta.locale);
  out = setMeta(out, "name", "twitter:title", meta.title);
  out = setMeta(out, "name", "twitter:description", meta.description);
  out = setMeta(out, "name", "twitter:image", meta.image);
  out = setMeta(out, "property", "article:published_time", meta.publishedTime);
  return out;
}
