import { test, expect, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Social Pack Creator. A fake admin session, every Supabase request answered locally; covers come
 * from the (mocked) image proxy, which wants a token like the real one.
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
const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
    body: JSON.stringify(body),
  });
}

test.describe("social creator", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("a cover from the image proxy shows and the slide exports as PNG", async ({ page }) => {
    test.setTimeout(60_000);
    // Saved before the fix: the image points at the proxy itself, which answered <img> with a 401
    const proxied = `${SUPABASE_URL}/functions/v1/news-image?src=${encodeURIComponent("https://image.tmdb.org/t/p/w500/poster.jpg")}`;
    const draft = [
      {
        id: "s1",
        formatId: "ig-post",
        width: 1080,
        height: 1080,
        background: { type: "color", color: "#14161d", gradient: "", image: null, imageFit: "cover", imageOpacity: 1 },
        elements: [{ id: "e1", type: "image", x: 100, y: 100, w: 400, h: 600, src: proxied, fit: "cover", radius: 12, label: "Poster" }],
      },
    ];
    const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
    await page.addInitScript(
      ([key, s, d]) => {
        localStorage.setItem(key, JSON.stringify(s));
        localStorage.setItem("criticore-lang", "de");
        localStorage.setItem("whatsNew_dismissed", "2026-08-01");
        localStorage.setItem("socialCreator.draft.v2", JSON.stringify(d));
      },
      [`sb-${ref}-auth-token`, session, draft] as const,
    );
    let proxyAuth = "";
    await page.route(`${SUPABASE_URL}/**`, (route) => {
      const req = route.request();
      const p = new URL(req.url()).pathname;
      const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
      if (p.endsWith("/functions/v1/news-image")) {
        proxyAuth = req.headers()["authorization"] ?? "";
        // Like the real gateway: no token, no picture
        if (!proxyAuth) return route.fulfill({ status: 401, headers: { "access-control-allow-origin": "*" }, body: "{}" });
        return route.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: PNG_1X1 });
      }
      if (p.startsWith("/auth/v1/user")) return reply(route, session.user);
      if (p.startsWith("/auth/v1/")) return reply(route, {});
      if (p.startsWith("/rest/v1/user_roles")) return reply(route, single ? { role: "admin" } : [{ role: "admin" }]);
      if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
      return reply(route, {});
    });
    await page.goto("/de-DE/social-creator", { waitUntil: "networkidle" });

    const poster = page.locator('img[alt="Poster"]').first();
    await expect(poster).toHaveAttribute("src", /^data:image\/png/);
    expect(proxyAuth).toMatch(/^Bearer /);
    if (process.env.CREATOR_SHOTS) await page.screenshot({ path: path.join(process.env.CREATOR_SHOTS, `creator-${test.info().project.name}.png`) });

    await page.getByRole("button", { name: /Export/ }).first().click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Aktueller Slide als PNG" }).click();
    const dl = await download;
    expect(dl.suggestedFilename()).toMatch(/\.png$/);
    expect(fs.statSync((await dl.path())!).size).toBeGreaterThan(5_000);
  });

  async function openCreator(page: import("@playwright/test").Page, url = "/de-DE/social-creator") {
    const summaryCalls: { action: string; maxChars: number }[] = [];
    const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
    await page.addInitScript(
      ([key, s]) => {
        if (sessionStorage.getItem("seeded")) return;
        sessionStorage.setItem("seeded", "1");
        localStorage.setItem(key, JSON.stringify(s));
        localStorage.setItem("criticore-lang", "de");
        localStorage.setItem("whatsNew_dismissed", "2026-08-01");
        localStorage.removeItem("socialCreator.draft.v2");
        localStorage.removeItem("socialCreator.name");
      },
      [`sb-${ref}-auth-token`, session] as const,
    );
    await page.route(`${SUPABASE_URL}/**`, (route) => {
      const req = route.request();
      const p = new URL(req.url()).pathname;
      const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
      if (p.endsWith("/functions/v1/news-image")) return route.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: PNG_1X1 });
      if (p.startsWith("/auth/v1/user")) return reply(route, session.user);
      if (p.startsWith("/auth/v1/")) return reply(route, {});
      if (p.startsWith("/rest/v1/user_roles")) return reply(route, single ? { role: "press" } : [{ role: "press" }]);
      if (p.startsWith("/rest/v1/articles")) {
        const article = { id: "a1", user_id: "33333333-4444-4555-8666-777777777777", title: "Silksong im Test: Team Cherry liefert", category: "games", cover_image_url: null, excerpt: "Der Teaser.", content: "<p>Silksong ist da.</p>", language: "de", article_type: "review" };
        return reply(route, single ? article : [article]);
      }
      // Authors of articles (user_id=in.(…)); the own profile stays empty as before
      if (p.startsWith("/rest/v1/profiles") && (new URL(req.url()).searchParams.get("user_id") ?? "").startsWith("in.")) {
        return reply(route, [{ user_id: "33333333-4444-4555-8666-777777777777", display_name: "Lena Vogt", username: "lenav", avatar_url: null }]);
      }
      if (p.endsWith("/functions/v1/ai-editor-assist")) {
        const body = req.postDataJSON() as { action: string; maxChars: number };
        summaryCalls.push(body);
        return reply(route, { summary: "Größer, härter und schöner als Hollow Knight: Silksong lohnt das lange Warten." });
      }
      if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
      return reply(route, {});
    });
    await page.goto(url, { waitUntil: "networkidle" });
    return summaryCalls;
  }

  test("templates, text edited on the canvas, layers hidden", async ({ page, isMobile }) => {
    test.skip(isMobile, "pointer work on the canvas; phones are covered by the tool sheet test");
    await openCreator(page);
    const canvas = page.getByTestId("creator-canvas");
    await expect(canvas).toContainText("Im Test");

    // Templates are open by default; one click replaces the slide, undo brings it back
    await page.getByRole("button", { name: "Vorlage Top-Liste anwenden" }).click();
    await expect(canvas).toContainText("Die besten Spiele der Woche");
    await page.getByRole("button", { name: "Rückgängig" }).first().click();
    await expect(canvas).toContainText("Im Test");

    // A heading from the text panel, then edited right on the canvas
    await page.getByRole("button", { name: "Text", pressed: false }).first().click();
    await page.getByRole("complementary", { name: "Text" }).getByRole("button", { name: "Überschrift" }).click();
    await expect(page.getByRole("toolbar", { name: "Auswahl" })).toBeVisible();
    const heading = canvas.getByText("Überschrift", { exact: true });
    await heading.dblclick();
    await page.keyboard.type(" neu");
    await page.keyboard.press("Escape");
    await expect(canvas).toContainText("Überschrift neu");

    // Centred on the canvas with one click
    await page.getByRole("toolbar", { name: "Auswahl" }).getByRole("button", { name: "Horizontal zentrieren" }).click();
    await expect(page.getByLabel("X", { exact: true })).toHaveValue("108");
    if (process.env.CREATOR_SHOTS) await page.screenshot({ path: path.join(process.env.CREATOR_SHOTS, "creator-selected.png") });

    // Layers: hide the heading, it leaves the canvas
    await page.getByRole("tab", { name: /Ebenen/ }).click();
    const layer = page.getByRole("listitem").filter({ hasText: "Überschrift neu" });
    await layer.getByRole("button", { name: "Ausblenden" }).click();
    await expect(canvas).not.toContainText("Überschrift neu");
  });

  test("several elements: Shift-click, drag together, group, context menu, marquee", async ({ page, isMobile }) => {
    test.skip(isMobile, "pointer work with modifier keys and a right click");
    await openCreator(page);
    const canvas = page.getByTestId("creator-canvas");
    const bar = page.getByRole("toolbar", { name: "Auswahl" });
    const headline = canvas.getByText("Titel des Spiels oder Films", { exact: true });
    const kicker = canvas.getByText("Im Test", { exact: true });

    await headline.click();
    await kicker.click({ modifiers: ["Shift"] });
    await expect(bar).toContainText("2 Elemente");
    await expect(page.getByRole("complementary", { name: "Design und Ebenen" })).toContainText("2 Elemente");

    // Dragging one of them moves both
    const [h0, k0] = [await headline.boundingBox(), await kicker.boundingBox()];
    await page.mouse.move(h0!.x + 20, h0!.y + 10);
    await page.mouse.down();
    await page.mouse.move(h0!.x + 60, h0!.y + 40, { steps: 6 });
    await page.mouse.up();
    const [h1, k1] = [await headline.boundingBox(), await kicker.boundingBox()];
    expect(Math.round(h1!.x - h0!.x)).toBe(Math.round(k1!.x - k0!.x));
    expect(h1!.y - h0!.y).toBeGreaterThan(20);

    // Grouped, a click on one selects both; the context menu offers to ungroup
    await page.keyboard.press("Control+g");
    await page.keyboard.press("Escape");
    await expect(bar).toHaveCount(0);
    await headline.click();
    await expect(bar).toContainText("2 Elemente");
    if (process.env.CREATOR_SHOTS) await page.screenshot({ path: path.join(process.env.CREATOR_SHOTS, "creator-multi.png") });
    await headline.click({ button: "right" });
    await expect(page.getByRole("menuitem", { name: /Gruppierung aufheben/ })).toBeVisible();
    await page.getByRole("menuitem", { name: /Gruppierung aufheben/ }).click();
    await headline.click();
    await expect(bar).not.toContainText("Elemente");

    // A frame dragged over the empty workspace selects what it touches
    await page.keyboard.press("Escape");
    const c = (await canvas.boundingBox())!;
    await page.mouse.move(c.x + 4, c.y + c.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(c.x + c.width * 0.9, c.y + c.height * 0.99, { steps: 8 });
    await page.mouse.up();
    await expect(bar).toContainText(/[3-9] Elemente/);

    // Ctrl+A takes everything, Delete removes it, Ctrl+Z brings it back
    await page.keyboard.press("Control+a");
    await expect(bar).toContainText("7 Elemente");
    await page.keyboard.press("Delete");
    await expect(canvas).not.toContainText("Titel des Spiels oder Films");
    await page.keyboard.press("Control+z");
    await expect(canvas).toContainText("Titel des Spiels oder Films");
  });

  test("an article from the media panel becomes a slide with the AI's summary", async ({ page, isMobile }) => {
    test.skip(isMobile, "the panel flow is the same on phones, only inside a sheet");
    const summaryCalls = await openCreator(page);
    await page.getByRole("button", { name: "Medien", pressed: false }).first().click();
    const panel = page.getByRole("complementary", { name: "Medien" });
    await panel.getByRole("tab", { name: "Artikel" }).click();
    await panel.getByRole("button", { name: "Als Slide" }).click();
    const canvas = page.getByTestId("creator-canvas");
    await expect(canvas).toContainText("Silksong lohnt das lange Warten");
    await expect(canvas).toContainText("Silksong im Test: Team Cherry liefert");
    // Who wrote it: picture and name in the footer, in place of the domain
    await expect(canvas.getByText("Lena Vogt", { exact: true })).toBeVisible();
    await expect(canvas.getByRole("img", { name: "Lena Vogt" })).toBeVisible();
    await expect(canvas).not.toContainText("criticore.cc");
    expect(summaryCalls).toHaveLength(1);
    if (process.env.CREATOR_SHOTS) await page.screenshot({ path: path.join(process.env.CREATOR_SHOTS, "creator-article-slide.png") });

    // The same article again: the summary comes from the session, not from a second AI call
    await panel.getByRole("button", { name: "KI-Zusammenfassung" }).click();
    await expect(canvas.getByText("Größer, härter und schöner als Hollow Knight", { exact: false })).toHaveCount(2);
    expect(summaryCalls).toHaveLength(1);

    // The author on their own, as one group: a click on the name selects the picture too
    await panel.getByRole("button", { name: "Autor", exact: true }).click();
    await expect(canvas.getByText("Lena Vogt", { exact: true })).toHaveCount(2);
    await expect(page.getByRole("toolbar", { name: "Auswahl" })).toContainText("2 Elemente");
  });

  test("an article from the Post-Generator becomes a slide; tools open as a sheet on phones", async ({ page, isMobile }) => {
    const summaryCalls = await openCreator(page, "/de-DE/social-creator?article=a1");
    const canvas = page.getByTestId("creator-canvas");
    await expect(canvas).toContainText("Silksong im Test: Team Cherry liefert");
    // The test article is a review: it is marked as opinion instead of showing its category
    await expect(canvas).toContainText("Review · Meinung");
    // The AI's summary stands below the headline; the length fits the format
    await expect(canvas).toContainText("Silksong lohnt das lange Warten");
    expect(summaryCalls).toEqual([expect.objectContaining({ action: "slide", maxChars: 170 })]);
    await expect(page).not.toHaveURL(/article=/);
    await expect(page.getByRole("list", { name: "Slides" }).first().getByRole("listitem")).toHaveCount(isMobile ? 0 : 3);

    if (isMobile) {
      await page.getByRole("navigation", { name: "Werkzeuge" }).getByRole("button", { name: "Vorlagen" }).click();
      const sheet = page.getByRole("dialog");
      await sheet.getByRole("button", { name: "Vorlage Duell anwenden" }).click();
      await expect(canvas).toContainText("Option A");
    }
  });
});
