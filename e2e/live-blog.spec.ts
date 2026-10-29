import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** Live blogs: running updates on the article page, written by the newsroom right there */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const AUTHOR = "33333333-4444-4555-8666-777777777777";
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const ARTICLE = {
  id: "11111111-2222-4333-8444-555555555555",
  slug: "nintendo-direct-live",
  title: "Nintendo Direct im Liveblog: alle Ankündigungen",
  excerpt: "Wir begleiten die Präsentation und ordnen jede Ankündigung ein.",
  content: "<p>Die Direct beginnt um 16 Uhr. Hier sammeln wir alles, was Nintendo zeigt.</p>",
  cover_image_url: null,
  category: "games",
  article_type: "news",
  language: "de",
  translation_group: null,
  published: true,
  published_at: minutesAgo(90),
  created_at: minutesAgo(120),
  updated_at: minutesAgo(2),
  user_id: AUTHOR,
  tgn_plus: false,
  featured: false,
  live_status: "live",
  correction_note: null,
  corrected_at: null,
};

const UPDATES = [
  { id: "u1", article_id: ARTICLE.id, author_id: AUTHOR, title: null, body: "Die Direct läuft. Erster Trailer: ein neues Zelda-Remaster.", image_url: null, is_key: false, is_pinned: false, created_at: minutesAgo(30), updated_at: minutesAgo(30) },
  { id: "u2", article_id: ARTICLE.id, author_id: AUTHOR, title: "Metroid Prime 5 angekündigt", body: "Retro Studios arbeitet daran, mehr Infos im Sommer. Trailer: https://www.youtube.com/watch?v=abc123.", image_url: null, is_key: true, is_pinned: false, created_at: minutesAgo(12), updated_at: minutesAgo(12) },
  { id: "u3", article_id: ARTICLE.id, author_id: AUTHOR, title: "Alle Ankündigungen im Überblick", body: "Zelda-Remaster, Metroid Prime 5, ein neues Kirby. Wir ergänzen laufend.", image_url: null, is_key: false, is_pinned: true, created_at: minutesAgo(60), updated_at: minutesAgo(5) },
];

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const session = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: AUTHOR, role: "authenticated", exp: 4102444800 })}.test`,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800,
  refresh_token: "test-refresh",
  user: { id: AUTHOR, aud: "authenticated", role: "authenticated", email: "redaktion@test.localhost", app_metadata: {}, user_metadata: {} },
};

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "content-range", "content-range": "0-2/3" }, body: JSON.stringify(body) });
}

async function open(page: Page, url: string, { signedIn = false, posted }: { signedIn?: boolean; posted?: (body: Record<string, unknown>) => void } = {}) {
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  await page.addInitScript(
    ([key, s, signed]) => {
      if (signed) localStorage.setItem(key as string, JSON.stringify(s));
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
    },
    [`sb-${ref}-auth-token`, session, signedIn] as const,
  );
  // No Realtime server in tests: the socket is accepted and stays silent
  await page.routeWebSocket(/\/realtime\//, () => undefined);
  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const u = new URL(req.url());
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (u.pathname.startsWith("/auth/v1/user")) return reply(route, session.user);
    if (u.pathname.startsWith("/auth/v1/")) return reply(route, {});
    if (u.pathname === "/rest/v1/article_live_updates") {
      if (req.method() === "POST") {
        const body = JSON.parse(req.postData() || "{}");
        posted?.(body);
        const row = { id: "u-new", image_url: null, title: null, is_key: false, is_pinned: false, ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        return reply(route, single ? row : [row], 201);
      }
      return reply(route, UPDATES);
    }
    if (u.pathname === "/rest/v1/articles") {
      if (u.searchParams.get("live_status") === "eq.live") return reply(route, [{ id: ARTICLE.id }]);
      if (u.searchParams.get("slug") === `eq.${ARTICLE.slug}`) return reply(route, single ? ARTICLE : [ARTICLE]);
      return reply(route, single ? null : [ARTICLE]);
    }
    if (u.pathname === "/rest/v1/user_roles") return reply(route, signedIn ? [{ role: "press" }] : []);
    if (u.pathname === "/rest/v1/profiles") {
      const p = { user_id: AUTHOR, display_name: "Jonas Brenner", username: "jbrenner", avatar_url: null, is_official: false, bio: null, staff_roles: [], onboarding_completed_at: minutesAgo(5000), forum_onboarded_at: minutesAgo(5000) };
      return reply(route, single ? p : [p]);
    }
    if (u.pathname.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    return reply(route, {});
  });
  await page.goto(url, { waitUntil: "networkidle" });
}

test.describe("live blog", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("readers see LIVE, the updates with the pinned one on top, and search engines get a LiveBlogPosting", async ({ page }) => {
    await open(page, `/de-DE/news/${ARTICLE.slug}`);
    const header = page.locator("article header");
    await expect(header.getByText("Live", { exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "3 Updates" })).toBeVisible();

    const feed = page.locator("#live");
    await expect(feed.getByRole("heading", { name: "Live-Updates" })).toBeVisible();
    const titles = await feed.locator("article h3").allTextContents();
    expect(titles).toEqual(["Alle Ankündigungen im Überblick", "Metroid Prime 5 angekündigt"]);
    await expect(feed.getByText("Angeheftet")).toBeVisible();
    await expect(feed.getByText("Wichtig")).toBeVisible();
    const link = feed.getByRole("link", { name: "youtube.com/watch?v=abc123" });
    await expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=abc123");
    await expect(link).toHaveAttribute("rel", /nofollow/);
    // Readers do not get the composer
    await expect(page.getByPlaceholder("Was ist passiert?")).toHaveCount(0);

    await expect(page).toHaveTitle(/^Live: Nintendo Direct/);
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.some((s) => s.includes('"LiveBlogPosting"') && s.includes("Metroid Prime 5 angekündigt"))).toBe(true);
    if (process.env.LIVE_SHOTS) {
      await feed.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(process.env.LIVE_SHOTS, `live-reader-${test.info().project.name}.png`), fullPage: true });
    }
  });

  test("the author writes an update on the article page and it shows at once", async ({ page }) => {
    let sent: Record<string, unknown> | null = null;
    await open(page, `/de-DE/news/${ARTICLE.slug}`, { signedIn: true, posted: (b) => (sent = b) });
    const box = page.getByPlaceholder("Was ist passiert?");
    await expect(box).toBeVisible();
    await expect(page.getByRole("button", { name: "Liveblog beenden" })).toBeVisible();
    await page.getByPlaceholder("Kurze Überschrift (optional)").fill("Kirby kommt im Frühjahr");
    await box.fill("Das neue Kirby erscheint am 14. März.");
    await page.getByRole("button", { name: "Wichtig" }).click();
    if (process.env.LIVE_SHOTS) await page.locator("#live").screenshot({ path: path.join(process.env.LIVE_SHOTS, `live-composer-${test.info().project.name}.png`) });
    await page.getByRole("button", { name: "Veröffentlichen" }).click();

    await expect(page.locator("#live article h3").filter({ hasText: "Kirby kommt im Frühjahr" })).toBeVisible();
    expect(sent).toMatchObject({ article_id: ARTICLE.id, author_id: AUTHOR, title: "Kirby kommt im Frühjahr", body: "Das neue Kirby erscheint am 14. März.", is_key: true, is_pinned: false });
    await expect(box).toHaveValue("");
  });

  test("the news page marks the running live blog", async ({ page }) => {
    await open(page, "/de-DE/news");
    await expect(page.getByText("Live", { exact: true }).first()).toBeVisible();
  });
});
