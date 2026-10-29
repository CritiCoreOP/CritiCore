import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Dashboard v2.0 with a fake session: every Supabase request is answered locally, the role
 * decides whether the admin area exists.
 */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const USER_ID = "11111111-2222-4333-8444-555555555555";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const session = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER_ID, role: "authenticated", exp: 4102444800 })}.test`,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800,
  refresh_token: "test-refresh",
  user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "team@test.localhost", app_metadata: {}, user_metadata: {} },
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const ARTICLES = [
  { id: "a1", title: "Frieren Staffel 2 bekommt einen Starttermin", excerpt: "Madhouse zeigt den ersten Trailer und verrät, wann die zweite Staffel startet.", slug: "frieren-staffel-2", category: "series", article_type: "news", language: "de", cover_image_url: null, published_at: hoursAgo(5), published: true },
  { id: "a2", title: "Hollow Knight Silksong im Test", excerpt: "Team Cherry liefert.", slug: "silksong-test", category: "games", article_type: "review", language: "de", cover_image_url: null, published_at: hoursAgo(30), published: true },
];

function reply(route: Route, body: unknown, status = 200, count?: number) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-expose-headers": "content-range",
      ...(count !== undefined ? { "content-range": `0-${Math.max(0, count - 1)}/${count}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function openDashboard(page: Page, role: "admin" | "press", url = "/de-DE/dashboard") {
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  await page.addInitScript(
    ([key, s]) => {
      localStorage.setItem(key, JSON.stringify(s));
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
      localStorage.removeItem("dashboard-pins");
      localStorage.removeItem("dashboard-last-path");
    },
    [`sb-${ref}-auth-token`, session] as const,
  );
  const shares: { article_id: string; platform: string }[] = [];
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (p.startsWith("/auth/v1/user")) return reply(route, session.user);
    if (p.startsWith("/auth/v1/")) return reply(route, {});
    if (p.startsWith("/rest/v1/user_roles")) return reply(route, single ? { role } : [{ role }]);
    if (p === "/rest/v1/reports") return reply(route, [{ id: "r1", reason: "Spam", target_type: "comment", created_at: hoursAgo(60) }], 200, 3);
    if (p === "/rest/v1/support_tickets") return reply(route, [{ id: "s1", subject: "Login geht nicht", created_at: hoursAgo(4) }], 200, 1);
    if (p === "/rest/v1/profiles" && url.searchParams.get("select") === "created_at") return reply(route, [{ created_at: hoursAgo(2) }, { created_at: hoursAgo(26) }, { created_at: hoursAgo(200) }]);
    if (p === "/rest/v1/articles") {
      if (url.searchParams.get("status") === "eq.review") return reply(route, [], 200, 0);
      if ((url.searchParams.get("select") || "").startsWith("status")) return reply(route, []);
      return reply(route, ARTICLES);
    }
    if (p === "/rest/v1/social_shares") {
      if (req.method() === "POST") {
        const body = req.postDataJSON();
        shares.push(...(Array.isArray(body) ? body : [body]));
        return reply(route, null, 201);
      }
      return reply(route, shares.map((s, i) => ({ id: `sh${i}`, article_id: s.article_id, platform: s.platform, shared_at: new Date().toISOString(), post_url: null })));
    }
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : [], 200, 0);
    if (p.startsWith("/functions/v1/")) return reply(route, { results: [] });
    return reply(route, {});
  });
  await page.goto(url, { waitUntil: "networkidle" });
  return { shares };
}

