import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("landing page renders and passes WCAG-AA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Glasshouse/);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("/docs renders the API reference from the vendored spec (not a blank shell)", async ({
    page,
  }) => {
    await page.goto("/docs");
    // Scalar is client-rendered by the CDN bundle — under strict CSP a nonce failure would
    // leave a blank shell, so assert real spec content appears (complements e2e/csp.spec.ts).
    await expect(page.getByRole("heading", { name: "Glasshouse", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    // Spec content from the vendored openapi.json: an operation heading + a sidebar tag group.
    await expect(page.getByRole("heading", { name: "Erase Account" }).first()).toBeVisible();
    await expect(page.getByText("inferences", { exact: true }).first()).toBeVisible();
  });
});
