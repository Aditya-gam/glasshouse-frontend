import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E (M5.6). Few, high-value journeys + a real-browser WCAG-AA scan (catches
 * color-contrast jsdom can't). Runs against a local dev server by default; set `E2E_BASE_URL`
 * to point at a deployed preview instead. Backend-dependent assertions are `test.skip`-gated
 * until the backend is deployed — the fixture-backed UI journeys run today.
 */
const usePreview = !!process.env.E2E_BASE_URL;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: usePreview
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
