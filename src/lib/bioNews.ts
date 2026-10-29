export interface BioArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  article_type: string;
  language: string | null;
  translation_group: string | null;
  published_at: string | null;
  created_at: string;
}

/**
 * The newest stories, each once: of an article and its translations (same translation_group) only
 * the version in the visitor's language stays, else the first one in the list (the newest).
 */
export function pickLatest(articles: BioArticle[], lang: string, count: number): BioArticle[] {
  const chosen = new Map<string, BioArticle>();
  const order: string[] = [];
  for (const a of articles) {
    const key = a.translation_group || a.id;
    const current = chosen.get(key);
    if (!current) {
      chosen.set(key, a);
      order.push(key);
    } else if ((current.language || "de") !== lang && (a.language || "de") === lang) {
      chosen.set(key, a);
    }
  }
  return order.slice(0, count).map((key) => chosen.get(key)!);
}

/** When an article came out: published_at since 2026-10-08, created_at for older rows */
export const publishedAt = (a: Pick<BioArticle, "published_at" | "created_at">) => a.published_at || a.created_at;
