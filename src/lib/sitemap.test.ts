import { describe, expect, it } from "vitest";
import { articlePage, localizedUrl, mediaPage, mergeMedia, newsSitemap, sitemapIndex, urlset } from "./sitemap";

describe("sitemap", () => {
  it("builds localized URLs with translated segments", () => {
    expect(localizedUrl("/", "de")).toBe("https://criticore.cc/de-DE/");
    expect(localizedUrl("/filme/603", "en")).toBe("https://criticore.cc/en-US/movies/603");
    expect(localizedUrl("/news/gta-6", "fr")).toBe("https://criticore.cc/fr-FR/actualites/gta-6");
    expect(localizedUrl("/datenschutz", "es")).toBe("https://criticore.cc/es-ES/privacidad");
  });

  it("lists every language version with all alternates and the original as x-default", () => {
    const xml = urlset([
      articlePage({
        slug: "gta-6",
        title: "GTA 6",
        language: "en",
        updated_at: "2026-10-07T12:00:00Z",
        created_at: "2026-10-06T12:00:00Z",
        cover_image_url: "https://example.supabase.co/storage/v1/object/public/a.jpg",
      }),
    ]);
    expect(xml.match(/<url>/g)).toHaveLength(5);
    expect(xml).toContain("<loc>https://criticore.cc/es-ES/noticias/gta-6</loc>");
    expect(xml).toContain('hreflang="x-default" href="https://criticore.cc/en-US/news/gta-6"');
    expect(xml.match(/hreflang="th"/g)).toHaveLength(5);
    expect(xml).toContain("<lastmod>2026-10-07</lastmod>");
    expect(xml).toContain("<image:loc>https://example.supabase.co/storage/v1/object/public/a.jpg</image:loc>");
  });

  it("escapes what it puts into XML", () => {
    const xml = newsSitemap(
      [{ slug: "a", title: "Tom & Jerry <3", language: "de", updated_at: "2026-10-07T10:00:00Z", created_at: "2026-10-07T09:00:00Z", cover_image_url: null }],
      Date.parse("2026-10-07T12:00:00Z"),
    );
    expect(xml).toContain("<news:title>Tom &amp; Jerry &lt;3</news:title>");
  });

  it("puts only articles of the last two days into the news sitemap", () => {
    const now = Date.parse("2026-10-08T12:00:00Z");
    const base = { title: "x", language: "de", updated_at: "2026-10-08T10:00:00Z", cover_image_url: null };
    const xml = newsSitemap(
      [
        { ...base, slug: "neu", created_at: "2026-10-01T00:00:00Z", published_at: "2026-10-08T08:00:00Z" },
        { ...base, slug: "alt", created_at: "2026-10-01T00:00:00Z", published_at: "2026-10-04T08:00:00Z" },
      ],
      now,
    );
    expect(xml).toContain("/de-DE/news/neu</loc>");
    expect(xml).not.toContain("/news/alt");
    expect(xml).toContain("<news:publication_date>2026-10-08T08:00:00.000Z</news:publication_date>");
  });

  it("merges media from several sources and maps their routes", () => {
    const merged = mergeMedia([
      [{ type: "tv", id: "1399", lastmod: "2026-01-01" }],
      [{ type: "series", id: "1399", lastmod: "2026-05-01" }, { type: "movie", id: "603" }],
    ]);
    expect(merged).toEqual([
      { type: "series", id: "1399", lastmod: "2026-05-01" },
      { type: "movie", id: "603", lastmod: undefined },
    ]);
    expect(mediaPage({ type: "game", id: "52189" })?.path).toBe("/games/52189");
    expect(mediaPage({ type: "podcast", id: "1" })).toBeNull();
    expect(mediaPage({ type: "movie", id: "../../x" })).toBeNull();
  });

  it("indexes the four sitemaps", () => {
    const xml = sitemapIndex();
    expect(xml.match(/<sitemap>/g)).toHaveLength(4);
    expect(xml).toContain("<loc>https://criticore.cc/sitemaps/articles.xml</loc>");
  });
});
