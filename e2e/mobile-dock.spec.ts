import { test, expect, type Page } from "@playwright/test";

/**
 * Behaviour of the bottom navigation dock: visible labels, one active indicator
 * that follows the current page, and the menu sheet (dialog, Escape to close).
 * Dock mode is forced so the dock is shown on every project, desktop included.
 */

const NAV_STYLE_KEY = "criticore-nav-style";

async function openInDockMode(page: Page, path: string) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [NAV_STYLE_KEY, "dock"] as const,
  );
  await page.goto(path, { waitUntil: "networkidle" });
  await page.getByTestId("mobile-dock").waitFor({ state: "visible", timeout: 10_000 });
}

/** Horizontal distance between the indicator pill and the icon of the active item (null = nothing active). */
function indicatorOffset(page: Page) {
  return page.evaluate(() => {
    const dock = document.querySelector('[data-testid="mobile-dock"]');
    const icon = dock?.querySelector('[aria-current="page"] .dock-icon');
    const pill = dock?.querySelector(".dock-indicator-pill");
    if (!icon || !pill) return null;
    const a = icon.getBoundingClientRect();
    const b = pill.getBoundingClientRect();
    return Math.abs(a.left + a.width / 2 - (b.left + b.width / 2));
  });
}

for (const width of [320, 375, 430]) {
  test(`at ${width}px the five items are equally wide, one line each and never overlap`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openInDockMode(page, "/de-DE/filme");
    const dock = page.getByTestId("mobile-dock");
    const labels = dock.locator(".dock-label");

    await expect(dock.locator(".dock-item")).toHaveCount(5);
    for (let i = 0; i < 5; i += 1) {
      await expect(labels.nth(i)).toBeVisible();
      expect((await labels.nth(i).innerText()).trim().length, `label ${i} is empty`).toBeGreaterThan(0);
    }

    const layout = await dock.evaluate((el) => {
      const items = [...el.querySelectorAll<HTMLElement>(".dock-item")].map((i) => i.getBoundingClientRect());
      const labelEls = [...el.querySelectorAll<HTMLElement>(".dock-label")];
      const rects = labelEls.map((l) => l.getBoundingClientRect());
      let gap = Infinity;
      for (let i = 1; i < rects.length; i += 1) gap = Math.min(gap, rects[i].left - rects[i - 1].right);
      return {
        widthSpread: Math.max(...items.map((r) => r.width)) - Math.min(...items.map((r) => r.width)),
        smallestTarget: Math.min(...items.map((r) => Math.min(r.width, r.height))),
        lineHeights: [...new Set(rects.map((r) => Math.round(r.height)))],
        truncated: labelEls.filter((l) => l.scrollWidth > l.clientWidth).length,
        gap,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(layout.widthSpread, "items must be equally wide").toBeLessThanOrEqual(0.5);
    expect(layout.smallestTarget, "touch targets must be at least 44px").toBeGreaterThanOrEqual(44);
    expect(layout.lineHeights, "labels stay on one line").toEqual([14]);
    expect(layout.truncated, "German labels fit without an ellipsis").toBe(0);
    expect(layout.gap, "neighbouring labels must not overlap").toBeGreaterThanOrEqual(0);
    expect(layout.pageOverflow, "the page must not scroll sideways").toBe(false);
  });
}

test("the active page is marked once and the indicator sits behind it", async ({ page }) => {
  await openInDockMode(page, "/de-DE/serien");
  const dock = page.getByTestId("mobile-dock");

  await expect(dock.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(dock.locator('[aria-current="page"]')).toContainText("Serien");
  await expect.poll(() => indicatorOffset(page)).toBeLessThanOrEqual(2);
});

test("pages that live in the menu mark the menu item", async ({ page }) => {
  await openInDockMode(page, "/de-DE/anime");
  const dock = page.getByTestId("mobile-dock");
  const menuButton = dock.locator("button.dock-item");

  await expect(dock.locator('[aria-current="page"]')).toHaveCount(0);
  await expect(menuButton).toHaveClass(/is-active/);
  await expect(dock.locator(".dock-indicator")).toHaveCSS("opacity", "1");

  await menuButton.click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Anime" })).toHaveAttribute("aria-current", "page");
});

test("the indicator follows the user to another section", async ({ page }) => {
  await openInDockMode(page, "/de-DE/news");
  const dock = page.getByTestId("mobile-dock");

  await dock.getByRole("link", { name: "Filme" }).click();
  await expect(page).toHaveURL(/\/de-DE\/filme/);
  await expect(dock.locator('[aria-current="page"]')).toContainText("Filme");
  // The pill slides with a 320ms transition, poll until it has arrived
  await expect.poll(() => indicatorOffset(page)).toBeLessThanOrEqual(2);
});

test("pages without a dock entry highlight nothing", async ({ page }) => {
  await openInDockMode(page, "/de-DE/");
  const dock = page.getByTestId("mobile-dock");

  await expect(dock.locator('[aria-current="page"]')).toHaveCount(0);
  await expect(dock.locator(".dock-indicator")).toHaveCSS("opacity", "0");
});

test("the menu opens as a dialog and closes with Escape", async ({ page }) => {
  await openInDockMode(page, "/de-DE/news");
  const menuButton = page.getByTestId("mobile-dock").locator("button.dock-item");

  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  // News leads the dock; Anime and Explore live in the sheet
  await expect(sheet.getByRole("link", { name: "Anime" })).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Entdecken" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("the dock follows the sections chosen in the settings", async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem("criticore-layout", JSON.stringify({ dock: ["anime", "news", "entdecken"] })),
  );
  await openInDockMode(page, "/de-DE/games");
  const dock = page.getByTestId("mobile-dock");

  await expect(dock.locator(".dock-label")).toHaveText(["Anime", "News", "Entdecken", "Menü"]);
  // Games left the dock, so its page marks the menu and the sheet carries the link
  await expect(dock.locator("button.dock-item")).toHaveClass(/is-active/);
  await dock.locator("button.dock-item").click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Games" })).toHaveAttribute("aria-current", "page");
});
