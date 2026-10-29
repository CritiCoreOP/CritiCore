import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Own accounts on /auth (no Redaim SSO): password login, registration with code, code login and
 * password reset. Supabase Auth is answered locally; unknown requests are aborted.
 */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const USER_ID = "11111111-2222-4333-8444-555555555555";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const user = { id: USER_ID, aud: "authenticated", role: "authenticated", email: "fan@test.localhost", app_metadata: {}, user_metadata: {}, identities: [{ id: "x", provider: "email" }] };
const session = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER_ID, role: "authenticated", exp: 4102444800 })}.test`,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800,
  refresh_token: "test-refresh",
  user,
};

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "x-supabase-api-version": "2024-01-01" },
    body: JSON.stringify(body),
  });
}
const authError = (route: Route, status: number, code: string) => reply(route, { code, error_code: code, msg: code }, status);

/** Opens /auth logged out; returns the auth requests the page sent (method, path and body). */
async function openAuth(page: Page, query = "", providers: Record<string, boolean> = { email: true, google: true }) {
  const calls: { method: string; path: string; body: Record<string, unknown> }[] = [];
  await page.addInitScript(() => {
    localStorage.setItem("criticore-lang", "de");
    localStorage.setItem("whatsNew_dismissed", "2026-08-01");
  });
  await page.route("https://image.tmdb.org/**", (route) => route.abort());
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    const body = JSON.parse(req.postData() || "{}");
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (p.startsWith("/auth/v1/")) calls.push({ method: req.method(), path: p, body });
    if (p === "/auth/v1/settings") return reply(route, { external: providers });
    // OAuth leaves the page; answer with an empty page instead of the real provider
    if (p === "/auth/v1/authorize") return route.fulfill({ status: 200, contentType: "text/html", body: "<p>oauth</p>" });
    if (p === "/auth/v1/token") return body.password === "richtig123" ? reply(route, session) : authError(route, 400, "invalid_credentials");
    if (p === "/auth/v1/signup") return reply(route, { ...user, email: body.email });
    if (p === "/auth/v1/otp") return body.email?.startsWith("niemand") ? authError(route, 422, "otp_disabled") : reply(route, {});
    if (p === "/auth/v1/verify") return body.token === "123456" ? reply(route, session) : authError(route, 403, "otp_expired");
    if (p === "/auth/v1/user") return reply(route, user);
    if (p.startsWith("/auth/v1/")) return reply(route, {});
    if (p.startsWith("/functions/v1/tmdb")) return reply(route, { results: [], total_pages: 1 });
    if (p.startsWith("/rest/v1/profiles")) {
      const prof = { user_id: USER_ID, username: "fan", onboarding_completed_at: "2026-01-01T00:00:00Z" };
      return reply(route, single ? prof : [prof]);
    }
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    if (p.startsWith("/functions/v1/")) return reply(route, {});
    return route.abort();
  });
  await page.goto(`/de-DE/auth${query}`, { waitUntil: "networkidle" });
  return calls;
}

test.describe("auth page", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("no Redaim login left, and old SSO links land on the login", async ({ page }) => {
    await openAuth(page);
    await expect(page.getByRole("heading", { name: "Willkommen zurück" })).toBeVisible();
    await expect(page.getByText("Mit Redaim-Konto anmelden")).toHaveCount(0);
    await page.goto("/de-DE/auth/callback?sso_code=alt");
    await expect(page).toHaveURL(/\/de-DE\/auth$/);
  });

  test("no GitHub button while the provider is off in Supabase", async ({ page }) => {
    await openAuth(page);
    await expect(page.getByRole("button", { name: "Weiter mit Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Weiter mit GitHub" })).toHaveCount(0);
  });

  test("GitHub login once the provider is on", async ({ page }) => {
    await openAuth(page, "", { email: true, google: true, github: true });
    const github = page.getByRole("button", { name: "Weiter mit GitHub" });
    await expect(github).toBeVisible();
    await github.click();
    await expect(page).toHaveURL(/\/auth\/v1\/authorize\?provider=github/);
  });

  test("password login shows a readable error, then follows ?redirect", async ({ page }) => {
    await openAuth(page, "?redirect=/de-DE/news");
    await page.getByLabel("E-Mail").fill("fan@test.localhost");
    await page.getByLabel("Passwort", { exact: true }).fill("falsch");
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("E-Mail oder Passwort stimmt nicht.");
    await page.getByLabel("Passwort", { exact: true }).fill("richtig123");
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL(/\/de-DE\/news$/);
  });

  test("registration is confirmed with the code from the mail", async ({ page }) => {
    const calls = await openAuth(page, "?mode=signup");
    await page.getByLabel("E-Mail").fill("neu@test.localhost");
    await page.getByLabel("Passwort", { exact: true }).fill("kurz");
    await page.getByRole("button", { name: "Konto erstellen" }).click();
    await expect(page.getByRole("alert")).toHaveText("Das Passwort braucht mindestens 8 Zeichen.");

    await page.getByLabel("Passwort", { exact: true }).fill("langespasswort");
    await page.getByRole("button", { name: "Konto erstellen" }).click();
    await expect(page.getByRole("heading", { name: "Bestätige deine E-Mail" })).toBeVisible();
    expect(calls.find((c) => c.path === "/auth/v1/signup")?.body).toMatchObject({ email: "neu@test.localhost", data: { locale: "de" } });

    await page.getByLabel("Code aus der E-Mail").fill("123456");
    await page.getByRole("button", { name: "Bestätigen" }).click();
    await expect(page).not.toHaveURL(/\/auth/);
    expect(calls.find((c) => c.path === "/auth/v1/verify")?.body).toMatchObject({ type: "signup", token: "123456" });
  });

  test("code login does not create accounts", async ({ page }) => {
    const calls = await openAuth(page);
    await page.getByRole("button", { name: "Stattdessen Code per E-Mail erhalten" }).click();
    await page.getByLabel("E-Mail").fill("niemand@test.localhost");
    await page.getByRole("button", { name: "Code senden" }).click();
    await expect(page.getByRole("alert")).toHaveText("Zu dieser E-Mail gibt es kein Konto. Registriere dich zuerst.");
    expect(calls.find((c) => c.path === "/auth/v1/otp")?.body).toMatchObject({ create_user: false });

    await page.getByLabel("E-Mail").fill("fan@test.localhost");
    await page.getByRole("button", { name: "Code senden" }).click();
    await page.getByLabel("Code aus der E-Mail").fill("123456");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test("forgotten password is replaced with code and new password in one step", async ({ page }) => {
    const calls = await openAuth(page);
    await page.getByRole("button", { name: "Passwort vergessen?" }).click();
    await page.getByLabel("E-Mail").fill("fan@test.localhost");
    await page.getByRole("button", { name: "Code senden" }).click();
    await page.getByLabel("Code aus der E-Mail").fill("123456");
    await page.getByLabel("Neues Passwort").fill("neuespasswort");
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page).not.toHaveURL(/\/auth/);
    expect(calls.find((c) => c.path === "/auth/v1/verify")?.body).toMatchObject({ type: "recovery" });
    expect(calls.find((c) => c.method === "PUT" && c.path === "/auth/v1/user")?.body).toMatchObject({ password: "neuespasswort" });
  });
});
