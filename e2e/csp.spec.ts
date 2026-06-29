import { expect, test } from "@playwright/test";

/**
 * Guards the enforcing strict CSP (proxy.ts). Navigates each screen in a real browser and
 * asserts the browser reports ZERO Content-Security-Policy violations — i.e. the nonce +
 * strict-dynamic policy doesn't block any legitimate script/style/connection/frame. This is
 * what lets us enforce (not just report-only) with confidence, and keeps it enforced.
 *
 * Note: in dev Clerk adds `'unsafe-eval'` to script-src (React HMR), so this catches real
 * blocked-resource violations without false positives from dev-only eval.
 */
const ROUTES = [
  "/",
  "/onboarding",
  "/connect",
  "/account",
  "/trust",
  "/dashboard",
  "/attribute/location",
  "/defend/location",
];

const CSP_VIOLATION = /Content Security Policy|Refused to (load|execute|apply|connect|frame)/i;

for (const route of ROUTES) {
  test(`no CSP violations: ${route}`, async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (CSP_VIOLATION.test(text)) violations.push(text);
    });
    page.on("pageerror", (err) => {
      if (CSP_VIOLATION.test(err.message)) violations.push(err.message);
    });

    await page.goto(route);
    await page.waitForLoadState("networkidle");

    expect(violations, violations.join("\n---\n")).toEqual([]);
  });
}
