import { supabase } from "@/integrations/supabase/client";
import type { SearchResultPage } from "@/lib/api";

export const ARTICLE_SEARCH_PAGE_SIZE = 12;

export interface ArticleSearchHit {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  article_type: string;
  category: string | null;
  created_at: string;
}

/**
 * Published articles whose title or teaser contains the term.
 * The term goes into a PostgREST or() filter: commas, brackets and quotes would break its syntax,
 * % and * are LIKE wildcards, so those are dropped instead of escaped.
 */
export async function searchArticles(query: string, page = 1): Promise<SearchResultPage<ArticleSearchHit>> {
  const term = query.replace(/[%*,()"\\]/g, " ").replace(/\s+/g, " ").trim();
  if (term.length < 2) return { results: [], total: 0, hasMore: false };

  const from = (page - 1) * ARTICLE_SEARCH_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, cover_image_url, article_type, category, created_at", { count: "exact" })
    .eq("published", true)
    .or(`title.ilike."%${term}%",excerpt.ilike."%${term}%"`)
    .order("created_at", { ascending: false })
    .range(from, from + ARTICLE_SEARCH_PAGE_SIZE - 1);

  if (error) throw error;
  const results = (data ?? []) as ArticleSearchHit[];
  const total = count ?? null;
  return { results, total, hasMore: total != null ? from + results.length < total : results.length === ARTICLE_SEARCH_PAGE_SIZE };
}
