import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Article editor regressions. The editor needs a press/admin session, so these tests fake one:
 * a test session in localStorage and every Supabase request answered locally. Nothing reaches the
 * real project; unknown requests are aborted.
 */

const envPath = path.join(process.cwd(), ".env");
const SUPABASE_URL = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/^VITE_SUPABASE_URL="?([^"\r\n]+)/m) || [])[1]
  : undefined;

const USER_ID = "11111111-2222-4333-8444-555555555555";
const ARTICLE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const ARTICLE = {
  id: ARTICLE_ID,
  user_id: USER_ID,
  slug: "test-artikel",
  title: "Testartikel",
  excerpt: "Kurze Zusammenfassung",
  category: "games",
  article_type: "review",
  cover_image_url: null,
  tgn_plus: false,
  language: "de",
  translation_group: null,
  published: false,
  content: "<h2>Abschnitt</h2><p>Ein Satz mit <strong>fettem Text</strong> darin.</p><p>Zweiter Absatz ohne Format.</p>",
};

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const session = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER_ID, role: "authenticated", exp: 4102444800 })}.test`,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4102444800,
  refresh_token: "test-refresh",
  user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "redaktion@test.localhost", app_metadata: {}, user_metadata: {} },
};

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
    body: JSON.stringify(body),
  });
}

/** Pictures with real sizes, so aspect ratios can be measured: /wide.svg is 16:9, /tall.svg 4:5 */
const picture = (w: number, h: number, fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${fill}"/></svg>`;
const PICTURES: Record<string, string> = { "/wide.svg": picture(1600, 900, "#3b5bdb"), "/tall.svg": picture(800, 1000, "#e8590c") };

/**
 * `collaborator`: an invited co-author without press role, editing someone else's article.
 * `extra`: further article columns, e.g. a cover with its credit.
 */
async function openEditor(page: Page, as: "admin" | "collaborator" = "admin", content?: string, extra: Record<string, unknown> = {}) {
  const article = {
    ...(as === "collaborator" ? { ...ARTICLE, user_id: "22222222-3333-4444-8555-666666666666" } : ARTICLE),
    ...(content !== undefined ? { content } : {}),
    ...extra,
  };
  await page.route("https://images.test/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/svg+xml", body: PICTURES[new URL(route.request().url()).pathname] ?? picture(1200, 800, "#868e96") }),
  );
  // YouTube preview and title come from criticore.cc itself (a Pages Function, a proxy in dev)
  await page.route(/\/media\/yt\/[A-Za-z0-9_-]{11}\.(jpg|json)$/, (route) =>
    route.request().url().endsWith(".json")
      ? reply(route, { title: "Never Gonna Give You Up", author: "Rick Astley" })
      : route.fulfill({ status: 200, contentType: "image/svg+xml", body: picture(1280, 720, "#2b8a3e") }),
  );
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  await page.addInitScript(
    ([key, s]) => {
      localStorage.setItem(key, JSON.stringify(s));
      localStorage.setItem("criticore-lang", "de");
      localStorage.setItem("whatsNew_dismissed", "2026-08-01");
      localStorage.removeItem("article-draft-autosave");
    },
    [`sb-${ref}-auth-token`, session] as const,
  );
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (p.startsWith("/auth/v1/user")) return reply(route, session.user);
    if (p.startsWith("/auth/v1/")) return reply(route, {});
    if (p.startsWith("/rest/v1/rpc/can_press_publish")) return reply(route, true);
    if (p.startsWith("/rest/v1/rpc/")) return reply(route, null);
    if (p.startsWith("/rest/v1/user_roles")) {
      if (as === "collaborator") return reply(route, single ? null : []);
      return reply(route, single ? { role: "admin" } : [{ role: "admin" }]);
    }
    if (p.startsWith("/rest/v1/article_collaborators")) {
      const row = { id: "cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee" };
      return reply(route, as === "collaborator" ? (single ? row : [row]) : single ? null : []);
    }
    if (p.startsWith("/rest/v1/profiles")) {
      const prof = { user_id: USER_ID, display_name: "Test", avatar_url: null, username: "test", onboarding_completed_at: "2026-01-01T00:00:00Z" };
      return reply(route, single ? prof : [prof]);
    }
    if (p.startsWith("/rest/v1/articles")) {
      if (req.method() === "GET") return reply(route, single ? article : [article]);
      return reply(route, single ? { id: ARTICLE_ID } : [{ id: ARTICLE_ID }]);
    }
    if (p.startsWith("/rest/v1/")) return reply(route, single ? null : []);
    // Uploaded pictures are shown from the public URL; answer with a real image
    if (p.startsWith("/storage/v1/object/public/") && req.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "image/svg+xml", body: picture(1200, 800, "#868e96") });
    }
    if (p.startsWith("/functions/v1/") || p.startsWith("/storage/v1/")) return reply(route, {});
    return route.abort();
  });
  // A crash inside the editor page leaves a blank screen; report it instead of a missing element
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await page.goto(`/de-DE/news/schreiben?edit=${ARTICLE_ID}`, { waitUntil: "networkidle" });
  expect(crashes, "page errors while opening the editor").toEqual([]);
  if (content === undefined) await expect(page.locator(".ProseMirror strong")).toBeVisible();
  else await expect(page.locator(".ProseMirror")).toBeVisible();
}

