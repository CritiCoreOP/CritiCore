import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * About page (/ueber-uns). Every Supabase request and every cover image is answered locally; nothing
 * reaches the real project or the image CDNs. Reduced motion keeps the ring still, so its position
 * only changes when the test turns it.
 */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const COVER = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="#3b5bdb"/></svg>`;

const tmdb = (prefix: string, names: string[]) =>
  names.map((name, i) => ({
    id: 100 + i,
    title: name,
    name,
    overview: "",
    poster_path: `/${prefix}${i}.jpg`,
    backdrop_path: `/${prefix}-bg${i}.jpg`,
    vote_average: 7,
    release_date: "2026-01-01",
    genre_ids: [],
  }));
const MOVIES = tmdb("m", ["Dune: Teil Drei", "Avatar 3", "Mickey 17", "Sinners"]);
const SERIES = tmdb("s", ["Severance", "Andor", "The Bear", "Shogun"]);
const GAMES = ["Silksong", "Hades II", "Clair Obscur", "Split Fiction"].map((name, i) => ({
  id: 500 + i,
  name,
  slug: name.toLowerCase(),
  cover: { image_id: `cover${i}` },
  screenshots: [{ id: i, image_id: `shot${i}` }],
  genres: [],
  platforms: [],
}));
const ANIME = ["Frieren", "Dandadan", "Kaiju No. 8", "Solo Leveling"].map((name, i) => ({
  id: 900 + i,
  idMal: null,
  title: { romaji: name, english: name, native: name, userPreferred: name },
  coverImage: { extraLarge: `https://s4.anilist.co/file/a${i}.jpg`, large: null, medium: null, color: null },
  bannerImage: `https://s4.anilist.co/file/b${i}.jpg`,
  isAdult: false,
  genres: [],
}));
const TEAM = [{ user_id: "11111111-2222-4333-8444-555555555555", display_name: "Simon Althoff", username: "simon", avatar_url: null, staff_roles: ["editor_in_chief", "author"] }];

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
    body: JSON.stringify(body),
  });
}

async function mockBackend(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("criticore-lang", "de");
    localStorage.setItem("whatsNew_dismissed", "2026-12-31");
  });
  for (const host of ["https://image.tmdb.org/**", "https://images.igdb.com/**", "https://s4.anilist.co/**"]) {
    await page.route(host, (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: COVER }));
  }
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (p.endsWith("/functions/v1/tmdb")) {
      const endpoint = req.postDataJSON()?.endpoint as string;
      return reply(route, { results: endpoint.includes("/tv/") ? SERIES : MOVIES, total_pages: 1 });
    }
    if (p.endsWith("/functions/v1/igdb")) {
      const endpoint = req.postDataJSON()?.endpoint as string;
      if (endpoint === "/popularity_primitives") return reply(route, GAMES.map((g, i) => ({ game_id: g.id, value: 10 - i })));
      return reply(route, GAMES);
    }
    if (p.endsWith("/functions/v1/anilist")) {
      return reply(route, { data: { Page: { pageInfo: { hasNextPage: false, currentPage: 1, total: ANIME.length }, media: ANIME } } });
    }
    if (p.startsWith("/functions/v1/")) return reply(route, {});
    if (p.startsWith("/rest/v1/profiles")) return reply(route, TEAM);
    if (p.startsWith("/auth/v1/")) return reply(route, {});
    return reply(route, []);
  });
}

