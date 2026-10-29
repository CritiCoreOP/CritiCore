import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Press dashboard (/redaktion). Like the editor tests, a fake press session and every Supabase
 * request answered locally; nothing reaches the real project.
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
  user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "presse@test.localhost", app_metadata: {}, user_metadata: {} },
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const base = { user_id: USER_ID, category: "games", cover_image_url: null, excerpt: null, published: false };
const ARTICLES = [
  { ...base, id: "a1000000-0000-4000-8000-000000000001", title: "Test: Hollow Knight Silksong", article_type: "review", status: "writing", slug: "silksong", updated_at: hoursAgo(2) },
  { ...base, id: "a1000000-0000-4000-8000-000000000002", title: "Was Teil 2 besser machen muss", article_type: "news", status: "idea", slug: "idee", updated_at: hoursAgo(30), excerpt: "Erste Gedanken" },
  { ...base, id: "a1000000-0000-4000-8000-000000000003", title: "Der Herbst der Remakes", article_type: "opinion", status: "published", published: true, slug: "remakes", updated_at: hoursAgo(200) },
];

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
    body: JSON.stringify(body),
  });
}

interface Calls {
  inserts: Record<string, unknown>[];
  updates: { url: string; body: Record<string, unknown> }[];
}

async function openDashboard(page: Page): Promise<Calls> {
  const calls: Calls = { inserts: [], updates: [] };
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  await page.addInitScript(
    ([key, s]) => {
      localStorage.setItem(key, JSON.stringify(s));
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
      localStorage.setItem("redaktion.tour.v1", "1");
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
    if (p.startsWith("/rest/v1/rpc/can_press_publish")) return reply(route, false);
    if (p.startsWith("/rest/v1/rpc/")) return reply(route, null);
    if (p.startsWith("/rest/v1/user_roles")) return reply(route, single ? { role: "press" } : [{ role: "press" }]);
    if (p.startsWith("/rest/v1/profiles")) {
      const prof = { user_id: USER_ID, display_name: "Simon", avatar_url: null, username: "simon", onboarding_completed_at: "2026-01-01T00:00:00Z" };
      return reply(route, single ? prof : [prof]);
    }
    if (p.startsWith("/rest/v1/articles")) {
      if (req.method() === "POST") {
        calls.inserts.push(req.postDataJSON());
        return reply(route, { id: "a1000000-0000-4000-8000-000000000009" }, 201);
      }
      if (req.method() === "PATCH") {
        calls.updates.push({ url: req.url(), body: req.postDataJSON() });
        return reply(route, single ? {} : []);
      }
      // The draft has text, the idea is still empty
      if (url.searchParams.get("select") === "content") return reply(route, { content: url.searchParams.get("id")?.endsWith("2") ? "" : "<p>Eins zwei drei vier.</p>" });
      return reply(route, single ? ARTICLES[0] : ARTICLES);
    }
    if (p.startsWith("/rest/v1/article_briefings")) {
      return reply(route, [{ id: "b1", body: "Bitte bis gestern", deadline: hoursAgo(30), created_at: hoursAgo(80), article_id: ARTICLES[0].id }]);
    }
    if (p.startsWith("/rest/v1/article_comments")) {
      return reply(route, [{ id: "c1", article_id: ARTICLES[0].id, body: "Quelle für die Preisangabe fehlt", created_at: hoursAgo(5) }]);
    }
    if (p.startsWith("/rest/v1/article_reactions")) return reply(route, [{ article_id: ARTICLES[2].id }, { article_id: ARTICLES[2].id }]);
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    if (p.startsWith("/functions/v1/tmdb")) {
      return reply(route, { results: [{ id: 1, title: "Dune: Part Three", release_date: "2026-12-18" }], total_pages: 1 });
    }
    if (p.startsWith("/functions/v1/story-ideas")) {
      const body = req.postDataJSON();
      if (body.mode === "discover") {
        return reply(route, { ideas: [{ headline: "Dune 3: Was das Finale erzählen muss", pitch: "Ein Ausblick für Kinogänger.", type: "opinion", kind: "movie", title: "Dune: Part Three" }] });
      }
      return reply(route, {
        type: "opinion",
        angles: [{ title: "Vergleich", pitch: "Teil 1 und 2 im direkten Vergleich." }],
        headlines: ["Fünf Dinge, die Teil 2 besser machen muss", "Was die Fortsetzung lernen sollte"],
        outline: ["Was Teil 1 gut gemacht hat", "Wo es hakt", "Fazit"],
        questions: ["Gibt es schon einen Termin?"],
      });
    }
    if (p.startsWith("/functions/v1/") || p.startsWith("/storage/v1/")) return reply(route, {});
    return route.abort();
  });
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await page.goto("/de-DE/redaktion", { waitUntil: "networkidle" });
  expect(crashes, "page errors while opening the dashboard").toEqual([]);
  await expect(page.getByRole("heading", { name: "Hallo, Simon" })).toBeVisible();
  return calls;
}

