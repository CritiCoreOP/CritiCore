import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Search: Enter in the navbar (desktop) or the search overlay (phone) opens the results page with
 * every source. TMDB, IGDB, AniList and the articles table are answered locally; unknown requests are aborted.
 */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "content-range" };

function reply(route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) {
  return route.fulfill({ status, contentType: "application/json", headers: { ...CORS, ...headers }, body: JSON.stringify(body) });
}

const movie = (i: number) => ({ id: 1000 + i, title: `Batman Film ${i}`, poster_path: null, release_date: "2022-03-01", genre_ids: [28], vote_average: 7.5 });

interface MockOptions {
  /** Sources that answer with an error */
  failing?: string[];
  /** Everything comes back empty */
  empty?: boolean;
}

async function mockSearch(page: Page, { failing = [], empty = false }: MockOptions = {}) {
  const igdbQueries: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem("criticore-lang", "de");
    localStorage.setItem("whatsNew_dismissed", "2026-08-01");
    localStorage.removeItem("cc:recent-searches");
  });
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...CORS, "access-control-allow-methods": "*" } });
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    const body = JSON.parse(req.postData() || "{}");

    if (p === "/functions/v1/tmdb") {
      if (body.endpoint === "/search/movie") {
        if (failing.includes("movies")) return reply(route, { error: "down" }, 500);
        if (empty) return reply(route, { results: [], total_results: 0, total_pages: 0 });
        const pageNo = Number(body.params?.page || 1);
        const results = pageNo === 1 ? Array.from({ length: 20 }, (_, i) => movie(i + 1)) : Array.from({ length: 5 }, (_, i) => movie(i + 21));
        return reply(route, { results, total_results: 25, total_pages: 2 });
      }
      if (body.endpoint === "/search/tv") {
        if (empty) return reply(route, { results: [], total_results: 0, total_pages: 0 });
        return reply(route, {
          results: [{ id: 2001, name: "Batman Serie", poster_path: null, first_air_date: "1992-09-05", genre_ids: [16], vote_average: 8.6 }],
          total_results: 1,
          total_pages: 1,
        });
      }
      return reply(route, { results: [], total_results: 0, total_pages: 1 });
    }
    if (p === "/functions/v1/igdb") {
      igdbQueries.push(String(body.query));
      if (!String(body.query).includes("search ")) return reply(route, []);
      if (failing.includes("games")) return reply(route, { error: "down" }, 500);
      if (empty) return reply(route, []);
      return reply(route, [{ id: 3001, name: "Batman: Arkham City", first_release_date: 1318291200, total_rating: 90, genres: [{ id: 31, name: "Adventure" }] }]);
    }
    if (p === "/functions/v1/anilist") {
      const media = empty ? [] : [{ id: 4001, title: { romaji: "Ninja Batman", english: "Batman Ninja" }, coverImage: {}, startDate: { year: 2018 }, genres: ["Action"], averageScore: 59 }];
      return reply(route, { data: { Page: { pageInfo: { hasNextPage: false, currentPage: 1, total: media.length }, media } } });
    }
    if (p.startsWith("/rest/v1/articles") && req.url().includes("ilike")) {
      const rows = empty ? [] : [{ id: "a1", slug: "batman-review", title: "Batman im Test", excerpt: "Unser Review", cover_image_url: null, article_type: "review", category: "movies", created_at: "2026-09-01T10:00:00Z" }];
      return reply(route, rows, 200, { "content-range": rows.length ? `0-${rows.length - 1}/${rows.length}` : "*/0" });
    }
    if (p.startsWith("/auth/v1/")) return reply(route, {});
    if (p.startsWith("/rest/v1/rpc/")) return reply(route, null);
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    if (p.startsWith("/functions/v1/")) return reply(route, {});
    return route.abort();
  });
  return { igdbQueries };
}

test.describe("search", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("Enter in the navbar opens every result, grouped and filterable", async ({ page }, testInfo) => {
    test.skip(!!testInfo.project.name.match(/iphone|android/), "the inline navbar search is desktop only");
    const { igdbQueries } = await mockSearch(page);
    await page.goto("/de-DE", { waitUntil: "networkidle" });

    await page.getByTestId("main-navbar").getByRole("button", { name: "Suchen", exact: true }).click();
    await page.getByRole("searchbox", { name: "Games, Filme, Serien suchen…" }).fill("batman");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/de-DE\/suche\?q=batman$/);
    await expect(page.getByRole("heading", { level: 1, name: "Ergebnisse für „batman“" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Treffer" })).toHaveText("29 Treffer");
    for (const name of ["Filme", "Serien", "Games", "Anime", "Artikel"]) {
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${name}`) })).toBeVisible();
    }
    // The overview shows six films and links to the rest
    await expect(page.locator("main section").first().locator("a.media-card")).toHaveCount(6);
    await expect(page.getByRole("link", { name: /Batman im Test/ })).toHaveAttribute("href", "/de-DE/news/batman-review");
    // Skin packs and DLC stay out of the game hits
    expect(igdbQueries.some((q) => q.includes('search "batman"') && q.includes("game_type = ("))).toBe(true);

    await page.getByRole("button", { name: /^Filme/ }).click();
    await expect(page).toHaveURL(/type=movies/);
    await expect(page.getByRole("button", { name: /^Filme/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("main a.media-card")).toHaveCount(20);
    await page.getByRole("button", { name: "Mehr laden" }).click();
    await expect(page.locator("main a.media-card")).toHaveCount(25);
    await expect(page.getByRole("button", { name: "Mehr laden" })).toHaveCount(0);

    // Back returns to the overview of the same search
    await page.goBack();
    await expect(page).toHaveURL(/\/de-DE\/suche\?q=batman$/);
    await expect(page.getByRole("button", { name: "Alle", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("Enter in the phone search overlay opens the results page", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.match(/iphone|android/), "the overlay is the phone search");
    await mockSearch(page);
    await page.goto("/de-DE", { waitUntil: "networkidle" });

    await page.locator("header").getByRole("button", { name: "Suche öffnen" }).click();
    await page.getByRole("dialog").getByRole("textbox").fill("batman");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/de-DE\/suche\?q=batman$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: /^Games/ })).toBeVisible();
    // The overlay locked scrolling while it was open
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("no hits explains what to try", async ({ page }) => {
    await mockSearch(page, { empty: true });
    await page.goto("/de-DE/suche?q=xqzvw", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Keine Treffer für „xqzvw“" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Stattdessen stöbern" })).toHaveAttribute("href", "/de-DE/entdecken");
  });

  test("a source that fails says so instead of looking empty", async ({ page }) => {
    await mockSearch(page, { failing: ["games"] });
    await page.goto("/de-DE/suche?q=batman", { waitUntil: "networkidle" });
    const games = page.locator("main section").filter({ has: page.getByRole("heading", { level: 2, name: /^Games/ }) });
    await expect(games.getByText("Das konnte gerade nicht geladen werden.")).toBeVisible();
    await expect(games.getByRole("button", { name: "Erneut versuchen" })).toBeVisible();
    await expect(page.locator("main a.media-card").first()).toBeVisible();
  });
});