test.describe("dashboard v2", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("admins see what waits, the figures and the admin area", async ({ page, isMobile }) => {
    await openDashboard(page, "admin");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Guten (Morgen|Tag|Abend)/);
    const inbox = page.getByRole("region", { name: "Heute zu tun" });
    // The report waits longest and is overdue, the ticket follows
    await expect(inbox.getByRole("link").first()).toContainText("Spam (comment)");
    await expect(inbox.getByRole("link").nth(1)).toContainText("Login geht nicht");
    await expect(inbox).toContainText("4 offen");
    await expect(page.getByText("Neue Nutzer, 30 Tage")).toBeVisible();
    await expect(page).toHaveTitle(/^\(4\) Übersicht/);
    if (process.env.DASH_SHOTS) await page.screenshot({ path: path.join(process.env.DASH_SHOTS, `dash-overview-${test.info().project.name}.png`), fullPage: true });

    if (isMobile) {
      await expect(page.getByRole("navigation", { name: "Bereiche" }).getByRole("link", { name: /Admin/ })).toBeVisible();
      await page.getByRole("button", { name: "Mehr" }).click();
    }
    const nav = page.getByRole("navigation", { name: "Dashboard-Navigation" }).last();
    await expect(nav.getByRole("link", { name: /Reports/ })).toContainText("3");
    await expect(nav.getByRole("link", { name: "User", exact: true })).toBeVisible();

    // Nothing overflows sideways on a phone
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("the team sees no admin area, not even by URL", async ({ page, isMobile }) => {
    await openDashboard(page, "press");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Guten (Morgen|Tag|Abend)/);
    await expect(page.getByRole("region", { name: "Heute zu tun" })).toHaveCount(0);
    await expect(page.getByText("Von dir veröffentlicht, 30 Tage")).toBeVisible();
    if (isMobile) await page.getByRole("button", { name: "Mehr" }).click();
    const nav = page.getByRole("navigation", { name: "Dashboard-Navigation" }).last();
    await expect(nav.getByRole("link", { name: "Post-Generator" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "User", exact: true })).toHaveCount(0);

    await page.goto("/de-DE/admin/users", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/de-DE\/dashboard\/admin\/users$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nur für Admins");
  });

  test("old admin links land in the dashboard", async ({ page }) => {
    await openDashboard(page, "admin", "/de-DE/admin/reports");
    await expect(page).toHaveURL(/\/de-DE\/dashboard\/admin\/reports$/);
    await page.goto("/de-DE/admin/top10", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/de-DE\/dashboard\/social\/top10$/);
    await expect(page.getByRole("heading", { name: "Top 10", level: 1 })).toBeVisible();
  });

  test("the command search jumps to a page", async ({ page, isMobile }) => {
    test.skip(isMobile, "the shortcut needs a keyboard; phones open the search with the button");
    await openDashboard(page, "admin");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Befehlssuche" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").fill("Post-Gen");
    await dialog.getByRole("option", { name: "Post-Generator" }).click();
    await expect(page).toHaveURL(/\/de-DE\/dashboard\/social\/posts$/);
  });

  test("the post generator writes texts per platform and marks an article as posted", async ({ page }) => {
    const { shares } = await openDashboard(page, "press", "/de-DE/dashboard/social/posts");
    await page.getByRole("button", { name: /Frieren Staffel 2/ }).click();
    await expect(page).toHaveURL(/article=a1/);

    const x = page.getByRole("region", { name: "X", exact: true });
    await expect(x.getByRole("textbox")).toHaveValue(/^Frieren Staffel 2 bekommt einen Starttermin\n\n/);
    await expect(x.getByRole("textbox")).toHaveValue(/https:\/\/criticore\.cc\/de-DE\/news\/frieren-staffel-2/);
    await expect(x.getByRole("textbox")).toHaveValue(/#CritiCore #Serien$/);
    await expect(x).toContainText(/\d+ \/ 280/);
    await expect(page.getByRole("region", { name: "Instagram" }).getByRole("textbox")).toHaveValue(/Link in der Bio/);

    if (process.env.DASH_SHOTS) await page.screenshot({ path: path.join(process.env.DASH_SHOTS, `dash-posts-${test.info().project.name}.png`), fullPage: true });
    await x.getByRole("button", { name: "Als gepostet markieren" }).click();
    await expect(x.getByRole("button", { name: /Gepostet/ })).toBeVisible();
    expect(shares).toEqual([expect.objectContaining({ article_id: "a1", platform: "x" })]);
  });
});
