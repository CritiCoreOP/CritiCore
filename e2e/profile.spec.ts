import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Own and public profile with a fake session: every Supabase request and every poster is
 * answered locally, so the page can be driven without an account.
 */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const USER_ID = "11111111-2222-4333-8444-555555555555";
const FRIEND_ID = "22222222-3333-4444-8555-666666666666";
const ASKING_ID = "33333333-4444-4555-8666-777777777777";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const session = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER_ID, role: "authenticated", exp: 4102444800 })}.test`,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800,
  refresh_token: "test-refresh",
  user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "mara@test.localhost", app_metadata: {}, user_metadata: {} },
};

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

const PROFILE = {
  id: "p1",
  user_id: USER_ID,
  display_name: "Mara Lindqvist",
  username: "maral",
  avatar_url: null,
  bio: "Schaut Slow-Cinema, spielt Soulslikes und schreibt zu beidem zu lange Reviews.",
  status: "active",
  created_at: "2025-03-14T10:00:00Z",
  updated_at: daysAgo(3),
  is_official: false,
  username_changed_at: daysAgo(90),
  display_name_changed_at: daysAgo(3),
  onboarding_completed_at: daysAgo(200),
  post_karma: 812,
  comment_karma: 431,
  forum_onboarded_at: null,
  anime_title_language: "romaji",
};

// Review titles are the reviewer's own headline, never the film's name
const REVIEWS = [
  { id: "r1", media_id: "693134", media_type: "movie", score: 9, title: "Sand, Stille, Wucht", content: "Villeneuve baut Räume, in denen man sich verliert. Der Ton allein trägt die zweite Hälfte.", created_at: daysAgo(2), is_critic_review: false, season_number: null, episode_number: null },
  { id: "r2", media_id: "209867", media_type: "series", score: 8.5, title: null, content: "Leise, traurig, warm. Jede Folge ein kleines Abschiedsgeschenk.", created_at: daysAgo(9), is_critic_review: false, season_number: 1, episode_number: null },
  { id: "r3", media_id: "1942", media_type: "game", score: 7.5, title: "Zu groß, aber schön", content: null, created_at: daysAgo(20), is_critic_review: false, season_number: null, episode_number: null },
  { id: "r4", media_id: "872585", media_type: "movie", score: 6, title: null, content: "Drei Stunden, die sich nach vier anfühlen.", created_at: daysAgo(40), is_critic_review: false, season_number: null, episode_number: null },
  { id: "r5", media_id: "209867", media_type: "series", score: 9.5, title: null, content: null, created_at: daysAgo(55), is_critic_review: false, season_number: 1, episode_number: 10 },
];

const TITLES: Record<string, { title: string; year: string; hue: number }> = {
  "693134": { title: "Dune: Part Two", year: "2024", hue: 32 },
  "209867": { title: "Frieren: Beyond Journey's End", year: "2023", hue: 205 },
  "872585": { title: "Oppenheimer", year: "2023", hue: 12 },
  "157336": { title: "Interstellar", year: "2014", hue: 220 },
  "1942": { title: "The Witcher 3: Wild Hunt", year: "2015", hue: 140 },
};

function reply(route: Route, body: unknown, status = 200, count?: number) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-expose-headers": "content-range",
      ...(count !== undefined ? { "content-range": `0-${Math.max(0, count - 1)}/${count}` } : {}),
    },
    body: status === 204 ? "" : JSON.stringify(body),
  });
}

function poster(route: Route) {
  const id = route.request().url().split("/").pop()!.replace(/\.\w+$/, "");
  const entry = TITLES[id] ?? { title: id, hue: 260 };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="185" height="278"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${entry.hue} 45% 42%)"/><stop offset="1" stop-color="hsl(${entry.hue} 50% 14%)"/></linearGradient></defs><rect width="185" height="278" fill="url(#g)"/><text x="14" y="246" font-family="Arial" font-size="15" font-weight="700" fill="white">${entry.title.slice(0, 18)}</text></svg>`;
  return route.fulfill({ status: 200, contentType: "image/svg+xml", body: svg });
}

interface Calls {
  profilePatches: Record<string, unknown>[];
  friendshipPatches: Record<string, unknown>[];
  deletedSaves: string[];
}

