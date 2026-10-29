import { articlePage, mediaPage, mergeMedia, newsSitemap, STATIC_PATHS, urlset, type SitemapArticle, type SitemapMedia, type SitemapPage } from "./sitemap";

/**
 * Loads what the sitemaps list and renders them. Runs in the Cloudflare Pages Function
 * (functions/sitemaps/[name].ts), not in the app. It reads only public data with the publishable
 * key: published articles, reviews, curated tags and categories, media linked in articles.
 */

export interface SitemapEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** The same values the build uses; Cloudflare passes Pages variables to Functions too */
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

type Fetch = typeof fetch;

function client(env: SitemapEnv, fetchFn: Fetch) {
  const base = (env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!base || !key) throw new Error("Supabase URL or publishable key missing in the Pages environment");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  return {
    async rest<T>(path: string): Promise<T> {
      const res = await fetchFn(`${base}/rest/v1/${path}`, { headers });
      if (!res.ok) throw new Error(`${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as T;
    },
    async igdb<T>(query: string): Promise<T> {
      const res = await fetchFn(`${base}/functions/v1/igdb`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "/games", query }),
      });
      if (!res.ok) throw new Error(`igdb ${res.status}`);
      return (await res.json()) as T;
    },
  };
}

const ARTICLE_COLUMNS = "slug,title,language,updated_at,created_at,cover_image_url";

async function loadArticles(api: ReturnType<typeof client>): Promise<SitemapArticle[]> {
  const query = (cols: string) => `articles?select=${cols}&published=eq.true&order=updated_at.desc&limit=5000`;
  try {
    return await api.rest<SitemapArticle[]>(query(`${ARTICLE_COLUMNS},published_at`));
  } catch {
    // published_at comes with migration 20261008120000; until it is applied the column is missing
    return await api.rest<SitemapArticle[]>(query(ARTICLE_COLUMNS));
  }
}

interface MediaRow {
  media_type: string;
  media_id: string | number;
  created_at: string | null;
}

/**
 * Titles CritiCore has something of its own about. Game ids are checked against IGDB first: tags
 * from before the switch to IGDB still hold RAWG ids, whose pages would show nothing.
 */
async function loadMedia(api: ReturnType<typeof client>): Promise<SitemapPage[]> {
  const sources = ["reviews", "article_media_links", "media_tags", "media_categories"];
  const lists = await Promise.all(
    sources.map(async (table) => {
      const rows = await api.rest<MediaRow[]>(`${table}?select=media_type,media_id,created_at&limit=5000`);
      return rows.map((r): SitemapMedia => ({ type: r.media_type, id: String(r.media_id), lastmod: r.created_at }));
    }),
  );
  const media = mergeMedia(lists);

  const gameIds = media.filter((m) => m.type === "game" && /^\d+$/.test(m.id)).map((m) => m.id);
  let validGames = new Set<string>();
  if (gameIds.length) {
    try {
      const found = await api.igdb<{ id: number }[]>(`fields id; where id = (${gameIds.join(",")}); limit 500;`);
      validGames = new Set((Array.isArray(found) ? found : []).map((g) => String(g.id)));
    } catch (e) {
      // Without the check, no games: a dead page in the sitemap is worse than a missing one
      console.error("sitemap: IGDB check failed", e);
    }
  }

  return media
    .filter((m) => m.type !== "game" || validGames.has(m.id))
    .map(mediaPage)
    .filter((p): p is SitemapPage => p !== null);
}

export type SitemapName = "pages" | "articles" | "news" | "media";

export async function renderSitemap(name: SitemapName, env: SitemapEnv, fetchFn: Fetch = fetch): Promise<string> {
  if (name === "pages") return urlset(STATIC_PATHS.map((path) => ({ path })));
  const api = client(env, fetchFn);
  if (name === "media") return urlset(await loadMedia(api));
  const articles = await loadArticles(api);
  return name === "news" ? newsSitemap(articles) : urlset(articles.map(articlePage));
}
