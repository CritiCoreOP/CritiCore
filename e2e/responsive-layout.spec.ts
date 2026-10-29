import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "small phone", width: 320, height: 568 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "tablet landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide desktop", width: 1920, height: 1080 },
] as const;

const PUBLIC_ROUTES = ["/de-DE", "/de-DE/entdecken", "/de-DE/news", "/de-DE/einstellungen"];

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of PUBLIC_ROUTES) {
      test(`${route} stays inside the viewport`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);

        const metrics = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          pageWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
        }));

        expect(metrics.pageWidth, `document overflow on ${route}`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
        expect(metrics.bodyWidth, `body overflow on ${route}`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      });
    }
  });
}