async function openProfile(page: Page, url = "/de-DE/profil"): Promise<Calls> {
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  await page.addInitScript(
    ([key, s]) => {
      localStorage.setItem(key, JSON.stringify(s));
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
    },
    [`sb-${ref}-auth-token`, session] as const,
  );
  const calls: Calls = { profilePatches: [], friendshipPatches: [], deletedSaves: [] };
  await page.route("https://image.tmdb.org/**", poster);
  await page.route("https://images.igdb.com/**", poster);
  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const p = u.pathname;
    const q = (k: string) => u.searchParams.get(k) || "";
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (p.startsWith("/auth/v1/user")) return reply(route, session.user);
    if (p.startsWith("/auth/v1/")) return reply(route, {});

    if (p === "/functions/v1/tmdb") {
      const { endpoint } = req.postDataJSON() as { endpoint: string };
      const id = endpoint.split("/")[2];
      const t = TITLES[id];
      if (!t) return reply(route, { error: "not found" }, 404);
      return reply(route, endpoint.startsWith("/movie") ? { id: Number(id), title: t.title, release_date: `${t.year}-03-01`, poster_path: `/${id}.jpg` } : { id: Number(id), name: t.title, first_air_date: `${t.year}-09-29`, poster_path: `/${id}.jpg` });
    }
    if (p === "/functions/v1/igdb") return reply(route, [{ id: 1942, name: TITLES["1942"].title, first_release_date: 1431993600, cover: { image_id: "1942" } }]);
    if (p.startsWith("/functions/v1/")) return reply(route, { results: [] });

    if (p === "/rest/v1/profiles") {
      if (req.method() === "PATCH") {
        calls.profilePatches.push(req.postDataJSON());
        return reply(route, null, 204);
      }
      if (q("username").startsWith("eq.")) return reply(route, q("username") === "eq.filmfan" ? [{ id: "other" }] : []);
      if (q("user_id").startsWith("in.")) {
        return reply(route, [
          { user_id: FRIEND_ID, display_name: "Jonas Ebert", username: "jonas_e", avatar_url: null },
          { user_id: ASKING_ID, display_name: "Lea Okafor", username: "lea.o", avatar_url: null },
        ]);
      }
      if (q("user_id") === `eq.${FRIEND_ID}`) return reply(route, { ...PROFILE, user_id: FRIEND_ID, display_name: "Jonas Ebert", username: "jonas_e", bio: null, staff_roles: [] });
      if (q("select") === "created_at") return reply(route, []);
      return reply(route, single ? PROFILE : [PROFILE]);
    }
    if (p === "/rest/v1/reviews") return reply(route, q("user_id") === `eq.${USER_ID}` ? REVIEWS : REVIEWS.slice(0, 3));
    if (p === "/rest/v1/user_saves") {
      if (req.method() === "DELETE") {
        calls.deletedSaves.push(q("id"));
        return reply(route, null, 204);
      }
      return reply(route, [
        { id: "s1", target_id: "157336", target_type: "movie", created_at: daysAgo(1) },
        { id: "s2", target_id: "1942", target_type: "game", created_at: daysAgo(4) },
        { id: "s3", target_id: "old-post", target_type: "forum_post", created_at: daysAgo(400) },
      ]);
    }
    if (p === "/rest/v1/username_history") return reply(route, [{ id: "h1", old_username: "mara_l", changed_at: daysAgo(90) }]);
    if (p === "/rest/v1/media_status") {
      return reply(route, [
        { id: "m1", user_id: USER_ID, media_id: "693134", media_type: "movie", media_title: "Dune: Part Two", media_poster: "https://image.tmdb.org/t/p/w342/693134.jpg", status: "watched", created_at: daysAgo(3) },
        { id: "m2", user_id: USER_ID, media_id: "1942", media_type: "game", media_title: "The Witcher 3: Wild Hunt", media_poster: "https://images.igdb.com/igdb/image/upload/t_cover_big/1942.jpg", status: "played", created_at: daysAgo(30) },
      ]);
    }
    if (p === "/rest/v1/custom_lists") return reply(route, [{ id: "l1", user_id: USER_ID, name: "Wüstenfilme", description: "Sand, Hitze, große Bilder.", is_public: true, cover_image_url: null, created_at: daysAgo(60), updated_at: daysAgo(2) }]);
    if (p === "/rest/v1/custom_list_items") {
      return reply(route, [
        { id: "i1", list_id: "l1", media_id: "693134", media_type: "movie", media_title: "Dune: Part Two", media_poster: "https://image.tmdb.org/t/p/w342/693134.jpg", sort_order: 0, added_at: daysAgo(5) },
        { id: "i2", list_id: "l1", media_id: "872585", media_type: "movie", media_title: "Oppenheimer", media_poster: "https://image.tmdb.org/t/p/w342/872585.jpg", sort_order: 1, added_at: daysAgo(6) },
      ]);
    }
    if (p === "/rest/v1/friendships") {
      if (req.method() === "PATCH") {
        calls.friendshipPatches.push(req.postDataJSON());
        return reply(route, null, 204);
      }
      return reply(route, [
        { id: "f1", requester_id: USER_ID, addressee_id: FRIEND_ID, status: "accepted", created_at: daysAgo(30), updated_at: daysAgo(30) },
        { id: "f2", requester_id: ASKING_ID, addressee_id: USER_ID, status: "pending", created_at: daysAgo(1), updated_at: daysAgo(1) },
      ]);
    }
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : [], 200, 0);
    return reply(route, {});
  });
  await page.goto(url, { waitUntil: "networkidle" });
  return calls;
}

