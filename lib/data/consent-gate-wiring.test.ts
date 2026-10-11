// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Tripwire: page files are excluded from unit coverage (async Server Components), so
 * nothing else fails if someone deletes a gate call. Every (app) screen except the
 * onboarding surface itself must await the consent gate (write-paths F1).
 */
const GATED_PAGES = [
  "app/(app)/dashboard/page.tsx",
  "app/(app)/connect/page.tsx",
  "app/(app)/account/page.tsx",
  "app/(app)/attribute/[code]/page.tsx",
  "app/(app)/defend/[code]/page.tsx",
];

describe("consent gate wiring", () => {
  it.each(GATED_PAGES)("%s awaits requireSelfAuditConsent()", (page) => {
    const source = readFileSync(join(process.cwd(), page), "utf8");
    expect(source).toMatch(/await requireSelfAuditConsent\(\)/);
  });

  it("the onboarding page itself is NOT gated (it is the consent surface)", () => {
    const source = readFileSync(join(process.cwd(), "app/(app)/onboarding/page.tsx"), "utf8");
    expect(source).not.toMatch(/requireSelfAuditConsent/);
  });
});
