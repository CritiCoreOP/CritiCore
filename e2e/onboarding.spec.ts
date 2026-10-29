import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Onboarding wizard for fresh accounts. Fakes a signed-in user without a finished onboarding; every
 * Supabase request is answered locally and unknown requests are aborted, so nothing reaches the project.
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
  user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "neu@test.localhost", app_metadata: {}, user_metadata: {} },
};

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
    body: JSON.stringify(body),
  });
}

/** Returns the bodies of all profile updates the wizard sends. */
async function openWizard(page: Page, { returning = false } = {}) {
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  const updates: Record<string, unknown>[] = [];
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
    if (p.startsWith("/rest/v1/profiles")) {
      if (req.method() === "PATCH") {
        updates.push(JSON.parse(req.postData() || "{}"));
        return reply(route, single ? {} : []);
      }
      // Availability check: "taken" belongs to someone else
      const name = url.searchParams.get("username");
      if (name) return reply(route, name === "eq.taken" ? [{ id: "other" }] : []);
      const prof = { user_id: USER_ID, username: returning ? "altbekannt" : null, onboarding_completed_at: null, avatar_url: null };
      return reply(route, single ? prof : [prof]);
    }
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    if (p.startsWith("/functions/v1/") || p.startsWith("/storage/v1/")) return reply(route, {});
    return route.abort();
  });
  await page.goto("/de-DE", { waitUntil: "networkidle" });
  await expect(page.locator("#onboarding-heading")).toBeVisible();
  return updates;
}

test.describe("onboarding wizard", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("new account: name check, rules, saved in two steps", async ({ page }) => {
    const updates = await openWizard(page);
    const wizard = page.locator("[data-fullscreen-overlay]");
    const name = wizard.getByLabel("Benutzername");
    const next = wizard.getByRole("button", { name: "Weiter" });

    await name.fill("taken");
    await expect(wizard.getByText("Dieser Benutzername ist bereits vergeben.")).toBeVisible();
    await expect(next).toBeDisabled();

    await name.fill("Silk Fan!");
    await expect(name).toHaveValue("silkfan");
    await expect(wizard.getByText("Verfügbar")).toBeVisible();
    await next.click();

    const finish = wizard.getByRole("button", { name: "Los geht's!" });
    await expect(wizard.getByRole("heading", { name: "Community-Regeln" })).toBeVisible();
    await expect(wizard.getByRole("link", { name: "Datenschutzerklärung" })).toHaveAttribute("href", "/de-DE/datenschutz");
    await expect(finish).toBeDisabled();
    await wizard.getByRole("checkbox").click();
    await finish.click();

    await expect(wizard.getByText("Alles fertig!")).toBeVisible();
    expect(updates[0]).toMatchObject({ username: "silkfan" });
    expect(updates[0].onboarding_completed_at).toBeTruthy();
    await expect(wizard).toHaveCount(0, { timeout: 4000 });
  });

  test("language switch sticks instead of flipping back", async ({ page }) => {
    await openWizard(page);
    await page.getByRole("combobox", { name: "Sprache" }).click();
    await page.getByRole("option", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en-US$/);
    await page.waitForTimeout(500);
    await expect(page.locator("#onboarding-heading")).toHaveText("Welcome to CritiCore!");
  });

  test("returning account only confirms the rules", async ({ page }) => {
    const updates = await openWizard(page, { returning: true });
    const wizard = page.locator("[data-fullscreen-overlay]");
    await expect(wizard.getByText(/Schritt \d von/)).toHaveCount(0);
    await wizard.getByRole("checkbox").click();
    await wizard.getByRole("button", { name: "Los geht's!" }).click();
    await expect(wizard.getByText("Alles fertig!")).toBeVisible();
    expect(Object.keys(updates[0])).toEqual(["onboarding_completed_at"]);
  });

  test("fits phone screens without sideways scrolling", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.match(/iphone|android/), "phone layout only");
    await openWizard(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const box = await page.locator("[data-fullscreen-overlay]").boundingBox();
    expect(box).toMatchObject({ x: 0, y: 0 });
  });
});
