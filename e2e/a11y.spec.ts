import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Real-browser WCAG-AA scan of every screen and its honest-state variants. Unlike the
 * jsdom vitest-axe checks, this runs color-contrast (which needs a real canvas) — so it's
 * the automated guard for the M5.7 contrast work across light + dark.
 */
const ROUTES = [
  "/",
  "/onboarding",
  "/connect",
  "/account",
  "/trust",
  "/trust?state=empty",
  "/trust?state=error",
  "/dashboard",
  "/dashboard?state=empty",
  "/dashboard?state=error",
  "/dashboard?state=abstained",
  "/attribute/location",
  "/attribute/location?state=error",
  "/defend/location",
  "/defend/location?state=unproven",
  "/defend/location?state=error",
];

async function scan(page: import("@playwright/test").Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  if (results.violations.length) {
    // Literal first arg (route passed separately) — concise failure diagnostics.
    console.log(
      "a11y violations:",
      route,
      JSON.stringify(results.violations.map((v) => ({ id: v.id, target: v.nodes[0]?.target }))),
    );
  }
  return results;
}

for (const route of ROUTES) {
  test(`a11y (light): ${route}`, async ({ page }) => {
    const results = await scan(page, route);
    expect(results.violations).toEqual([]);
  });

  test(`a11y (dark): ${route}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const results = await scan(page, route);
    expect(results.violations).toEqual([]);
  });
}