const shots = (page: Page, name: string) =>
  process.env.PROFILE_SHOTS ? page.screenshot({ path: path.join(process.env.PROFILE_SHOTS, `${name}-${test.info().project.name}.png`), fullPage: true }) : Promise.resolve();

test.describe("profile", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("shows who someone is, what they rated and how", async ({ page }) => {
    await openProfile(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mara Lindqvist");
    await expect(page.getByText("@maral", { exact: true })).toBeVisible();
    await expect(page.getByText("Früher @mara_l")).toBeVisible();
    await expect(page.getByText("Veteran")).toBeVisible();

    const overview = page.getByRole("region", { name: "Überblick" });
    await expect(overview.getByText("Bewertungen", { exact: true })).toBeVisible();
    await expect(overview.getByText("8,1", { exact: true })).toBeVisible();
    await expect(page.getByText("5 Bewertungen, Ø 8,1")).toBeVisible();

    // The film's name leads, the reviewer's headline follows
    const first = page.getByRole("tabpanel").getByRole("listitem").first();
    await expect(first).toContainText("Dune: Part Two");
    await expect(first).toContainText("Sand, Stille, Wucht");
    await expect(page.getByRole("tabpanel")).toContainText("Staffel 1, Folge 10");
    await shots(page, "profile-own");

    await page.getByRole("button", { name: /^Games/ }).click();
    await expect(page.getByRole("tabpanel").getByRole("listitem")).toHaveCount(1);
    await expect(page.getByRole("tabpanel")).toContainText("The Witcher 3");

    // Nothing overflows sideways on a phone
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("tabs live in the URL, saves can be removed, requests answered", async ({ page }) => {
    const calls = await openProfile(page, "/de-DE/profil?tab=saves");
    const panel = page.getByRole("tabpanel");
    // Forum saves from the old forum stay out
    await expect(panel.getByRole("listitem")).toHaveCount(2);
    await expect(panel).toContainText("Interstellar");
    await shots(page, "profile-saves");
    await panel.getByRole("button", { name: "Nicht mehr merken: Interstellar" }).click();
    await expect(panel.getByRole("listitem")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Rückgängig" })).toBeVisible();
    expect(calls.deletedSaves).toEqual(["eq.s1"]);

    await page.getByRole("tab", { name: /Freunde/ }).click();
    await expect(page).toHaveURL(/tab=friends/);
    await expect(page.getByRole("heading", { name: /Anfragen/ })).toBeVisible();
    await expect(page.getByText("Lea Okafor")).toBeVisible();
    await page.getByRole("button", { name: "Annehmen" }).click();
    await expect.poll(() => calls.friendshipPatches.length).toBe(1);
    expect(calls.friendshipPatches[0]).toMatchObject({ status: "accepted" });

    await page.getByRole("tab", { name: /Listen/ }).click();
    await expect(page.getByRole("link", { name: "Wüstenfilme" })).toBeVisible();
    await expect(page.getByText("Öffentlich, 2 Einträge")).toBeVisible();
  });

  test("edits name, handle and bio in one sheet", async ({ page }) => {
    const calls = await openProfile(page);
    await page.getByRole("button", { name: "Profil bearbeiten" }).click();
    const sheet = page.getByRole("dialog", { name: "Profil bearbeiten" });
    await expect(sheet).toBeVisible();
    // The display name was changed three days ago
    await expect(sheet.getByLabel("Anzeigename")).toBeDisabled();
    await expect(sheet.getByText("Anzeigename kann erst in 4 Tagen geändert werden.")).toBeVisible();

    const handle = sheet.getByLabel("Benutzername");
    await handle.fill("Film Fan");
    await expect(handle).toHaveValue("filmfan");
    await expect(sheet.getByText("Dieser Benutzername ist bereits vergeben.")).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Speichern" })).toBeDisabled();
    await handle.fill("mara.watches");
    await expect(sheet.getByText("Verfügbar")).toBeVisible();

    await sheet.getByLabel("Bio").fill("Slow-Cinema und Soulslikes.");
    await expect(sheet.getByText("27 / 300")).toBeVisible();
    await shots(page, "profile-edit");
    await sheet.getByRole("button", { name: "Speichern" }).click();
    await expect(sheet).toBeHidden();
    expect(calls.profilePatches[0]).toMatchObject({ bio: "Slow-Cinema und Soulslikes.", username: "mara.watches" });
    await expect(page.getByText("@mara.watches", { exact: true })).toBeVisible();
    await expect(page.getByText("Früher @maral, @mara_l")).toBeVisible();
  });

  test("the public profile uses the same parts", async ({ page }) => {
    await openProfile(page, `/de-DE/user/${FRIEND_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jonas Ebert");
    await expect(page.getByRole("button", { name: "Freund entfernen" })).toBeVisible();
    await expect(page.getByRole("tabpanel")).toContainText("Dune: Part Two");
    await shots(page, "profile-public");
  });
});