test.describe("press dashboard", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("shows what to continue, what is due and how readers responded", async ({ page }) => {
    await openDashboard(page);
    await expect(page.getByText("1 Entwurf in Arbeit, 1 Idee, 1 Deadline steht an")).toBeVisible();
    // Overdue deadline and open feedback at the top
    await expect(page.getByRole("link", { name: /Deadline für „Test: Hollow Knight Silksong“ ist seit 1 Tag überfällig/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "1 offener Kommentar zu deinen Artikeln" })).toBeVisible();

    const continueSection = page.getByRole("region", { name: "Weiterschreiben" });
    await expect(continueSection.getByRole("heading", { name: "Test: Hollow Knight Silksong" })).toBeVisible();
    await expect(continueSection.getByText(/4 Wörter/)).toBeVisible();
    await expect(continueSection.getByRole("link", { name: "Weiterschreiben" })).toHaveAttribute("href", /\/news\/schreiben\?edit=a1000000-0000-4000-8000-000000000001/);

    const resonance = page.getByRole("region", { name: "Resonanz" });
    await expect(resonance.getByLabel("2 Reaktionen")).toBeVisible();
    await expect(page.getByText(/„Veröffentlichen“ legt sie zur Prüfung vor/)).toBeVisible();
  });

  test("an idea is noted in one line and stored in the idea column", async ({ page }) => {
    const calls = await openDashboard(page);
    await page.getByLabel("Idee notieren").fill("Warum Remakes gerade boomen");
    await page.keyboard.press("Enter");
    await expect.poll(() => calls.inserts.length).toBe(1);
    expect(calls.inserts[0]).toMatchObject({ title: "Warum Remakes gerade boomen", status: "idea", published: false, content: "", language: "de" });
  });

  test("an idea grows into headline, outline and questions and opens in the editor", async ({ page }) => {
    const calls = await openDashboard(page);
    const ideas = page.getByRole("region", { name: "Ideen" });
    await ideas.getByRole("button", { name: "Ausbauen" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Gibt es schon einen Termin?")).toBeVisible();
    await dialog.getByRole("button", { name: "Fünf Dinge, die Teil 2 besser machen muss" }).click();
    await dialog.getByRole("button", { name: /Vergleich/ }).click();
    await dialog.getByRole("button", { name: "Übernehmen und schreiben" }).click();
    await expect.poll(() => calls.updates.length).toBe(1);
    expect(calls.updates[0].body).toMatchObject({
      title: "Fünf Dinge, die Teil 2 besser machen muss",
      article_type: "opinion",
      status: "research",
      excerpt: "Teil 1 und 2 im direkten Vergleich.",
    });
    // The idea was empty, so the outline became its subheadings
    expect(calls.updates[0].body.content).toBe("<h2>Was Teil 1 gut gemacht hat</h2><p></p><h2>Wo es hakt</h2><p></p><h2>Fazit</h2><p></p>");
    await expect(page).toHaveURL(/\/news\/schreiben\?edit=a1000000-0000-4000-8000-000000000002/);
  });

  test("topic suggestions come from current trends and can be kept", async ({ page }) => {
    const calls = await openDashboard(page);
    await page.getByRole("button", { name: "Themen finden" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "Filme" }).click();
    await dialog.getByRole("button", { name: "Vorschläge holen" }).click();
    await expect(dialog.getByRole("heading", { name: "Dune 3: Was das Finale erzählen muss" })).toBeVisible();
    await expect(dialog.getByText("Film · Dune: Part Three")).toBeVisible();
    await dialog.getByRole("button", { name: "Merken" }).click();
    await expect(dialog.getByRole("button", { name: "Gemerkt" })).toBeDisabled();
    expect(calls.inserts[0]).toMatchObject({ title: "Dune 3: Was das Finale erzählen muss", excerpt: "Ein Ausblick für Kinogänger.", category: "movies", article_type: "opinion", status: "idea" });
  });

  test("the pipeline moves an article a step on", async ({ page }) => {
    const calls = await openDashboard(page);
    const pipeline = page.getByRole("region", { name: "Meine Pipeline" });
    await pipeline.getByRole("button", { name: "Nach „Review“ verschieben" }).click();
    await expect.poll(() => calls.updates.length).toBe(1);
    expect(calls.updates[0].body).toEqual({ status: "review", published: false });
    await expect(pipeline.getByRole("tab", { name: /Reviews*1/ })).toBeVisible();
  });
});
