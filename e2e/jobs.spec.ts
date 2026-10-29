import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** /jobs lists the open positions; admins write them in the dashboard */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const ADMIN = "44444444-5555-4666-8777-888888888888";

const JOBS = [
  {
    id: "j1",
    slug: "redakteur-in-games",
    title: "Redakteur:in Games (m/w/d)",
    team: "Redaktion",
    employment_type: "freelance",
    workplace: "remote",
    location: null,
    summary: "Du schreibst News und Reviews zu neuen Spielen und ordnest Ankündigungen ein.",
    description: "Wir suchen Verstärkung für unser Games-Ressort.\n\nDu arbeitest von zu Hause und stimmst dich im Team-Chat ab.",
    tasks: "- News zu Ankündigungen und Releases\n- Reviews mit Wertung\n- Mitarbeit an Liveblogs",
    profile: "- Sicheres Deutsch\n- Erfahrung mit Games",
    offer: "- Freie Zeiteinteilung\n- Zugang zu Testmustern",
    apply_email: null,
    apply_url: null,
    valid_through: "2099-12-31",
    published: true,
    published_at: "2026-10-20T08:00:00Z",
    sort_order: 0,
    created_at: "2026-10-19T08:00:00Z",
    updated_at: "2026-10-20T08:00:00Z",
  },
  {
    id: "j2",
    slug: "social-media",
    title: "Social Media (Teilzeit)",
    team: "Social",
    employment_type: "part_time",
    workplace: "hybrid",
    location: "Solingen",
    summary: "Du planst unsere Posts auf Instagram, TikTok und Bluesky.",
    description: "",
    tasks: "",
    profile: "",
    offer: "",
    apply_email: "social@example.org",
    apply_url: null,
    valid_through: null,
    published: true,
    published_at: "2026-10-18T08:00:00Z",
    sort_order: 1,
    created_at: "2026-10-18T08:00:00Z",
    updated_at: "2026-10-18T08:00:00Z",
  },
];

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const session = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: ADMIN, role: "authenticated", exp: 4102444800 })}.test`,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800,
  refresh_token: "test-refresh",
  user: { id: ADMIN, aud: "authenticated", role: "authenticated", email: "admin@test.localhost", app_metadata: {}, user_metadata: {} },
};

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, body: JSON.stringify(body) });
}

async function open(page: Page, url: string, { admin = false, jobs = JOBS, posted }: { admin?: boolean; jobs?: unknown[]; posted?: (b: Record<string, unknown>) => void } = {}) {
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  await page.addInitScript(
    ([key, s, signed]) => {
      if (signed) localStorage.setItem(key as string, JSON.stringify(s));
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
    },
    [`sb-${ref}-auth-token`, session, admin] as const,
  );
  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const u = new URL(req.url());
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (u.pathname.startsWith("/auth/v1/user")) return reply(route, session.user);
    if (u.pathname.startsWith("/auth/v1/")) return reply(route, {});
    if (u.pathname === "/rest/v1/job_postings") {
      if (req.method() === "POST") {
        posted?.(JSON.parse(req.postData() || "{}"));
        return reply(route, null, 201);
      }
      const slug = u.searchParams.get("slug");
      const list = slug ? jobs.filter((j) => `eq.${(j as { slug: string }).slug}` === slug) : jobs;
      return reply(route, single ? (list[0] ?? null) : list);
    }
    if (u.pathname === "/rest/v1/user_roles") return reply(route, admin ? [{ role: "admin" }] : []);
    if (u.pathname === "/rest/v1/profiles") {
      const p = { user_id: ADMIN, display_name: "Mara Engel", username: "mara", avatar_url: null, onboarding_completed_at: "2026-01-01T00:00:00Z", forum_onboarded_at: "2026-01-01T00:00:00Z", staff_roles: [] };
      return reply(route, single ? p : [p]);
    }
    if (u.pathname.startsWith("/rest/v1/rpc/has_role")) return reply(route, admin);
    if (u.pathname.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    return reply(route, {});
  });
  await page.goto(url, { waitUntil: "networkidle" });
}

const shot = async (page: Page, name: string) => {
  if (!process.env.JOBS_SHOTS) return;
  // Let the editor panel finish sliding in
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(process.env.JOBS_SHOTS, `${name}-${test.info().project.name}.png`), fullPage: true });
};

test.describe("jobs", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("the overview lists the open positions with type and workplace", async ({ page }) => {
    await open(page, "/de-DE/jobs");
    await expect(page.getByRole("heading", { level: 1, name: "Jobs bei CritiCore" })).toBeVisible();
    await expect(page.getByText("2 Stellen")).toBeVisible();
    await expect(page.getByRole("link", { name: /Redakteur:in Games/ })).toHaveAttribute("href", /\/jobs\/redakteur-in-games$/);
    await expect(page.getByText("Freiberuflich · Remote")).toBeVisible();
    await expect(page.getByText("Teilzeit · Hybrid, Solingen")).toBeVisible();
    await expect(page.getByRole("link", { name: "Initiativ bewerben" })).toHaveAttribute("href", /^mailto:.*subject=Initiativbewerbung/);
    await shot(page, "jobs-list");
  });

  test("without open positions the page says so", async ({ page }) => {
    await open(page, "/de-DE/jobs", { jobs: [] });
    await expect(page.getByText("Gerade keine offenen Stellen")).toBeVisible();
  });

  test("a posting shows its sections, the apply link and a JobPosting for Google", async ({ page }) => {
    await open(page, "/de-DE/jobs/redakteur-in-games");
    await expect(page.getByRole("heading", { level: 1, name: "Redakteur:in Games (m/w/d)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Deine Aufgaben" })).toBeVisible();
    await expect(page.getByText("Mitarbeit an Liveblogs")).toBeVisible();
    await expect(page.getByRole("link", { name: "Jetzt bewerben" })).toHaveAttribute("href", /^mailto:.*subject=Bewerbung%3A%20Redakteur%3Ain%20Games/);
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.some((s) => s.includes('"JobPosting"') && s.includes('"TELECOMMUTE"'))).toBe(true);
    await expect(page).toHaveTitle(/^Redakteur:in Games \(m\/w\/d\) – Jobs bei CritiCore/);
    await shot(page, "jobs-detail");
  });

  test("an unknown posting leads back to the overview", async ({ page }) => {
    await open(page, "/de-DE/jobs/gibt-es-nicht");
    await expect(page.getByRole("heading", { name: "Diese Stelle gibt es nicht mehr" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Alle Jobs" })).toBeVisible();
  });

  test("admins write a new posting in the dashboard", async ({ page }) => {
    let sent: Record<string, unknown> | null = null;
    await open(page, "/de-DE/dashboard/admin/jobs", { admin: true, posted: (b) => (sent = b) });
    await expect(page.getByRole("heading", { level: 1, name: "Jobs" })).toBeVisible();
    await expect(page.getByText("Redakteur:in Games (m/w/d)")).toBeVisible();
    await page.getByRole("button", { name: "Neue Stelle" }).click();
    await page.getByLabel("Titel").fill("Video-Editor:in für Shorts");
    await expect(page.getByLabel("Adresse")).toHaveValue("video-editor-in-fuer-shorts");
    await page.getByLabel("Kurzbeschreibung").fill("Du schneidest kurze Clips zu Trailern.");
    await page.getByLabel("Deine Aufgaben").fill("- Shorts schneiden\n- Untertitel");
    await shot(page, "jobs-admin");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect.poll(() => sent).not.toBeNull();
    expect(sent).toMatchObject({ slug: "video-editor-in-fuer-shorts", title: "Video-Editor:in für Shorts", employment_type: "freelance", workplace: "remote", published: false, tasks: "- Shorts schneiden\n- Untertitel" });
  });
});
