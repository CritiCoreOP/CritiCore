import { describe, expect, it, vi } from "vitest";
import { articleShareMeta, DEFAULT_SHARE_IMAGE, injectShareMeta } from "./shareMeta";

const HTML = `<html><head>
    <title>CritiCore – Ehrliche Reviews</title>
    <meta name="description" content="Allgemein">
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://criticore.cc/og-image.jpg">
    <meta property="og:url" content="https://criticore.cc/" />
    <meta name="twitter:image" content="https://criticore.cc/og-image.jpg">
  <meta property="og:title" content="CritiCore">
  <meta name="twitter:title" content="CritiCore">
  <meta property="og:description" content="Allgemein">
  <meta name="twitter:description" content="Allgemein">
</head><body><div id="root"></div></body></html>`;

const ARTICLE = {
  title: 'Silksong im Test: "Team Cherry" liefert <endlich>',
  excerpt: "Größer, härter und schöner.",
  cover_image_url: "https://example.supabase.co/storage/v1/object/public/article-images/silksong.jpg",
  article_type: "news",
  language: "de",
  published_at: "2026-10-12T08:00:00Z",
  created_at: "2026-10-11T08:00:00Z",
};

const ARTICLE_REVIEW = { ...ARTICLE, article_type: "review" };

describe("share previews", () => {
  it("writes the article's title, teaser and cover into the page, escaped", () => {
    const html = injectShareMeta(HTML, articleShareMeta(ARTICLE, "https://criticore.cc/de-DE/news/silksong"));
    expect(html).toContain("<title>Silksong im Test: &quot;Team Cherry&quot; liefert &lt;endlich&gt; – CritiCore News</title>");
    expect(html).toContain('<meta property="og:title" content="Silksong im Test: &quot;Team Cherry&quot; liefert &lt;endlich&gt; – CritiCore News">');
    expect(html).toContain('<meta property="og:image" content="https://example.supabase.co/storage/v1/object/public/article-images/silksong.jpg">');
    expect(html).toContain('<meta name="twitter:description" content="Größer, härter und schöner.">');
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toContain('<meta property="og:url" content="https://criticore.cc/de-DE/news/silksong" />');
    // Tags the template lacks are added
    expect(html).toContain('<meta property="article:published_time" content="2026-10-12T08:00:00Z" />');
    expect(html).toContain('<meta property="og:locale" content="de_DE" />');
    expect(html.match(/og:title/g)).toHaveLength(1);
  });

  it("labels opinion pieces and falls back to the site card without a cover", () => {
    const meta = articleShareMeta({ ...ARTICLE, article_type: "opinion", cover_image_url: null, excerpt: null, language: "en" }, "u");
    expect(meta.title).toBe('Opinion: Silksong im Test: "Team Cherry" liefert <endlich> – CritiCore News');
    expect(meta.image).toBe(DEFAULT_SHARE_IMAGE);
    expect(meta.description).toBe(ARTICLE.title);
    expect(meta.locale).toBe("en_US");
    expect(articleShareMeta({ ...ARTICLE, live_status: "live", title: "Gamescom" }, "u").title).toBe("LIVE: Gamescom – CritiCore News");
    expect(articleShareMeta({ ...ARTICLE, live_status: "ended", title: "Gamescom" }, "u").title).toBe("Gamescom – CritiCore News");
    expect(articleShareMeta(ARTICLE_REVIEW, "u").title).toBe('Review · Meinung: Silksong im Test: "Team Cherry" liefert <endlich> – CritiCore News');
  });
});

describe("/<locale>/news/<slug> function", () => {
  const run = async (slug: string, rows: unknown[]) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 })));
    const { onRequestGet } = await import("../../functions/[locale]/news/[slug]");
    const res = await onRequestGet({
      request: new Request(`https://criticore.cc/de-DE/news/${slug}`),
      env: { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "k" },
      params: { locale: "de-DE", slug },
      next: async () => new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
      waitUntil: () => undefined,
    });
    vi.unstubAllGlobals();
    return res.text();
  };

  it("shows the article in the preview and leaves unknown paths alone", async () => {
    expect(await run("silksong", [ARTICLE])).toContain("Silksong im Test");
    expect(await run("schreiben", [])).toBe(HTML);
  });
});
