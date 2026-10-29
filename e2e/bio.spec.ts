import { test, expect, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** Link in bio (/bio): newest stories without the site's menu, each once, plus where to follow us */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const cover = (hue: number) =>
  "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="hsl(${hue} 45% 35%)"/></svg>`);

const ARTICLES = [
  { id: "a1", slug: "silksong-test", title: "Hollow Knight: Silksong im Test", excerpt: "Team Cherry liefert nach sieben Jahren und übertrifft den Vorgänger.", cover_image_url: cover(30), category: "games", article_type: "review", language: "de", translation_group: "g1", published_at: hoursAgo(2), created_at: hoursAgo(30) },
  { id: "a1en", slug: "silksong-review", title: "Hollow Knight: Silksong review", excerpt: null, cover_image_url: cover(30), category: "games", article_type: "review", language: "en", translation_group: "g1", published_at: hoursAgo(2), created_at: hoursAgo(29) },
  { id: "a2", slug: "frieren-staffel-2", title: "Frieren: Staffel 2 startet im Januar", excerpt: null, cover_image_url: cover(205), category: "series", article_type: "news", language: "de", translation_group: null, published_at: hoursAgo(6), created_at: hoursAgo(6) },
  { id: "a3", slug: "dune-3", title: "Dune: Part Three hat einen ersten Trailer", excerpt: null, cover_image_url: null, category: "movies", article_type: "news", language: "de", translation_group: null, published_at: hoursAgo(26), created_at: hoursAgo(26) },
];

function reply(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, body: JSON.stringify(body) });
}

test.describe("link in bio", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("newest stories once each, no site menu, social links and the way on", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
    });
    await page.route(`${SUPABASE_URL}/**`, (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
      const p = new URL(req.url()).pathname;
      if (p === "/rest/v1/articles") return reply(route, ARTICLES);
      return reply(route, []);
    });
    await page.goto("/de-DE/bio", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("CritiCore");
    await expect(page).toHaveTitle("CritiCore: Links und neueste News");
    // No navigation bar or dock: people come for one story
    await expect(page.getByRole("link", { name: "Entdecken" })).toHaveCount(0);
    const news = page.getByRole("region", { name: "Neueste News" });
    const links = news.getByRole("link");
    await expect(links).toHaveCount(3);
    await expect(links.first()).toContainText("Hollow Knight: Silksong im Test");
    await expect(links.first()).toHaveAttribute("href", "/de-DE/news/silksong-test");
    await expect(news).not.toContainText("Silksong review");
    await expect(news).toContainText("vor 2 Stunden");

    const follow = page.getByRole("list", { name: "CritiCore folgen" });
    await expect(follow.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", /instagram\.com\/criticoretgn/);
    await expect(page.getByRole("link", { name: "Alle News" })).toHaveAttribute("href", "/de-DE/news");
    await expect(page.getByRole("link", { name: "Impressum" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    if (process.env.BIO_SHOTS) await page.screenshot({ path: path.join(process.env.BIO_SHOTS, `bio-${test.info().project.name}.png`), fullPage: true });
  });
});
