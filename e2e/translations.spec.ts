import { test, expect, Page } from "@playwright/test";

/**
 * E2E translation coverage.
 *
 * For every supported locale we visit a representative set of routes and
 * assert that:
 *   1. The page renders (no hard crash)
 *   2. No raw i18n keys leak into the DOM (e.g. "nav.anime", "details.backToAnime")
 *
 * A "raw key" is heuristically detected as a dotted lowercase identifier
 * appearing as visible text — real translated copy never matches that shape.
 */

const LOCALES = ["de-DE", "en-US", "fr-FR", "es-ES", "th-TH"] as const;

// Routes are locale-prefixed. Slugs differ per language for some sections,
// but the top-level nav routes we test here share the same slug across langs.
const ROUTES = ["/", "/anime", "/news"];

// Matches things like "nav.anime", "details.backToAnime", "auth.signIn.title"
// but not normal sentences, URLs, filenames, version numbers, etc.
const RAW_KEY_RE = /\b[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*){1,4}\b/;

// Known non-key dotted tokens that may appear in the DOM legitimately.
const ALLOWLIST = [
  /criticore\.(cc|tgn\.news)/i,
  /lovable\.app/i,
  /\.(png|jpg|jpeg|webp|svg|gif)/i,
  /www\./i,
];

function looksLikeRawKey(text: string): string | null {
  const m = text.match(RAW_KEY_RE);
  if (!m) return null;
  const hit = m[0];
  if (ALLOWLIST.some((re) => re.test(hit))) return null;
  return hit;
}

async function collectVisibleText(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const t = (n.nodeValue || "").trim();
      if (t) out.push(t);
    }
    return out;
  });
}

for (const locale of LOCALES) {
  test.describe(`i18n · ${locale}`, () => {
    for (const route of ROUTES) {
      test(`no raw i18n keys on ${route}`, async ({ page }) => {
        const url = `/${locale}${route === "/" ? "" : route}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });
        // Give React a moment to hydrate translations.
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(500);

        const texts = await collectVisibleText(page);
        const offenders: string[] = [];
        for (const t of texts) {
          const hit = looksLikeRawKey(t);
          if (hit) offenders.push(`"${t}" (matched ${hit})`);
        }

        expect(
          offenders,
          `Raw i18n keys visible on ${url}:\n${offenders.slice(0, 10).join("\n")}`,
        ).toEqual([]);
      });
    }

    test("nav labels are localized (no dotted keys in top nav)", async ({ page }) => {
      await page.goto(`/${locale}/`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);

      const navText = await page.locator("nav, header").first().innerText().catch(() => "");
      const hit = looksLikeRawKey(navText);
      expect(hit, `Nav contains raw key "${hit}" on ${locale}`).toBeNull();
    });
  });
}
