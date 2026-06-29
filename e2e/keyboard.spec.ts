import { expect, test } from "@playwright/test";

/**
 * Keyboard-only operability for the at-risk persona (WCAG 2.1.1 operable, 2.4.1 bypass blocks,
 * 2.4.3 focus order). Complements the axe sweep, which can't drive real keyboard interaction.
 */

test("skip link: Tab reveals it, Enter moves focus past the nav into main", async ({ page }) => {
  await page.goto("/dashboard");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /skip to main content/i });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("onboarding consent is fully keyboard-operable and stays gated until consent", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /Get started/ }).focus();
  await page.keyboard.press("Enter"); // welcome → consent, via the keyboard
  const consents = page.getByRole("checkbox");
  await expect(consents.first()).toBeVisible();
  const proceed = page.getByRole("button", { name: /I consent.*continue/i });
  await expect(proceed).toBeDisabled();
  const n = await consents.count();
  for (let i = 0; i < n; i++) {
    await consents.nth(i).focus();
    await page.keyboard.press("Space"); // toggle the focused checkbox with the keyboard
  }
  await expect(proceed).toBeEnabled();
});

test("decoy opt-in dialog opens and is keyboard-dismissable with Escape", async ({ page }) => {
  await page.goto("/defend/location");
  // The decoy option is opt-in (off by default) — selecting it opens the one-time opt-in dialog.
  await page.getByRole("radio", { name: /Decoy/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Turn on decoy mode/i })).toBeVisible();
  // A modal must be dismissable from the keyboard (Escape) — base-ui traps focus + handles this.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("dashboard primary action is reachable by keyboard alone", async ({ page }) => {
  await page.goto("/dashboard");
  const link = page.getByRole("link", { name: /Open Current location detail/ });
  for (let i = 0; i < 40; i++) {
    if (await link.evaluate((el) => el === document.activeElement).catch(() => false)) break;
    await page.keyboard.press("Tab");
  }
  await expect(link).toBeFocused();
});
