import { describe, expect, it, vi } from "vitest";
import { renderSitemap } from "./sitemapData";

const env = { VITE_SUPABASE_URL: "https://project.test", VITE_SUPABASE_PUBLISHABLE_KEY: "public-key" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("renderSitemap", () => {
  it("lists published articles; works before and after the published_at column exists", async () => {
    const article = { slug: "gta-6", title: "GTA 6", language: "de", updated_at: "2026-10-07T12:00:00Z", created_at: "2026-10-07T10:00:00Z", cover_image_url: null };
    const fetchFn = vi.fn(async (url: string) =>
      url.includes("published_at") ? json({ message: "column articles.published_at does not exist" }, 400) : json([article]),
    );
    const xml = await renderSitemap("articles", env, fetchFn as unknown as typeof fetch);
    expect(xml).toContain("<loc>https://criticore.cc/de-DE/news/gta-6</loc>");
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1][0]).toContain("published=eq.true");
  });

  it("keeps only games IGDB knows; old RAWG ids would be dead pages", async () => {
    const rows: Record<string, unknown[]> = {
      reviews: [{ media_type: "movie", media_id: 603, created_at: "2026-05-01T00:00:00Z" }],
      article_media_links: [{ media_type: "game", media_id: "52189", created_at: "2026-10-05T00:00:00Z" }],
      media_tags: [{ media_type: "game", media_id: "1004298", created_at: "2026-06-14T00:00:00Z" }],
      media_categories: [{ media_type: "tv", media_id: "1399", created_at: "2026-06-01T00:00:00Z" }],
    };
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/functions/v1/igdb")) {
        expect(String(init?.body)).toContain("52189,1004298");
        return json([{ id: 52189 }]);
      }
      const table = url.split("/rest/v1/")[1].split("?")[0];
      return json(rows[table]);
    });
    const xml = await renderSitemap("media", env, fetchFn as unknown as typeof fetch);
    expect(xml).toContain("<loc>https://criticore.cc/en-US/movies/603</loc>");
    expect(xml).toContain("<loc>https://criticore.cc/de-DE/games/52189</loc>");
    expect(xml).toContain("<loc>https://criticore.cc/fr-FR/series/1399</loc>");
    expect(xml).not.toContain("1004298");
  });

  it("renders the static pages without any request", async () => {
    const fetchFn = vi.fn();
    const xml = await renderSitemap("pages", {}, fetchFn as unknown as typeof fetch);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(xml).toContain("<loc>https://criticore.cc/en-US/imprint</loc>");
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/einstellungen");
  });

  it("fails loudly without the Supabase settings", async () => {
    await expect(renderSitemap("articles", {})).rejects.toThrow(/missing/);
  });
});
