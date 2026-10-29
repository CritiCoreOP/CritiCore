import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Newsletter: unsubscribe page and admin sending. Supabase is answered locally; the send-newsletter
 * and email-unsubscribe functions are mocked, so nothing is queued or sent. Unknown requests are aborted.
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

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
    body: JSON.stringify(body),
  });
}

type Call = { path: string; body: Record<string, unknown> };

async function mockSupabase(page: Page, { loggedIn = false } = {}) {
  const calls: Call[] = [];
  await page.addInitScript(
    ([key, s, loggedIn]) => {
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
      if (loggedIn) localStorage.setItem(key as string, JSON.stringify(s));
    },
    [`sb-${new URL(SUPABASE_URL!).hostname.split(".")[0]}-auth-token`, session, loggedIn] as const,
  );
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const body = JSON.parse(req.postData() || "{}");
    if (p.startsWith("/functions/v1/")) calls.push({ path: p, body });

    if (p === "/functions/v1/email-unsubscribe") {
      if (body.token !== "gueltig") return reply(route, { error: "invalid_token" }, 404);
      return reply(route, body.action === "status" ? { email: "s***@example.de", unsubscribed: false } : { success: true });
    }
    if (p === "/functions/v1/send-newsletter") {
      if (body.mode === "preview") return reply(route, { html: `<html><body><h1>${body.subject}</h1><p>Newsletter abbestellen</p></body></html>` });
      return reply(route, { queued: body.mode === "test" ? 1 : 2, failed: 0 });
    }
    if (p.startsWith("/auth/v1/user")) return reply(route, session.user);
    if (p.startsWith("/auth/v1/")) return reply(route, {});
    if (p.startsWith("/rest/v1/rpc/")) return reply(route, true);
    if (p.startsWith("/rest/v1/user_roles")) return reply(route, single ? { role: "admin" } : [{ role: "admin" }]);
    if (p.startsWith("/rest/v1/profiles")) {
      const prof = { user_id: USER_ID, username: "admin", onboarding_completed_at: "2026-01-01T00:00:00Z" };
      return reply(route, single ? prof : [prof]);
    }
    if (p.startsWith("/rest/v1/newsletter_subscribers")) {
      return reply(route, [
        { email: "a@example.de", confirmed: true, subscribed: true, created_at: "2026-09-01T00:00:00Z" },
        { email: "b@example.de", confirmed: true, subscribed: true, created_at: "2026-09-02T00:00:00Z" },
        { email: "c@example.de", confirmed: false, subscribed: true, created_at: "2026-09-03T00:00:00Z" },
        { email: "d@example.de", confirmed: true, subscribed: false, created_at: "2026-09-04T00:00:00Z" },
      ]);
    }
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    if (p.startsWith("/functions/v1/")) return reply(route, {});
    return route.abort();
  });
  return calls;
}

test.describe("newsletter", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("unsubscribe page confirms before unsubscribing", async ({ page }) => {
    const calls = await mockSupabase(page);
    await page.goto("/de-DE/newsletter/abmelden?token=gueltig", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Newsletter abbestellen" })).toBeVisible();
    await expect(page.getByText("s***@example.de", { exact: false })).toBeVisible();
    // Opening the page alone must not unsubscribe (mail scanners follow links)
    expect(calls.filter((c) => c.body.action === "unsubscribe")).toHaveLength(0);

    await page.getByRole("button", { name: "Abbestellen" }).click();
    await expect(page.getByRole("heading", { name: "Abgemeldet" })).toBeVisible();
    expect(calls.find((c) => c.body.action === "unsubscribe")?.body).toMatchObject({ token: "gueltig" });
  });

  test("unsubscribe page explains an invalid link", async ({ page }) => {
    await mockSupabase(page);
    await page.goto("/de-DE/newsletter/abmelden?token=kaputt", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Link ungültig" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Abbestellen" })).toHaveCount(0);
  });

  test("admin previews, tests and sends to confirmed subscribers only", async ({ page }, testInfo) => {
    test.skip(!!testInfo.project.name.match(/iphone|android/), "admin area is desktop only");
    const calls = await mockSupabase(page, { loggedIn: true });
    await page.goto("/de-DE/admin/newsletter", { waitUntil: "networkidle" });
    await expect(page.getByText("2 aktiv")).toBeVisible();

    await page.getByLabel("Betreff").fill("Die Woche auf CritiCore");
    await page.getByRole("textbox", { name: "Einleitung" }).fill("Hallo zusammen");
    await expect(page.frameLocator('iframe[title="Newsletter-Vorschau"]').getByRole("heading", { name: "Die Woche auf CritiCore" })).toBeVisible();

    await page.getByRole("button", { name: "Testmail an mich" }).click();
    await expect(page.getByText("Testmail ist unterwegs", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "An 2 Abonnenten senden" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Senden" }).click();
    await expect(page.getByText("2 Mails in der Warteschlange", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gesendet" })).toBeDisabled();

    const sends = calls.filter((c) => c.path === "/functions/v1/send-newsletter");
    expect(sends.map((c) => c.body.mode)).toEqual(expect.arrayContaining(["preview", "test", "send"]));
    expect(sends.find((c) => c.body.mode === "send")?.body).toMatchObject({ subject: "Die Woche auf CritiCore", lang: "de" });
  });
});
