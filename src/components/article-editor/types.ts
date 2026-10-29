import { normalizeUrl } from "./utils";

/** Who the cover picture is from, as typed in the editor */
export interface CoverCredit {
  credit: string;
  url: string;
}

export const EMPTY_COVER_CREDIT: CoverCredit = { credit: "", url: "" };

/**
 * Database columns for the cover credit. Left out while they are empty and the database may not
 * have them yet (migration 20261009120000), so saving keeps working before it is applied. The link
 * only counts together with a credit text, and neither without a cover.
 */
export function coverCreditColumns(cover: string | null, value: CoverCredit, columnsExist: boolean) {
  const credit = cover ? value.credit.trim().replace(/\s+/g, " ").slice(0, 160) || null : null;
  const url = credit ? normalizeUrl(value.url) : null;
  if (!columnsExist && !credit) return {};
  return { cover_image_credit: credit, cover_image_credit_url: url };
}

export interface DraftData {
  title: string;
  excerpt: string;
  category: string;
  articleType: string;
  coverImage: string | null;
  coverCredit?: CoverCredit;
  content: string;
  savedAt: number;
}

export interface ArticleData {
  id?: string;
  title: string;
  excerpt: string;
  category: string;
  articleType: string;
  coverImage: string | null;
  content: string;
  tgnPlus: boolean;
  published: boolean;
  slug?: string;
}

export const AUTOSAVE_KEY = "article-draft-autosave";
export const AUTOSAVE_INTERVAL = 30_000;

export const CATEGORY_MAP: Record<string, string> = {
  general: "general",
  games: "games",
  movies: "movies",
  series: "series",
  patchnotes: "patchnotes",
};

export const ARTICLE_TYPE_MAP: Record<string, string> = {
  news: "news",
  review: "review",
  opinion: "opinion",
};

export const slugify = (text: string) =>
  text.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