async function open(page: Page, url = "/de-DE/ueber-uns") {
  await mockBackend(page);
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** Into the middle of the screen: on phones the top bar and the dock cover the edges */
const centre = (locator: ReturnType<Page["locator"]>) => locator.evaluate((el) => el.scrollIntoView({ block: "center" }));

const ringAngle = (page: Page) =>
  page.getByTestId("poster-ring").locator("ul").evaluate((el) => (el as HTMLElement).style.transform);

test.describe("about page", () => {
  test.use({ reducedMotion: "reduce" });

  test("hero shows real titles on a ring that turns by button and by drag", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ehrlich bewertet.Ohne Werbung.");
    const ring = page.getByTestId("poster-ring");
    // All four worlds are on the ring
    for (const title of ["Dune: Teil Drei", "Severance", "Silksong", "Frieren"]) {
      await expect(ring.getByRole("img", { name: title })).toBeAttached();
    }
    await expect(ring.getByRole("link", { name: "Silksong" })).toHaveAttribute("href", "/de-DE/games/500");

    const start = await ringAngle(page);
    await page.getByRole("button", { name: "Nach rechts drehen" }).click();
    await expect.poll(() => ringAngle(page)).not.toBe(start);

    const afterButton = await ringAngle(page);
    const box = (await ring.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.7, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + 30, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => ringAngle(page)).not.toBe(afterButton);
  });

  test("rating dial follows keyboard and pointer on the real scale", async ({ page }) => {
    await open(page);
    const slider = page.getByRole("slider", { name: "Wertung von 0,5 bis 10" });
    const value = page.getByTestId("score-dial-value");
    await slider.focus();
    await page.keyboard.press("End");
    await expect(value).toHaveText("10.0");
    await page.keyboard.press("Home");
    await expect(value).toHaveText("0.5");
    await page.keyboard.press("ArrowRight");
    await expect(value).toHaveText("1.0");

    // Left edge of the gauge is 180°, a sixth of the sweep: 2.0
    const dial = page.getByTestId("score-dial");
    await centre(dial);
    const box = (await dial.boundingBox())!;
    await dial.click({ position: { x: box.width * 0.1, y: box.height / 2 } });
    await expect(value).toHaveText("2.0");
  });

  test("ad switch turns itself off, the language word changes", async ({ page }) => {
    await open(page);
    const adSwitch = page.getByTestId("about-ad-switch");
    await adSwitch.scrollIntoViewIfNeeded();
    await adSwitch.click();
    await expect(page.getByText("Bleibt aus. Diese Fläche bleibt leer.")).toBeVisible();
    await expect(adSwitch).toHaveAttribute("aria-checked", "false");

    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByTestId("about-language-word")).toHaveText("Review");
    await page.getByRole("button", { name: "TH", exact: true }).click();
    await expect(page.getByTestId("about-language-word")).toHaveText("รีวิว");
  });

  test("world cards: pick a world, swipe the top card to the back", async ({ page, browserName }) => {
    await open(page);
    const deck = page.getByTestId("worlds-deck");
    await centre(deck);
    await expect(deck.locator('[data-world="games"]')).toHaveAttribute("data-depth", "0");

    await page.getByRole("group", { name: "Welt wählen" }).getByRole("button", { name: "Filme" }).click();
    await expect(deck.locator('[data-world="movies"]')).toHaveAttribute("data-depth", "0");
    await expect(deck.getByRole("link", { name: "Filme ansehen" })).toHaveAttribute("href", "/de-DE/filme");

    // In the WebKit phone project the synthetic mouse drag does not reliably reach framer-motion's
    // drag (a standalone WebKit script moves it fine); the swipe is covered by Chrome desktop and Android
    if (browserName === "webkit") return;
    await centre(deck);
    const top = deck.locator('[data-depth="0"]');
    await top.hover({ position: { x: 40, y: 40 } });
    const box = (await deck.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5 + 220, box.y + box.height * 0.3, { steps: 10 });
    await page.mouse.up();
    await expect(deck.locator('[data-world="movies"]')).toHaveAttribute("data-depth", "3");
    // Order was films, games, series, anime: games comes up next
    await expect(deck.locator('[data-world="games"]')).toHaveAttribute("data-depth", "0");
  });

  test("team comes from the database, stickers can be thrown, no sideways scrolling", async ({ page, browserName }) => {
    await open(page);
    const member = page.getByTestId("about-team-member");
    await member.scrollIntoViewIfNeeded();
    await expect(member).toContainText("Simon Althoff");
    await expect(member).toContainText("Chefredaktion");
    await expect(page.getByRole("link", { name: "Presse-Account beantragen" })).toHaveAttribute("href", "/de-DE/presse");

    await expect(page.getByRole("link", { name: "Konto erstellen" })).toHaveAttribute("href", "/de-DE/auth");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Same WebKit limitation as the world cards
    if (browserName === "webkit") return;
    const sticker = page.getByTestId("about-sticker").first();
    await centre(sticker);
    // hover() waits until the sticker stands still and really receives the pointer
    await sticker.hover();
    const before = (await sticker.boundingBox())!;
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 90, before.y + before.height / 2 + 60, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => (await sticker.boundingBox())!.x).toBeGreaterThan(before.x + 40);
  });

  test("footer links the page", async ({ page }) => {
    await open(page, "/de-DE/impressum");
    await expect(page.getByTestId("site-footer").getByRole("link", { name: "Über uns" })).toHaveAttribute("href", "/de-DE/ueber-uns");
  });
});

const LOCALES: [string, string, string][] = [
  ["de-DE", "ueber-uns", "Ehrlich bewertet."],
  ["en-US", "about", "Honest reviews."],
  ["fr-FR", "a-propos", "Des avis honnêtes."],
  ["es-ES", "sobre-nosotros", "Reseñas honestas."],
  ["th-TH", "about", "รีวิวอย่างจริงใจ"],
];

for (const [locale, slug, title] of LOCALES) {
  test(`about page in ${locale}: translated, no raw keys`, async ({ page }) => {
    await open(page, `/${locale}/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/\baboutPage\.[a-zA-Z.]+/);
    expect(text).not.toMatch(/\btransparencyPage\.[a-zA-Z.]+/);
  });
}
