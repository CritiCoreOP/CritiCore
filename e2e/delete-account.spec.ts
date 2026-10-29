import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** Deleting one's own account: one confirmation, no reason asked. Supabase answered locally */

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
  user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "leser@test.localhost", app_metadata: {}, user_metadata: {} },
};

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, body: JSON.stringify(body) });
}

async function setup(page: Page, answer: { status: number; body: unknown }) {
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  await page.addInitScript(
    ([key, s]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem(key, JSON.stringify(s));
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
    },
    [`sb-${ref}-auth-token`, session] as const,
  );
  const calls: string[] = [];
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (p.endsWith("/functions/v1/delete-account")) {
      calls.push(req.method());
      return reply(route, answer.body, answer.status);
    }
    if (p.startsWith("/auth/v1/user")) return reply(route, session.user);
    if (p.startsWith("/auth/v1/")) return reply(route, {});
    if (p.startsWith("/rest/v1/profiles")) return reply(route, single ? { user_id: USER_ID, username: "leserin", display_name: "Leserin", avatar_url: null, onboarding_completed_at: "2026-01-01T00:00:00Z" } : []);
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    return reply(route, {});
  });
  await page.goto("/de-DE/", { waitUntil: "networkidle" });
  return { calls, key: `sb-${ref}-auth-token` };
}

async function openDialog(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByTestId("mobile-dock").getByRole("button", { name: /Menü/ }).click();
  } else {
    await page.getByRole("button", { name: "Kontomenü" }).click();
  }
  await page.getByRole(isMobile ? "button" : "menuitem", { name: "Konto löschen" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Konto löschen?" });
  await expect(dialog).toBeVisible();
  // No question about the reason, only the confirmation
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  return dialog;
}

test.describe("delete own account", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("one confirmation deletes the account and signs out", async ({ page, isMobile }) => {
    const { calls, key } = await setup(page, { status: 200, body: { ok: true } });
    const dialog = await openDialog(page, isMobile);
    await dialog.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page.getByText("Dein Konto wurde gelöscht.")).toBeVisible();
    expect(calls).toEqual(["POST"]);
    expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
  });

  test("admins are told to ask another admin", async ({ page, isMobile }) => {
    const { key } = await setup(page, { status: 403, body: { error: "admin" } });
    const dialog = await openDialog(page, isMobile);
    await dialog.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page.getByText(/Admin-Konten lassen sich hier nicht löschen/)).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), key)).not.toBeNull();
  });
});
