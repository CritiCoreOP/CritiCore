import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Top-10 graphics in the admin area. A fake admin session and every Supabase request answered
 * locally, cover pictures included; nothing reaches the real project.
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

const COLORS = ["#4c6ef5", "#e8590c", "#2b8a3e", "#c2255c", "#5f3dc4", "#0b7285", "#f08c00", "#495057", "#a61e4d", "#1864ab"];
const picture = (w: number, h: number, fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${fill}"/></svg>`;

/** A real raster image (the graphic is exported via SVG, and SVG covers inside it fail to render) */
const PNG_1X1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const pngOf = (_color: string) => Buffer.from(PNG_1X1, "base64");

const ENTRIES = Array.from({ length: 10 }, (_, i) => ({
  id: `e${i}`,
  title: ["Frieren", "Apothecary Diaries", "Dandadan", "Steel Ball Run", "Black Clover", "Blue Box", "Polar Opposites", "Ramparts of Ice", "Ranma 1/2", "Reincarnated as a Sword"][i],
  subtitle: i === 1 ? "Staffel 3" : "",
  poster: `https://images.test/p${i}.jpg`,
  backdrop: null,
  value: `${(11.85 - i * 1.05).toFixed(2).replace(".", ",")} %`,
  trend: i === 0 ? "up" : i === 3 ? "down" : "new",
  trendBy: 2,
}));

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
    body: JSON.stringify(body),
  });
}

async function openTopTen(page: Page, draft?: unknown, lastWeek?: string[]) {
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  await page.addInitScript(
    ([key, s, d, w]) => {
      localStorage.setItem(key, JSON.stringify(s));
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
      if (d) localStorage.setItem("admin-topten-draft", JSON.stringify(d));
      else localStorage.removeItem("admin-topten-draft");
      // A list fetched eight days ago, to compare the movement with
      if (w) localStorage.setItem("admin-topten-last-anime", JSON.stringify({ latest: { at: Date.now() - 8 * 86_400_000, keys: w } }));
      else localStorage.removeItem("admin-topten-last-anime");
    },
    [`sb-${ref}-auth-token`, session, draft ?? null, lastWeek ?? null] as const,
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
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    // The image proxy: one colour per cover, CORS open like the real function
    if (p.endsWith("/functions/v1/news-image")) {
      const n = Number(url.searchParams.get("src")?.match(/p(\d)\.jpg/)?.[1] ?? 7);
      return route.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: pngOf(COLORS[n]) });
    }
    if (p.endsWith("/functions/v1/anilist") && req.postDataJSON()?.op === "trending") {
      const media = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, title: { romaji: `Trend ${i + 1}`, english: null, native: null, userPreferred: null }, coverImage: { extraLarge: `https://images.test/p${i % 10}.jpg`, large: null, medium: null, color: null }, bannerImage: null, averageScore: 90 - i, isAdult: i === 11 }));
      return reply(route, { data: { Page: { pageInfo: { hasNextPage: false, currentPage: 1, total: 12 }, media } } });
    }
    if (p.endsWith("/functions/v1/tmdb")) {
      const { endpoint } = req.postDataJSON() ?? {};
      if (String(endpoint).startsWith("/genre")) return reply(route, { genres: [{ id: 16, name: "Animation" }] });
      const results = Array.from({ length: 12 }, (_, i) => ({ id: 500 + i, name: `TMDB Anime ${i + 1}`, poster_path: `/p${i % 10}.jpg`, backdrop_path: null, vote_average: 8 - i / 10, vote_count: 400, first_air_date: "2026-10-01", genre_ids: [16] }));
      return reply(route, { results });
    }
    if (p.endsWith("/functions/v1/anilist")) {
      const media = [{ id: 154587, title: { romaji: "Sousou no Frieren", english: "Frieren", native: null, userPreferred: null }, coverImage: { extraLarge: "https://images.test/p0.jpg", large: null, medium: null, color: null }, bannerImage: null, seasonYear: 2023, isAdult: false }];
      return reply(route, { data: { Page: { pageInfo: { hasNextPage: false, currentPage: 1, total: 1 }, media } } });
    }
    if (p.startsWith("/functions/v1/") || p.startsWith("/storage/v1/")) return reply(route, {});
    return route.abort();
  });
  await page.route("https://images.test/**", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: picture(600, 900, "#868e96") }));
  await page.goto("/de-DE/admin/top10", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Top 10", level: 1 })).toBeVisible();
}

