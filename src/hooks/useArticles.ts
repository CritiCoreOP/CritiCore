import { useQuery } from "@tanstack/react-query";

/** Site identifier in the shared CMS database for this project. */
export const CMS_SITE_NAME = "criticore";

/** Base URL of the shared CMS public API. */
const CMS_API_BASE = "https://write.tgn.news/api/public/articles";

export interface CmsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_id: string;
}

async function fetchArticles(site: string): Promise<CmsArticle[]> {
  const res = await fetch(`${CMS_API_BASE}?site=${encodeURIComponent(site)}`);
  if (!res.ok) throw new Error(`Failed to load articles (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchArticle(site: string, slug: string): Promise<CmsArticle | null> {
  const res = await fetch(
    `${CMS_API_BASE}?site=${encodeURIComponent(site)}&slug=${encodeURIComponent(slug)}`
  );
  if (!res.ok) throw new Error(`Failed to load article (${res.status})`);
  const data = await res.json();
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/** Loads all published articles for the given site from the shared CMS. */
export function useArticles(site: string = CMS_SITE_NAME) {
  return useQuery({
    queryKey: ["cms-articles", site],
    queryFn: () => fetchArticles(site),
    staleTime: 5 * 60 * 1000,
    // Default is 3 retries with backoff: the skeleton stayed for ~10 s before the error message showed
    retry: 1,
  });
}

/** Loads a single published article by slug from the shared CMS. */
export function useArticle(slug: string | undefined, site: string = CMS_SITE_NAME) {
  return useQuery({
    queryKey: ["cms-article", site, slug],
    queryFn: () => fetchArticle(site, slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
