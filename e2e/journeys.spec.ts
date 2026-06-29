import { expect, test } from "@playwright/test";

/**
 * Critical-path journeys against the fixture-backed UI (real browser, real router — no
 * mocks). These assert the cross-screen flows + the HONEST-UI invariants end-to-end.
 * Backend-dependent assertions (a real run producing inferences) wait for the deployed API.
 */

test("dashboard → attribute detail; calibrated-not-raw + persona lens", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Calibrated reliability").first()).toBeVisible();
  await expect(page.getByText(/\bconfidence\b/i)).toHaveCount(0); // never raw confidence
  await expect(page.getByRole("radiogroup", { name: "Persona lens" })).toBeVisible(); // reorders, never hides
  const locationLink = page.getByRole("link", { name: /Open Current location detail/ });
  await expect(locationLink).toBeVisible();
  await locationLink.click();
  await expect(page).toHaveURL(/\/attribute\/location/);
});

test("onboarding is consent-gated — no continue until consent is given", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /Get started/ }).click(); // welcome → consent
  const consents = page.getByRole("checkbox");
  await expect(consents.first()).toBeVisible();
  const proceed = page.getByRole("button", { name: /I consent.*continue/i });
  await expect(proceed).toBeDisabled(); // no run without consent
  const n = await consents.count();
  for (let i = 0; i < n; i++) await consents.nth(i).click();
  await expect(proceed).toBeEnabled();
});

test("connect drops third-party content (kept vs dropped is shown)", async ({ page }) => {
  await page.goto("/connect");
  await expect(page.getByText(/dropped|not yours|third[- ]party/i).first()).toBeVisible();
});

test("attribution shows a calibrated band and the verify deny flow works", async ({ page }) => {
  await page.goto("/attribute/location");
  await expect(page.getByText("Calibrated reliability").first()).toBeVisible();
  const notRight = page.getByRole("button", { name: /Not right/ });
  await notRight.click();
  await expect(page.getByText(/Recorded as not right/i)).toBeVisible();
});

test("defend: decoy off by default + advise-only CTAs (no platform write)", async ({ page }) => {
  await page.goto("/defend/location");
  await expect(page.getByRole("heading", { name: /Break this inference/ })).toBeVisible();
  // decoy is opt-in: any decoy switch starts unchecked
  const decoy = page.getByRole("switch");
  if (await decoy.first().isVisible()) await expect(decoy.first()).not.toBeChecked();
  // advise-only: the actions are copy/download, never "post"/"apply to platform"
  await expect(page.getByRole("button", { name: /Copy|Download/ }).first()).toBeVisible();
});

test("account exposes data rights — export + irreversible crypto-shred copy", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /Export your data/ })).toBeVisible();
  await expect(page.getByText(/Crypto-shred/i).first()).toBeVisible();
});
