import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * These tests run against the Vite dev server on port 8080. In the sandbox the
 * server is already running, so `reuseExistingServer` is enabled. Locally/CI it
 * will be started automatically.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "iphone",
      use: { ...devices["iPhone 12"] },
    },
    {
      name: "android",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
