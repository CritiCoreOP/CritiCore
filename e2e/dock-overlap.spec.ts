import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * UI regression tests for the bottom navigation dock.
 *
 * The dock is `position: fixed` at the bottom of the viewport. These tests
 * guarantee it never visually overlaps the top navbar or the page footer,
 * across phone / desktop breakpoints, both navigation modes, and at the top
 * and bottom of the page.
 */

const NAV_STYLE_KEY = "criticore-nav-style";
// Content page that renders dock + footer and has a fixed end. Not /games: it loads more
// items whenever the bottom is reached, so the footer keeps moving and "bottom" never settles.
const START_PATH = "/de-DE/news";

type Box = { x: number; y: number; width: number; height: number };

/** Returns the bounding box of a locator only when it is actually rendered & visible. */
async function visibleBox(locator: Locator): Promise<Box | null> {
  if ((await locator.count()) === 0) return null;
  if (!(await locator.first().isVisible())) return null;
  return await locator.first().boundingBox();
}

/** True when two rectangles intersect (with a 1px tolerance for shared edges). */
function overlaps(a: Box, b: Box, tolerance = 1): boolean {
  return (
    a.x < b.x + b.width - tolerance &&
    a.x + a.width > b.x + tolerance &&
    a.y < b.y + b.height - tolerance &&
    a.y + a.height > b.y + tolerance
  );
}

async function setNavMode(page: Page, mode: "navbar" | "dock") {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [NAV_STYLE_KEY, mode] as const,
  );
}

/** Keeps the viewport at the real document end while asynchronous cards finish laying out. */
async function scrollToStableBottom(page: Page) {
  let previousHeight = 0;

  // html has scroll-behavior: smooth, so scroll instantly or the check runs mid-animation
  const toBottom = () =>
    page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" as ScrollBehavior }),
    );

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await toBottom();
    await page.waitForTimeout(400);

    const settledHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    if (height === previousHeight && settledHeight === height) return;
    previousHeight = settledHeight;
  }

  await toBottom();
}

async function assertNoDockOverlap(page: Page, label: string) {
  const dock = page.getByTestId("mobile-dock");
  const dockBox = await visibleBox(dock);

  // The dock is not shown in every configuration (e.g. desktop + navbar mode).
  // When it is hidden there is nothing to assert for this configuration.
  if (!dockBox) {
    test.info().annotations.push({ type: "skip-reason", description: `${label}: dock not visible` });
    return;
  }

  const navbarBox = await visibleBox(page.getByTestId("main-navbar"));
  const footerBox = await visibleBox(page.getByTestId("site-footer"));

  if (navbarBox) {
    expect(
      overlaps(dockBox, navbarBox),
      `${label}: dock must not overlap the navbar`,
    ).toBe(false);
  }
  if (footerBox) {
    expect(
      overlaps(dockBox, footerBox),
      `${label}: dock must not overlap the footer`,
    ).toBe(false);
  }
}

for (const mode of ["navbar", "dock"] as const) {
  test(`dock never overlaps navbar or footer (nav mode: ${mode})`, async ({ page }) => {
    await setNavMode(page, mode);
    await page.goto(START_PATH, { waitUntil: "networkidle" });

    // Give lazy content / images time to lay out.
    await page.waitForTimeout(1500);

    // 1. At the top of the page.
    await assertNoDockOverlap(page, `${mode} · top`);

    // 2. Scrolled to the very bottom, where the footer meets the dock.
    await scrollToStableBottom(page);
    await assertNoDockOverlap(page, `${mode} · bottom`);
  });
}

test("page reserves enough bottom space so the footer clears the dock (dock mode)", async ({ page }) => {
  await setNavMode(page, "dock");
  await page.goto(START_PATH, { waitUntil: "networkidle" });

  // In dock mode the dock is shown on every breakpoint; wait for it explicitly.
  const dock = page.getByTestId("mobile-dock");
  await dock.waitFor({ state: "visible", timeout: 10_000 });
  const dockBox = await dock.boundingBox();
  expect(dockBox, "visible dock must have a bounding box").not.toBeNull();
  if (!dockBox) return;


  // Height occupied by the fixed dock, measured from the bottom of the viewport.
  const viewport = page.viewportSize();
  expect(viewport, "page must have a viewport").not.toBeNull();
  if (!viewport) return;
  const dockOccupiedHeight = viewport.height - dockBox.y;

  // The page container must reserve at least the dock's height as bottom padding so
  // that scrolled-to-bottom content (the footer) is never trapped behind it.
  const containerPaddingBottom = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.getElementById("main-content")!).paddingBottom),
  );

  expect(
    containerPaddingBottom,
    "#main-content must reserve at least the dock height as bottom padding",
  ).toBeGreaterThanOrEqual(dockOccupiedHeight);
});


