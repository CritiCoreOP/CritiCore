import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Newsletter editor in the admin area. A fake admin session and every Supabase request answered
 * locally; nothing is sent and nothing reaches the real project.
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
  user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "admin@test.localhost", app_metadata: {}, user_metadata: {} },
};

const ARTICLES = [
  { id: "a1000000-0000-4000-8000-000000000001", title: "Silksong im Test", slug: "silksong-test", excerpt: "Endlich da.", cover_image_url: null, category: "games", updated_at: "2026-10-06T10:00:00Z" },
  { id: "a1000000-0000-4000-8000-000000000002", title: "Der Herbst der Remakes", slug: "herbst-remakes", excerpt: null, cover_image_url: null, category: "general", updated_at: "2026-10-05T10:00:00Z" },
];

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
    body: JSON.stringify(body),
  });
}

async function openNewsletter(page: Page, previews: Record<string, unknown>[]) {
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  await page.addInitScript(
    ([key, s]) => {
      localStorage.setItem(key, JSON.stringify(s));
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
    },
    [`sb-${ref}-auth-token`, session] as const,
  );
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (p.startsWith("/auth/v1/user")) return reply(route, session.user);
    if (p.startsWith("/auth/v1/")) return reply(route, {});
    if (p.startsWith("/rest/v1/user_roles")) return reply(route, single ? { role: "admin" } : [{ role: "admin" }]);
    if (p.startsWith("/rest/v1/newsletter_subscribers")) {
      return reply(route, [{ email: "leser@test.localhost", confirmed: true, subscribed: true, created_at: "2026-09-01T00:00:00Z" }]);
    }
    if (p.startsWith("/rest/v1/articles")) {
      const title = url.searchParams.get("title");
      const term = title?.replace(/^ilike\.\*?|\*$/g, "").replace(/\*/g, "").toLowerCase();
      return reply(route, term ? ARTICLES.filter((a) => a.title.toLowerCase().includes(term)) : ARTICLES);
    }
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    if (p.startsWith("/functions/v1/send-newsletter")) {
      const body = req.postDataJSON();
      previews.push(body);
      return reply(route, { html: `<html><body><h1>${body.subject}</h1></body></html>` });
    }
    if (p.startsWith("/functions/v1/") || p.startsWith("/storage/v1/")) return reply(route, {});
    return route.abort();
  });
  await page.goto("/de-DE/admin/newsletter", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Newsletter" })).toBeVisible();
}

/** Until a closed dialog is fully gone, Radix keeps the page unclickable and the next tap is lost */
async function dialogGone(page: Page) {
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");
}

const lastPreview = (previews: Record<string, unknown>[]) => previews[previews.length - 1] as { intro: string; blocks: Record<string, unknown>[] };

test.describe("newsletter editor", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("articles become a section and links go into the text", async ({ page }) => {
    const previews: Record<string, unknown>[] = [];
    await openNewsletter(page, previews);
    await page.getByLabel("Betreff").fill("Die Highlights der Woche");

    // Inline link to an article: the selected words become the link text
    const intro = page.getByRole("textbox", { name: "Einleitung" });
    await intro.fill("Lies unseren Test zu Silksong.");
    await intro.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(13, 17));
    await page.getByRole("button", { name: "Einleitung: Link einfügen" }).click();
    await page.getByRole("button", { name: "Artikel verlinken" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Silksong im Test/ }).click();
    await expect(intro).toHaveValue("Lies unseren [Test](https://criticore.cc/de-DE/news/silksong-test) zu Silksong.");
    // Back in the text field, behind the link
    await dialogGone(page);
    await expect(intro).toBeFocused();
    expect(await intro.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe("Lies unseren [Test](https://criticore.cc/de-DE/news/silksong-test)".length);

    // Bold wraps the selection
    await intro.evaluate((el: HTMLTextAreaElement) => {
      const start = el.value.indexOf("Silksong.");
      el.focus();
      el.setSelectionRange(start, start + 8);
    });
    await page.getByRole("button", { name: "Einleitung: markierten Text fett" }).click();
    await expect(intro).toHaveValue(/zu \*\*Silksong\*\*\./);

    // An article section with two articles, the second moved to the top
    await page.getByRole("button", { name: "Artikel", exact: true }).click();
    await page.getByRole("button", { name: "Artikel hinzufügen" }).click();
    const picker = page.getByRole("dialog");
    await picker.getByRole("button", { name: /Silksong im Test/ }).click();
    await picker.getByRole("button", { name: /Der Herbst der Remakes/ }).click();
    await picker.getByRole("button", { name: "2 Artikel hinzufügen" }).click();
    await dialogGone(page);
    await page.getByRole("button", { name: "„Der Herbst der Remakes“ nach oben" }).click();
    await page.getByRole("button", { name: "Kompakte Liste" }).click();

    await expect
      .poll(() => JSON.stringify(lastPreview(previews)?.blocks?.[1] ?? null))
      .toBe(JSON.stringify({ type: "articles", heading: "", layout: "list", articleIds: [ARTICLES[1].id, ARTICLES[0].id] }));
    expect(lastPreview(previews).intro).toBe("Lies unseren [Test](https://criticore.cc/de-DE/news/silksong-test) zu **Silksong**.");
  });

  test("latest articles come in one click and the draft survives a reload", async ({ page }) => {
    const previews: Record<string, unknown>[] = [];
    await openNewsletter(page, previews);
    await page.getByLabel("Betreff").fill("Wochenrückblick");
    await page.getByRole("button", { name: "Neueste Artikel" }).click();
    await expect(page.getByLabel("Überschrift").nth(1)).toHaveValue("Neu auf CritiCore");
    await expect(page.getByText("Silksong im Test")).toBeVisible();

    // The section can move above the text section
    await page.getByRole("button", { name: "Artikel 2 nach oben" }).click();
    await expect(page.getByRole("heading", { name: "Artikel 1" })).toBeVisible();

    await page.waitForTimeout(700);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByLabel("Betreff")).toHaveValue("Wochenrückblick");
    await expect(page.getByText("Der Herbst der Remakes")).toBeVisible();

    await page.getByRole("button", { name: "Neu beginnen" }).click();
    await expect(page.getByLabel("Betreff")).toHaveValue("");
  });
});