test.describe("article editor", () => {
  test.skip(!SUPABASE_URL, "needs VITE_SUPABASE_URL in .env to know which requests to intercept");

  test("toolbar shows the formatting at the cursor", async ({ page }) => {
    await openEditor(page);
    const bold = page.getByRole("button", { name: "Fett", exact: true });
    await page.locator(".ProseMirror strong").click();
    await expect(bold).toHaveAttribute("aria-pressed", "true");
    await page.locator(".ProseMirror p").nth(1).click();
    await expect(bold).toHaveAttribute("aria-pressed", "false");
  });

  test("word count, unsaved state and preview follow typing", async ({ page }) => {
    await openEditor(page);
    const words = page.getByText(/\d+ Wörter/).first();
    const before = Number((await words.textContent())?.match(/\d+/)?.[0]);
    await page.locator(".ProseMirror p").last().click();
    await page.keyboard.press("End");
    await page.keyboard.type(" drei neue Wörter");
    await expect(words).toHaveText(new RegExp(`^${before + 3} Wörter`));
    await expect(page.getByText("Nicht gespeichert").first()).toBeVisible();

    await page.getByRole("button", { name: "Vorschau" }).first().click();
    await expect(page.getByRole("dialog").getByText("drei neue Wörter")).toBeVisible();
  });

  test("typed text survives returning to the tab", async ({ page }) => {
    let articleLoads = 0;
    page.on("request", (r) => {
      if (r.method() === "GET" && new URL(r.url()).pathname.startsWith("/rest/v1/articles")) articleLoads++;
    });
    await openEditor(page);
    const loadsAfterOpen = articleLoads;
    await page.locator(".ProseMirror p").last().click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Noch nicht gespeichert");

    // Supabase announces SIGNED_IN again whenever the tab becomes visible; that used to reload the article
    await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
    await page.waitForTimeout(1500);

    await expect(page.locator(".ProseMirror")).toContainText("Noch nicht gespeichert");
    expect(articleLoads).toBe(loadsAfterOpen);
  });

  test("link dialog rejects javascript: and completes bare domains", async ({ page }) => {
    await openEditor(page);
    await page.locator(".ProseMirror p").nth(1).click();
    await page.keyboard.press("Home");
    await page.keyboard.press("Shift+End");
    await page.keyboard.press("Control+k");
    const url = page.getByLabel("Adresse (URL)");
    await url.fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Übernehmen" }).click();
    await expect(page.getByText("Bitte eine gültige Webadresse eingeben.")).toBeVisible();
    await url.fill("criticore.cc/news");
    await page.getByRole("button", { name: "Übernehmen" }).click();
    await expect(page.locator(".ProseMirror a")).toHaveAttribute("href", "https://criticore.cc/news");
  });

  test("long titles wrap instead of being cut off", async ({ page }) => {
    await openEditor(page);
    const title = page.getByLabel("Titel", { exact: true });
    const oneLine = (await title.boundingBox())!.height;
    await title.fill("Ein sehr langer Artikeltitel, der auf keinen Fall in eine einzige Zeile passt, egal wie breit");
    await expect.poll(async () => (await title.boundingBox())!.height).toBeGreaterThan(oneLine * 1.5);
  });

  test("selection menu formats the selected text", async ({ page }) => {
    await openEditor(page);
    // Double-click selects a word on desktop and in the touch emulation alike
    await page.locator(".ProseMirror p").nth(1).getByText("Zweiter Absatz").dblclick({ position: { x: 10, y: 8 } });
    const menu = page.getByRole("toolbar", { name: "Auswahl formatieren" });
    await expect(menu).toBeVisible();
    await page.waitForTimeout(200); // the menu settles its position after appearing
    await menu.getByRole("button", { name: "Kursiv" }).click();
    await expect(page.locator(".ProseMirror p").nth(1).locator("em")).toHaveText("Zweiter");
  });

  test("a pasted image is uploaded, inserted and gets alt text", async ({ page }) => {
    await openEditor(page);
    await page.locator(".ProseMirror h2").click();
    await page.waitForTimeout(150); // ProseMirror picks up the click selection asynchronously
    await page.keyboard.press("End");
    // 1x1 PNG, pasted as a file (storage requests are answered by the mock)
    await page.evaluate(() => {
      const bin = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bin], "shot.png", { type: "image/png" }));
      document.querySelector(".ProseMirror")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    const img = page.locator(".ProseMirror img");
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute("src", /article-images/);

    await img.click();
    const alt = page.getByLabel("Alt-Text");
    await alt.fill("Hinako im Nebel");
    await alt.press("Enter");
    await expect(img).toHaveAttribute("alt", "Hinako im Nebel");
  });

  test("tables can be inserted and grown from the table menu", async ({ page }) => {
    await openEditor(page);
    await page.locator(".ProseMirror p").last().click();
    await page.waitForTimeout(150);
    await page.keyboard.press("End");
    await page.getByRole("button", { name: "Tabelle einfügen", exact: true }).first().click();
    await expect(page.locator(".ProseMirror table tr")).toHaveCount(3);
    // Scroll first: the menu follows the table one frame later, a click during that frame misses it
    await page.locator(".ProseMirror table").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.getByRole("toolbar", { name: "Tabelle" }).getByRole("button", { name: "Zeile darunter einfügen" }).click();
    await expect(page.locator(".ProseMirror table tr")).toHaveCount(4);
  });

  test("an invited co-author without press account can edit the article", async ({ page }) => {
    await openEditor(page, "collaborator");
    await expect(page.getByText("Kein Zugriff")).toHaveCount(0);
    await expect(page.getByLabel("Titel", { exact: true })).toHaveValue("Testartikel");
  });

  test("an admin hands the article to someone else from the team", async ({ page }) => {
    const OTHER = "33333333-4444-4555-8666-777777777777";
    await openEditor(page);
    const patches: Record<string, unknown>[] = [];
    const logs: Record<string, unknown>[] = [];
    // Registered later, so these answer before the general handler of openEditor
    await page.route(`${SUPABASE_URL}/rest/v1/user_roles**`, (route) =>
      new URL(route.request().url()).searchParams.get("role")?.startsWith("in.")
        ? reply(route, [{ user_id: USER_ID, role: "admin" }, { user_id: OTHER, role: "press" }])
        : route.fallback(),
    );
    await page.route(`${SUPABASE_URL}/rest/v1/profiles**`, (route) =>
      new URL(route.request().url()).searchParams.get("user_id")?.startsWith("in.")
        ? reply(route, [
            { user_id: USER_ID, display_name: "Test", username: "test", avatar_url: null },
            { user_id: OTHER, display_name: "Lena Vogt", username: "lenav", avatar_url: null },
          ])
        : route.fallback(),
    );
    await page.route(`${SUPABASE_URL}/rest/v1/articles**`, (route) => {
      if (route.request().method() === "PATCH") patches.push(route.request().postDataJSON());
      return route.fallback();
    });
    await page.route(`${SUPABASE_URL}/rest/v1/moderation_logs**`, (route) => {
      logs.push(route.request().postDataJSON());
      return reply(route, null, 201);
    });

    await page.getByRole("button", { name: "Einstellungen" }).first().click();
    await expect(page.getByText("Autor", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Autor ändern" }).click();
    const team = page.getByRole("list", { name: "Redaktionsteam" });
    await expect(team.getByRole("button", { name: /Test/ })).toBeDisabled();
    await team.getByRole("button", { name: /Lena Vogt/ }).click();

    // A draft is saved first, then handed over and left, since admins cannot open other people's drafts
    await expect(page).toHaveURL(/\/redaktion/);
    expect(patches.some((p) => typeof p.content === "string")).toBe(true);
    expect(patches.at(-1)).toEqual({ user_id: OTHER });
    expect(logs[0]).toMatchObject({ action: "change_author", target_id: ARTICLE_ID, reason: `${USER_ID} -> ${OTHER}` });
  });

  test("a paragraph becomes a note box that survives the preview", async ({ page }) => {
    await openEditor(page);
    await page.locator(".ProseMirror p").last().click();
    await page.waitForTimeout(150);
    await page.getByRole("button", { name: "Hinweis-Box", exact: true }).first().click();
    const note = page.locator(".ProseMirror aside.article-note");
    await expect(note).toContainText("Zweiter Absatz ohne Format.");
    // The label is CSS generated content in the reader's language
    expect(await note.evaluate((el) => getComputedStyle(el, "::before").content)).toBe('"Hinweis"');

    await page.getByRole("button", { name: "Vorschau" }).first().click();
    await expect(page.getByRole("dialog").locator("aside.article-note")).toContainText("Zweiter Absatz ohne Format.");
  });

  test("the quality check lists concrete issues and fixes one in place", async ({ page }) => {
    await openEditor(page);
    // Registered after openEditor, so it answers before the catch-all mock
    await page.route(`${SUPABASE_URL}/functions/v1/analyze-article`, (route) =>
      reply(route, {
        analysis: {
          score: "medium",
          summary: "Solide Grundlage mit einem Fehler.",
          strengths: ["Klare Gliederung"],
          dimensions: { correctness: 3, clarity: 4, structure: 4, substance: 3, voice: 4 },
          issues: [{ type: "grammar", severity: "high", quote: "Zweiter Absatz", fix: "Der zweite Absatz", suggestion: "Ein ganzer Satz liest sich besser." }],
          generic_phrasing: false,
          spelling_issues: 1,
          reasons: ["Ein ganzer Satz liest sich besser."],
          ai_detected: false,
        },
      }),
    );
    await page.getByRole("button", { name: "Text prüfen" }).first().click();
    await page.getByRole("button", { name: /Verbesserungswürdig/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Was du verbessern kannst (1)")).toBeVisible();
    await expect(dialog.getByText("Klare Gliederung")).toBeVisible();
    await dialog.getByRole("button", { name: "Übernehmen" }).click();
    await expect(dialog.getByRole("button", { name: "Übernommen" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(page.locator(".ProseMirror p").nth(1)).toHaveText("Der zweite Absatz ohne Format.");
  });

  test("undo right after opening keeps the loaded article", async ({ page }) => {
    await openEditor(page);
    await expect(page.getByRole("toolbar").getByRole("button", { name: "Rückgängig" }).first()).toBeDisabled();
    await page.locator(".ProseMirror p").last().click();
    await page.keyboard.press("Control+z");
    await expect(page.locator(".ProseMirror")).toContainText("Zweiter Absatz ohne Format.");
  });

  test("the spellcheck underlines errors and fixes them in place, bold included", async ({ page }) => {
    await openEditor(page);
    await page.route(`${SUPABASE_URL}/functions/v1/spellcheck`, (route) =>
      reply(route, {
        corrections: [
          // The context spans plain and bold text
          { context: "Satz mit fettem Text", original: "fettem", correction: "fetten", reason: "Testfehler" },
          { context: "Zweiter Absatz ohne", original: "Absatz", correction: "Abschnitt", reason: "Wortwahl" },
          // Not in the article: must not show up
          { context: "", original: "Nirgends", correction: "Überall", reason: "" },
        ],
      }),
    );
    await page.getByRole("button", { name: "Rechtschreibprüfung" }).click();
    await expect(page.locator(".ProseMirror .spell-error")).toHaveCount(2);
    const list = page.getByRole("dialog");
    await expect(list.getByText("2 Fehler gefunden")).toBeVisible();

    // From the list to the word; the menu at the word applies the correction
    await list.getByRole("button", { name: /fettem/ }).click();
    await page.getByRole("button", { name: "Durch „fetten“ ersetzen" }).click();
    await expect(page.locator(".ProseMirror strong")).toHaveText("fetten Text");
    await expect(page.locator(".ProseMirror .spell-error")).toHaveCount(1);

    await page.getByRole("button", { name: "1 Fehler gefunden" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Alle übernehmen" }).click();
    await expect(page.locator(".ProseMirror p").nth(1)).toHaveText("Zweiter Abschnitt ohne Format.");
    await expect(page.locator(".ProseMirror .spell-error")).toHaveCount(0);
  });

  test("the assistant rewrites a selected passage and keeps the paragraph", async ({ page }) => {
    await openEditor(page);
    let sent: Record<string, unknown> = {};
    await page.route(`${SUPABASE_URL}/functions/v1/ai-editor-assist`, (route) => {
      sent = route.request().postDataJSON();
      return reply(route, { output: 'Der <a href="https://example.com/quelle">Abschnitt</a>, <strong>neu</strong> formuliert.', lostLinks: 0 });
    });
    await page.locator(".ProseMirror p").last().click({ clickCount: 3 });
    await page.getByRole("button", { name: "KI-Assistent" }).click();
    const panel = page.locator("#editor-assistant");
    await expect(panel.getByText("4 Wörter markiert")).toBeVisible();
    await panel.getByRole("button", { name: /Umformulieren/ }).click();
    await expect(panel.getByText("4 → 4 Wörter")).toBeVisible();
    expect(sent).toMatchObject({ action: "rewrite", format: "html", articleType: "review", input: "Zweiter Absatz ohne Format." });
    // The passage stays marked while the focus is in the panel
    await expect(page.locator(".ProseMirror .ai-target")).toHaveText("Zweiter Absatz ohne Format.");

    await panel.getByRole("button", { name: "Markierte Stelle ersetzen" }).click();
    const paragraphs = page.locator(".ProseMirror > p");
    await expect(paragraphs).toHaveCount(2);
    await expect(paragraphs.last()).toHaveText("Der Abschnitt, neu formuliert.");
    await expect(paragraphs.last().locator("a")).toHaveAttribute("href", "https://example.com/quelle");
    await expect(page.locator(".ProseMirror .ai-target")).toHaveCount(0);
  });

  test("the assistant offers several headlines to pick from", async ({ page }) => {
    await openEditor(page);
    await page.route(`${SUPABASE_URL}/functions/v1/ai-editor-assist`, (route) =>
      reply(route, { options: ["Erster Vorschlag", "Zweiter Vorschlag", "Dritter Vorschlag"] }),
    );
    await page.getByRole("button", { name: "KI-Assistent" }).click();
    const panel = page.locator("#editor-assistant");
    // Passage actions need a selection
    await expect(panel.getByRole("button", { name: /Kürzen/ })).toBeDisabled();
    await panel.getByRole("button", { name: /Überschriften/ }).click();
    await panel.getByRole("button", { name: /Zweiter Vorschlag/ }).click();
    await expect(page.getByRole("textbox", { name: "Titel" })).toHaveValue("Zweiter Vorschlag");
  });

  test("the quality check applies all direct fixes at once", async ({ page }) => {
    await openEditor(page);
    await page.route(`${SUPABASE_URL}/functions/v1/analyze-article`, (route) =>
      reply(route, {
        analysis: {
          score: "medium",
          summary: "Zwei Kleinigkeiten.",
          issues: [
            { type: "grammar", severity: "medium", quote: "Ein Satz", fix: "Ein ganzer Satz", suggestion: "Genauer." },
            { type: "style", severity: "low", quote: "ohne Format", fix: "ganz ohne Format", suggestion: "Betonen." },
          ],
          reasons: [],
          ai_detected: false,
          spelling_issues: 0,
        },
      }),
    );
    await page.getByRole("button", { name: "Text prüfen" }).first().click();
    await page.getByRole("button", { name: /Verbesserungswürdig/ }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Alle Korrekturen übernehmen (2)" }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".ProseMirror p").first()).toContainText("Ein ganzer Satz mit");
    await expect(page.locator(".ProseMirror p").nth(1)).toHaveText("Zweiter Absatz ganz ohne Format.");
  });

  test("a YouTube video is embedded and only loads after a click", async ({ page }) => {
    const youtube: string[] = [];
    // Only YouTube's hosts; a plain /youtube/ would also catch the app's own youtube.ts module
    await page.route(/^https:\/\/([a-z0-9-]+\.)*(youtube(-nocookie)?\.com|ytimg\.com|googlevideo\.com|youtu\.be)\//, (route) => {
      youtube.push(route.request().url());
      return route.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" });
    });
    await openEditor(page);
    let saved = "";
    await page.route(`${SUPABASE_URL}/rest/v1/articles**`, (route) => {
      if (route.request().method() === "PATCH") saved = route.request().postDataJSON().content;
      return route.fallback();
    });

    await page.locator(".ProseMirror p").last().click();
    await page.getByRole("button", { name: "YouTube-Video", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Link zum Video").fill("vimeo.com/123");
    await dialog.getByRole("button", { name: "Einbinden" }).click();
    await expect(dialog.getByText("Das ist kein gültiger YouTube-Link.")).toBeVisible();
    await dialog.getByLabel("Link zum Video").fill("https://youtu.be/dQw4w9WgXcQ?t=90");
    await expect(dialog.getByText("Video erkannt, Start bei 1:30.")).toBeVisible();
    await dialog.getByRole("button", { name: "Einbinden" }).click();

    await expect(page.locator(".ProseMirror .video-embed")).toHaveCount(1);
    // Preview picture and title come through criticore.cc, not from YouTube
    await expect(page.locator(".ProseMirror [data-testid=video-title]").first()).toHaveText("Never Gonna Give You Up");
    await expect(page.locator(".ProseMirror [data-testid=video-poster]").first()).toHaveAttribute("src", "/media/yt/dQw4w9WgXcQ.jpg");
    // Pasting a link on an empty line embeds it as well
    await page.locator(".ProseMirror p").last().click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.locator(".ProseMirror").evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "https://www.youtube.com/shorts/aBcDeFgHiJk");
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await expect(page.locator(".ProseMirror .video-embed")).toHaveCount(2);

    // Stored as a placeholder with the id, never as an iframe
    await page.getByRole("button", { name: "Entwurf speichern" }).click();
    await expect.poll(() => saved).toContain('data-youtube-id="dQw4w9WgXcQ"');
    expect(saved).toContain('data-start="90"');
    expect(saved).toContain('data-title="Never Gonna Give You Up" data-author="Rick Astley"');
    expect(saved).not.toContain("<iframe");

    // Reader view: nothing is loaded from YouTube before the click
    await page.getByRole("button", { name: "Vorschau" }).first().click();
    const preview = page.getByRole("dialog");
    await expect(preview.getByRole("button", { name: "YouTube-Video" })).toHaveCount(2);
    await expect(preview.getByTestId("video-poster").first()).toHaveAttribute("src", "/media/yt/dQw4w9WgXcQ.jpg");
    await expect(preview.getByTestId("video-title").first()).toHaveText("Never Gonna Give You Up");
    expect(youtube).toEqual([]);
    await preview.getByRole("button", { name: "YouTube-Video" }).first().click();
    await expect(preview.locator("iframe")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&start=90");
  });

  test("an image can be sized, floated, resized by its handle and credited", async ({ page }) => {
    await openEditor(page, "admin", '<p>Davor ein Absatz mit etwas Text, der neben dem Bild stehen kann.</p><img src="https://images.test/wide.svg" alt="Hyrule"><p>Danach.</p>');
    let saved = "";
    await page.route(`${SUPABASE_URL}/rest/v1/articles**`, (route) => {
      if (route.request().method() === "PATCH") saved = route.request().postDataJSON().content;
      return route.fallback();
    });
    const figure = page.locator(".ProseMirror figure.article-image");
    await figure.locator("img").click();
    const menu = page.getByTestId("image-menu");
    await menu.getByRole("button", { name: "Breite 50 %" }).click();
    await expect(figure).toHaveAttribute("style", /width: 50%/);
    await menu.getByRole("button", { name: "Links, Text fließt herum" }).click();
    await expect(figure).toHaveAttribute("data-align", "left");

    // Dragging the right handle of a left float makes it narrower (a third of it, phones included)
    const before = (await figure.boundingBox())!.width;
    const handle = figure.getByTestId("image-resize-right");
    const box = (await handle.boundingBox())!;
    const dx = Math.round(before / 3);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - dx, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await figure.boundingBox())!.width).toBeLessThan(before - dx / 2);

    // Caption and credit right under the picture, the credit link in the menu. The click goes to
    // the lower middle: on a phone the narrowed picture is mostly covered by its move handle.
    const clickPicture = async () => {
      const img = figure.locator("img");
      const b = (await img.boundingBox())!;
      await img.click({ position: { x: b.width / 2, y: b.height - 4 } });
    };
    await clickPicture();
    await figure.getByLabel("Bildunterschrift").fill("Das neue Hyrule");
    await figure.getByLabel("Bildquelle").fill("Nintendo");
    await figure.getByLabel("Bildquelle").press("Enter");
    await clickPicture();
    await menu.getByLabel("Link zur Quelle").fill("nintendo.com/presse");
    await menu.getByLabel("Link zur Quelle").press("Enter");

    await page.getByRole("button", { name: "Entwurf speichern" }).click();
    await expect.poll(() => saved).toContain('data-align="left"');
    expect(saved).toMatch(/<figure class="article-image" data-align="left" data-ratio="[\d.]+" style="width: \d+(\.\d)?%;">|<figure class="article-image" data-align="left" style="width: \d+(\.\d)?%;">/);
    expect(saved).toContain('<span class="image-caption">Das neue Hyrule</span>');
    expect(saved).toContain('<span class="image-credit"><a href="https://nintendo.com/presse" target="_blank" rel="noopener noreferrer nofollow">Nintendo</a></span>');

    // The reader sees "Quelle:" in front of the credit
    await page.getByRole("button", { name: "Vorschau" }).first().click();
    const credit = page.getByRole("dialog").locator(".image-credit");
    await expect(credit).toHaveText("Nintendo");
    expect(await credit.evaluate((el) => getComputedStyle(el, "::before").content)).toBe('"Quelle: "');
  });

  test("images go side by side at the same height, and back below each other", async ({ page }) => {
    await openEditor(page, "admin", '<p>Text</p><img src="https://images.test/wide.svg"><img src="https://images.test/tall.svg"><p>Mehr Text</p>');
    const images = page.locator(".ProseMirror figure.article-image");
    await images.first().locator("img").click();
    const menu = page.getByTestId("image-menu");
    await menu.getByRole("button", { name: "Mit dem Nachbarbild nebeneinander" }).click();
    const row = page.locator(".ProseMirror .image-row");
    await expect(row.locator("figure.article-image")).toHaveCount(2);
    // 16:9 next to 4:5: widths follow the ratios, so the pictures end up equally tall
    await expect
      .poll(async () => {
        const [a, b] = await row.locator("img").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
        return Math.abs(a - b);
      })
      .toBeLessThan(6);

    // Swap inside the row, then split it up again
    await menu.getByRole("button", { name: "Nach rechts" }).click();
    await expect(row.locator("img").first()).toHaveAttribute("src", "https://images.test/tall.svg");
    await menu.getByRole("button", { name: "Bilder wieder untereinander" }).click();
    await expect(page.locator(".ProseMirror .image-row")).toHaveCount(0);
    await expect(images).toHaveCount(2);
  });

  test("an image moves up and down from its menu", async ({ page }) => {
    await openEditor(page, "admin", '<p>Erster</p><p>Zweiter</p><img src="https://images.test/wide.svg"><p>Dritter</p>');
    await page.locator(".ProseMirror figure.article-image img").click();
    await page.getByTestId("image-menu").getByRole("button", { name: "Nach oben verschieben" }).click();
    // The empty paragraph StarterKit keeps after a final image does not count
    const order = () =>
      page.locator(".ProseMirror > *").evaluateAll((els) => els.map((e) => (e.tagName === "FIGURE" ? "IMG" : e.textContent)).filter(Boolean));
    await expect.poll(order).toEqual(["Erster", "IMG", "Zweiter", "Dritter"]);
    await page.getByTestId("image-menu").getByRole("button", { name: "Nach unten verschieben" }).click();
    await page.getByTestId("image-menu").getByRole("button", { name: "Nach unten verschieben" }).click();
    await expect.poll(order).toEqual(["Erster", "Zweiter", "Dritter", "IMG"]);
  });

  test("the cover gets a credit with a link, shown under it", async ({ page }) => {
    await openEditor(page, "admin", undefined, { cover_image_url: "https://images.test/wide.svg", cover_image_credit: null, cover_image_credit_url: null });
    let body: Record<string, unknown> = {};
    await page.route(`${SUPABASE_URL}/rest/v1/articles**`, (route) => {
      if (route.request().method() === "PATCH") body = route.request().postDataJSON();
      return route.fallback();
    });
    const fields = page.getByTestId("cover-credit");
    await expect(fields.getByText("Gib an, von wem das Bild ist.")).toBeVisible();
    await fields.getByLabel("Bildquelle des Titelbilds").fill("Nintendo");
    await fields.getByLabel("Link zur Quelle (optional)").fill("javascript:alert(1)");
    await expect(fields.getByText("Bitte einen gültigen Link angeben, z. B. https://…")).toBeVisible();
    await fields.getByLabel("Link zur Quelle (optional)").fill("nintendo.com");

    await page.getByRole("button", { name: "Entwurf speichern" }).click();
    await expect.poll(() => body.cover_image_credit).toBe("Nintendo");
    expect(body.cover_image_credit_url).toBe("https://nintendo.com/");

    await page.getByRole("button", { name: "Vorschau" }).first().click();
    await expect(page.getByRole("dialog").getByTestId("cover-credit-line")).toHaveText("Quelle: Nintendo");
    await expect(page.getByRole("dialog").getByTestId("cover-credit-line").getByRole("link")).toHaveAttribute("href", "https://nintendo.com/");
  });

  test("saving works before the cover credit columns exist", async ({ page }) => {
    // ARTICLE has no cover_image_credit column, as before migration 20261009120000
    await openEditor(page);
    let body: Record<string, unknown> | null = null;
    await page.route(`${SUPABASE_URL}/rest/v1/articles**`, (route) => {
      if (route.request().method() === "PATCH") body = route.request().postDataJSON();
      return route.fallback();
    });
    await page.locator(".ProseMirror p").last().click();
    await page.keyboard.type(" Noch ein Satz.");
    await page.getByRole("button", { name: "Entwurf speichern" }).click();
    await expect.poll(() => body).not.toBeNull();
    expect(Object.keys(body!)).not.toContain("cover_image_credit");
  });

  test("an empty article starts from a template of its type", async ({ page }) => {
    await openEditor(page, "admin", "");
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await expect(page.locator(".ProseMirror h2")).toHaveText(["Worum es geht", "Was überzeugt", "Was nicht funktioniert", "Fazit"]);
    // The picker is gone once there is text
    await page.keyboard.type("Der Einstieg.");
    await expect(page.getByText("Mit Vorlage starten:")).toHaveCount(0);
  });

  test("the readability check marks long sentences and filler words", async ({ page }) => {
    const long =
      "Das neue Spiel bietet eine riesige offene Welt mit vielen Nebenaufgaben, die man in seinem eigenen Tempo erkunden kann, während die Hauptgeschichte sich langsam entfaltet und dabei immer wieder überraschende Wendungen nimmt.";
    await openEditor(page, "admin", `<p>Das ist eigentlich gut. ${long}</p>`);
    await page.getByRole("button", { name: "Lesbarkeit" }).click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByText("1 langer Satz")).toBeVisible();
    await expect(panel.getByRole("button", { name: "eigentlich" })).toBeVisible();
    await expect(page.locator(".ProseMirror .readability-long")).toHaveCount(1);
    await expect(page.locator(".ProseMirror .readability-filler")).toHaveText("eigentlich");
    await panel.getByRole("button", { name: "Markierungen ausblenden" }).click();
    await expect(page.locator(".ProseMirror .readability-long")).toHaveCount(0);
  });

  test("saving keeps the workflow status: a written draft is no idea any more", async ({ page }) => {
    await openEditor(page);
    const saves: Record<string, unknown>[] = [];
    await page.route(`${SUPABASE_URL}/rest/v1/articles**`, (route) => {
      if (route.request().method() === "PATCH") saves.push(route.request().postDataJSON());
      return route.fallback();
    });
    await page.getByRole("button", { name: "Entwurf speichern" }).click();
    await expect.poll(() => saves.length).toBe(1);
    expect(saves[0].status).toBe("idea");

    await page.locator(".ProseMirror p").last().click();
    await page.keyboard.press("End");
    // insertText: typing 45 words one key at a time is too slow on the phone emulation
    await page.keyboard.insertText(" " + Array.from({ length: 45 }, (_, i) => `wort${i}`).join(" "));
    await page.getByRole("button", { name: "Entwurf speichern" }).click();
    await expect.poll(() => saves.length).toBe(2);
    expect(saves[1].status).toBe("writing");
  });

  test("Ctrl+/ opens the shortcut overview", async ({ page }) => {
    await openEditor(page);
    await page.keyboard.press("Control+/");
    await expect(page.getByRole("dialog", { name: "Tastenkürzel" })).toBeVisible();
  });

  test("action bar items do not overlap on narrow screens", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.match(/iphone|android/), "phone layout only");
    await openEditor(page);
    const bar = page.locator("div.fixed.top-16");
    const badge = await bar.getByText("Entwurf", { exact: true }).boundingBox();
    const tools = await bar.locator("div.overflow-x-auto").boundingBox();
    expect(badge, "status badge is visible").not.toBeNull();
    expect(badge!.x + badge!.width).toBeLessThanOrEqual(tools!.x + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});
