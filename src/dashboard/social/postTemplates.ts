import { isOpinion, opinionWord } from "@/lib/article-labels";
/** Ready-to-post texts for an article, one per platform, within each platform's length limit */

export type Platform = "x" | "bluesky" | "threads" | "instagram" | "facebook";

export const PLATFORMS: Platform[] = ["x", "bluesky", "threads", "instagram", "facebook"];

interface PlatformSpec {
  name: string;
  /** Characters allowed in one post; null: no practical limit */
  limit: number | null;
  /** Instagram captions cannot link, so the post points to the bio */
  linkInText: boolean;
  /** How many hashtags fit the platform's habits */
  hashtags: number;
}

export const PLATFORM_SPECS: Record<Platform, PlatformSpec> = {
  x: { name: "X", limit: 280, linkInText: true, hashtags: 2 },
  bluesky: { name: "Bluesky", limit: 300, linkInText: true, hashtags: 2 },
  threads: { name: "Threads", limit: 500, linkInText: true, hashtags: 1 },
  instagram: { name: "Instagram", limit: 2200, linkInText: false, hashtags: 6 },
  facebook: { name: "Facebook", limit: null, linkInText: true, hashtags: 1 },
};

export interface PostArticle {
  title: string;
  excerpt: string | null;
  url: string;
  /** Article slugs as stored: "games", "movies", "series", "general", "patchnotes" */
  category: string | null;
  articleType: string | null;
  /** Language of the article; the fixed words follow it */
  language: string;
}

const CATEGORY_TAGS: Record<string, Record<string, string>> = {
  de: { games: "Gaming", movies: "Filme", series: "Serien", patchnotes: "Patchnotes" },
  en: { games: "Gaming", movies: "Movies", series: "TVSeries", patchnotes: "PatchNotes" },
  fr: { games: "JeuxVideo", movies: "Cinema", series: "Series", patchnotes: "PatchNotes" },
  es: { games: "Videojuegos", movies: "Cine", series: "Series", patchnotes: "PatchNotes" },
  th: { games: "เกม", movies: "หนัง", series: "ซีรีส์", patchnotes: "PatchNotes" },
};

const TYPE_TAGS: Record<string, Record<string, string>> = {
  de: { review: "Review", interview: "Interview" },
  en: { review: "Review", interview: "Interview" },
  fr: { review: "Critique", interview: "Interview" },
  es: { review: "Reseña", interview: "Entrevista" },
  th: { review: "รีวิว", interview: "สัมภาษณ์" },
};

const EXTRA_TAGS: Record<string, string[]> = {
  de: ["News", "Popkultur", "Entertainment"],
  en: ["News", "PopCulture", "Entertainment"],
  fr: ["Actu", "PopCulture", "Divertissement"],
  es: ["Noticias", "CulturaPop", "Entretenimiento"],
  th: ["ข่าว", "ป๊อปคัลเจอร์", "บันเทิง"],
};

const LINK_IN_BIO: Record<string, string> = {
  de: "Link in der Bio",
  en: "Link in bio",
  fr: "Lien en bio",
  es: "Enlace en la bio",
  th: "ลิงก์ในไบโอ",
};

/** X counts every link as 23 characters, whatever its length */
const X_LINK = 23;

export function hashtags(article: PostArticle, count: number): string[] {
  const lang = CATEGORY_TAGS[article.language] ? article.language : "en";
  const tags = [
    "CritiCore",
    article.category ? CATEGORY_TAGS[lang][article.category] : undefined,
    article.articleType ? TYPE_TAGS[lang][article.articleType] : undefined,
    ...EXTRA_TAGS[lang],
  ].filter((t): t is string => !!t);
  return Array.from(new Set(tags)).slice(0, count).map((t) => `#${t}`);
}

/** Length as the platform counts it */
export function postLength(platform: Platform, text: string): number {
  // Code points, so an emoji counts once and not as two UTF-16 halves
  const count = (s: string) => Array.from(s).length;
  if (platform !== "x") return count(text);
  const urls: string[] = text.match(/https?:\/\/\S+/g) ?? [];
  return count(urls.reduce((rest, url) => rest.replace(url, ""), text)) + urls.length * X_LINK;
}

/** Shortens at a word boundary and marks the cut */
function shorten(text: string, max: number): string {
  if (max <= 1) return "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Opinion pieces open with the label in capitals, so a post never passes one off as news */
export function postTitle(article: Pick<PostArticle, "title" | "articleType" | "language">): string {
  return isOpinion(article.articleType) ? `${opinionWord(article.language, article.articleType).toUpperCase()}: ${article.title}` : article.title;
}

export function buildPost(platform: Platform, article: PostArticle): string {
  const spec = PLATFORM_SPECS[platform];
  const title = postTitle(article);
  const tags = hashtags(article, spec.hashtags).join(" ");
  const link = spec.linkInText ? article.url : LINK_IN_BIO[article.language] ?? LINK_IN_BIO.en;
  const excerpt = (article.excerpt ?? "").replace(/\s+/g, " ").trim();
  const compose = (title: string, body: string) => [title, body, link, tags].filter(Boolean).join("\n\n");

  if (spec.limit === null) return compose(title, excerpt);
  const room = spec.limit - postLength(platform, compose(title, ""));
  if (room >= 0) {
    // The excerpt gets what is left, with the two line breaks before it
    return compose(title, room > 20 ? shorten(excerpt, room - 2) : "");
  }
  // Even the title is too long: shorten it (the label stays at the front) and leave out the excerpt
  return compose(shorten(title, title.length + room), "");
}
