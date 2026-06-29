import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("landing page renders and passes WCAG-AA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Glasshouse/);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