test.describe("admin top 10", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("a title is found in the data source and lands on the graphic", async ({ page }) => {
    await openTopTen(page);
    await expect(page.getByRole("button", { name: "Als PNG speichern" })).toBeDisabled();
    await page.getByLabel("Überschrift").fill("Top 10 Anime der Woche");
    const first = page.getByTestId("topten-entry").first();
    await first.getByRole("button", { name: "Titel suchen" }).click();
    await page.getByRole("textbox", { name: "Titel suchen" }).fill("Frieren");
    await page.getByRole("button", { name: /Sousou no Frieren/ }).click();
    await expect(first.getByLabel("Titel", { exact: true })).toHaveValue("Sousou no Frieren");
    await first.getByLabel("Wert", { exact: true }).fill("11,85 %");

    const canvas = page.getByTestId("topten-canvas");
    await expect(canvas).toContainText("Sousou no Frieren");
    await expect(canvas).toContainText("11,85 %");
    // A new place has no trend badge until one is chosen
    await expect(canvas).not.toContainText("NEU");
    await first.getByRole("combobox", { name: "Veränderung" }).click();
    await page.getByRole("option", { name: "Neu" }).click();
    await expect(canvas).toContainText("NEU");
    // The count of the heading in the accent colour
    await expect(canvas.getByText("Top 10", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Als PNG speichern" })).toBeEnabled();
  });

  test("a full list exports as PNG in every format, and the draft survives a reload", async ({ page }) => {
    // Four exports in a row; Safari renders each one twice
    test.setTimeout(90_000);
    await openTopTen(page, { world: "anime", title: "Top 10 Anime der Woche", period: "Woche 41, 3. bis 9. Oktober 2026", footer: "Basierend auf 5.164 Stimmen", accent: "blue", lang: "de", entries: ENTRIES });
    const canvas = page.getByTestId("topten-canvas");
    await expect(canvas).toContainText("Reincarnated as a Sword");
    await expect(canvas).toContainText("Staffel 3");

    const shots = process.env.TOPTEN_SHOTS;
    for (const [label, file] of [["Feed", "portrait"], ["Story", "story"], ["Quadrat", "square"], ["Quer", "landscape"]] as const) {
      await page.getByRole("tab", { name: new RegExp(`^${label}`) }).click();
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Als PNG speichern" }).click();
      const dl = await download;
      expect(dl.suggestedFilename()).toBe(`top-10-anime-der-woche-${file}.png`);
      const saved = await dl.path();
      expect(fs.statSync(saved!).size).toBeGreaterThan(20_000);
      if (shots) await dl.saveAs(path.join(shots, `topten-${file}.png`));
      // The square only has room for the first five
      if (file === "square") await expect(page.getByText("Das Quadrat zeigt die ersten fünf Plätze.")).toBeVisible();
    }

    await page.reload();
    await expect(page.getByLabel("Überschrift")).toHaveValue("Top 10 Anime der Woche");
  });

  test("the trending list fills the places, with movement against last week", async ({ page }) => {
    await openTopTen(page, undefined, ["anilist-2", "anilist-1", "anilist-3"]);
    await page.getByRole("button", { name: "Automatisch füllen" }).click();
    const entries = page.getByTestId("topten-entry");
    await expect(entries.nth(0).getByLabel("Titel", { exact: true })).toHaveValue("Trend 1");
    await expect(entries.nth(9).getByLabel("Titel", { exact: true })).toHaveValue("Trend 10");
    // Rating out of 10, in the language of the graphic
    await expect(entries.nth(0).getByLabel("Wert", { exact: true })).toHaveValue("9,0");
    // Was second a week ago: up one; was first: down one; not there: new
    await expect(entries.nth(0).getByRole("combobox", { name: "Veränderung" })).toHaveText("Gestiegen");
    await expect(entries.nth(1).getByRole("combobox", { name: "Veränderung" })).toHaveText("Gefallen");
    await expect(entries.nth(2).getByRole("combobox", { name: "Veränderung" })).toHaveText("Gleich");
    await expect(entries.nth(3).getByRole("combobox", { name: "Veränderung" })).toHaveText("Neu");
    await expect(page.getByLabel("Überschrift")).toHaveValue("Top 10 Anime der Woche");
    await expect(page.getByLabel("Zeitraum")).toHaveValue(/^KW \d+ · \d{4}$/);
    await expect(page.getByLabel("Fußzeile")).toHaveValue("Quelle: AniList · Trends der Woche");
    await expect(page.getByTestId("topten-source-hint")).toContainText("Trends im Vergleich zu deinem Abruf vom");
    const canvas = page.getByTestId("topten-canvas");
    await expect(canvas).toContainText("Trend 10");
    await expect(canvas).toContainText("NEU");
    // Badges off: the graphic shows the order only
    // By keyboard: on phones Playwright scrolls the switch under the fixed header or tab bar and the tap lands there
    const trends = page.getByLabel("Trends anzeigen");
    await trends.focus();
    await page.keyboard.press("Space");
    await expect(trends).toHaveAttribute("aria-checked", "false");
    await expect(canvas).not.toContainText("NEU");
  });

  test("another data source: a first fetch from TMDB shows no trend anywhere", async ({ page }) => {
    await openTopTen(page);
    await page.getByRole("combobox", { name: "Liste" }).click();
    await page.getByRole("option", { name: "TMDB · Gerade beliebt" }).click();
    await expect(page.getByTestId("topten-source-hint")).toContainText("„Gerade beliebt“ von TMDB");
    await page.getByRole("button", { name: "Automatisch füllen" }).click();

    const entries = page.getByTestId("topten-entry");
    await expect(entries.nth(0).getByLabel("Titel", { exact: true })).toHaveValue("TMDB Anime 1");
    await expect(entries.nth(0).getByLabel("Zusatz, z. B. Staffel 3")).toHaveValue("Animation · 2026");
    await expect(entries.nth(0).getByLabel("Wert", { exact: true })).toHaveValue("8,0");
    await expect(entries.nth(0).getByRole("combobox", { name: "Veränderung" })).toHaveText("Kein Trend");
    await expect(page.getByTestId("topten-source-hint")).toContainText("Erster Abruf dieser Liste");
    await expect(page.getByLabel("Überschrift")).toHaveValue("Top 10 Anime im Moment");
    await expect(page.getByLabel("Fußzeile")).toHaveValue("Quelle: TMDB · Gerade beliebt");
    await expect(page.getByTestId("topten-canvas")).not.toContainText("NEU");
    if (process.env.TOPTEN_SHOTS) {
      await page.getByTestId("topten-source-hint").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(process.env.TOPTEN_SHOTS, `topten-source-${test.info().project.name}.png`) });
    }

    // Fetched again: a heading written by hand stays, an emptied source line comes back
    await page.getByLabel("Überschrift").fill("Meine Anime-Liste");
    await page.getByLabel("Fußzeile").fill("");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Automatisch füllen" }).click();
    await expect(page.getByLabel("Fußzeile")).toHaveValue("Quelle: TMDB · Gerade beliebt");
    await expect(page.getByLabel("Überschrift")).toHaveValue("Meine Anime-Liste");
  });

  test("all formats in one ZIP, a post text, values off, places reordered by dragging", async ({ page, browserName, isMobile }) => {
    test.setTimeout(90_000);
    await openTopTen(page, { world: "anime", title: "Top 10 Anime der Woche", period: "Woche 41", footer: "Basierend auf 5.164 Stimmen", accent: "blue", lang: "de", entries: ENTRIES });

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Alle Formate (ZIP)" }).click();
    const dl = await download;
    expect(dl.suggestedFilename()).toBe("top-10-anime-der-woche.zip");
    expect(fs.statSync((await dl.path())!).size).toBeGreaterThan(50_000);

    const post = page.getByTestId("topten-post-text");
    await expect(post).toHaveValue(/^Top 10 Anime der Woche\nWoche 41\n\n1\. Frieren: 11,85 %\n2\. Apothecary Diaries \(Staffel 3\): 10,80 %/);
    await expect(post).toHaveValue(/#CritiCore #Top10 #Anime$/);

    await page.getByLabel("Werte anzeigen").click();
    await expect(page.getByTestId("topten-canvas")).not.toContainText("11,85 %");
    await expect(post).not.toHaveValue(/11,85/);

    // HTML drag and drop needs a real mouse; phones reorder with the arrow buttons
    if (isMobile || browserName !== "chromium") return;
    const entries = page.getByTestId("topten-entry");
    await entries.nth(2).getByTitle("Ziehen zum Umsortieren").dragTo(entries.nth(0));
    await expect(entries.nth(0).getByLabel("Titel", { exact: true })).toHaveValue("Dandadan");
    await expect(entries.nth(1).getByLabel("Titel", { exact: true })).toHaveValue("Frieren");
  });
});
