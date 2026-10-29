import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** Opinion pieces carry an unmistakable "MEINUNG" label wherever they appear */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const AUTHOR = "33333333-4444-4555-8666-777777777777";
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const OPINION = {
  id: "o1",
  slug: "silksong-ist-zu-schwer",
  title: "Silksong ist zu schwer, und das ist gut so",
  excerpt: "Warum Team Cherry recht hat, keine Kompromisse zu machen.",
  content: "<p>Ein Kommentar.</p>",
  cover_image_url: null,
  category: "games",
  article_type: "opinion",
  language: "de",
  translation_group: null,
  published: true,
  published_at: hoursAgo(3),
  created_at: hoursAgo(5),
  updated_at: hoursAgo(3),
  user_id: AUTHOR,
  tgn_plus: false,
  featured: false,
};
const NEWS = { ...OPINION, id: "n1", slug: "frieren-staffel-2", title: "Frieren: Staffel 2 startet im Januar", article_type: "news", category: "series", published_at: hoursAgo(1) };
const REVIEW = { ...OPINION, id: "r1", slug: "dune-3-im-test", title: "Dune: Part Three im Test", article_type: "review", category: "movies", published_at: hoursAgo(2) };

function reply(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "content-range", "content-range": "0-1/2" }, body: JSON.stringify(body) });
}

async function open(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem("criticore-lang", "de");
    localStorage.setItem("whatsNew_dismissed", "2026-08-01");
  });
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const u = new URL(req.url());
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (u.pathname === "/rest/v1/articles") {
      if (u.searchParams.get("slug") === `eq.${OPINION.slug}`) return reply(route, single ? OPINION : [OPINION]);
      return reply(route, single ? null : [NEWS, REVIEW, OPINION]);
    }
    if (u.pathname === "/rest/v1/profiles") {
      const p = { user_id: AUTHOR, display_name: "Lena Vogt", username: "lenav", avatar_url: null, is_official: false, bio: null, staff_roles: [] };
      return reply(route, single ? p : [p]);
    }
    if (u.pathname.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    if (u.pathname.startsWith("/functions/v1/")) return reply(route, {});
    return reply(route, {});
  });
  await page.goto(url, { waitUntil: "networkidle" });
}

test.describe("opinion label", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("the article says MEINUNG above the title, explains it and tells search engines", async ({ page }) => {
    await open(page, `/de-DE/news/${OPINION.slug}`);
    const header = page.locator("article header");
    await expect(header.getByText("MEINUNG", { exact: true })).toBeVisible();
    await expect(header).toContainText("Dies ist ein Meinungsbeitrag. Er gibt die persönliche Sicht von Lena Vogt wieder");
    await expect(page).toHaveTitle(/^Meinung: Silksong ist zu schwer/);
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.some((s) => s.includes('"OpinionNewsArticle"'))).toBe(true);
    if (process.env.OPINION_SHOTS) await page.screenshot({ path: path.join(process.env.OPINION_SHOTS, `opinion-article-${test.info().project.name}.png`) });
  });

  test("lists mark the opinion piece and leave the news alone", async ({ page }) => {
    await open(page, "/de-DE/bio");
    const news = page.getByRole("region", { name: "Neueste News" });
    const opinion = news.getByRole("link").filter({ hasText: OPINION.title });
    await expect(opinion.getByText("MEINUNG", { exact: true })).toBeVisible();
    await expect(news.getByRole("link").filter({ hasText: NEWS.title }).getByText("MEINUNG", { exact: true })).toHaveCount(0);
    // A review is an opinion piece too, and keeps saying it is a review
    await expect(news.getByRole("link").filter({ hasText: REVIEW.title }).getByText("REVIEW · MEINUNG", { exact: true })).toBeVisible();
  });
});
