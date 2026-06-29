import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { attrArb, lensArb, sevLevelArb } from "@/test/arbitraries";

import { SEV_RANK, inferredCount, lensSeverity, orderFor, severityFor } from "./severity";

describe("severity domain invariants (property-based)", () => {
  it("orderFor is a permutation — exactly the same elements, nothing dropped or added", () => {
    fc.assert(
      fc.property(fc.array(attrArb), lensArb, (attrs, lens) => {
        const out = orderFor(attrs, lens);
        expect(out).toHaveLength(attrs.length);
        expect(new Set(out)).toEqual(new Set(attrs)); // same element references
      }),
    );
  });

  it("orderFor sinks abstain last — nothing non-abstain follows an abstain", () => {
    fc.assert(
      fc.property(fc.array(attrArb), lensArb, (attrs, lens) => {
        const out = orderFor(attrs, lens);
        const firstAbstain = out.findIndex((a) => severityFor(a, lens) === "abstain");
        if (firstAbstain === -1) return;
        for (let i = firstAbstain; i < out.length; i++) {
          expect(severityFor(out[i], lens)).toBe("abstain");
        }
      }),
    );
  });

  it("orderFor is non-increasing in lens-severity rank", () => {
    fc.assert(
      fc.property(fc.array(attrArb), lensArb, (attrs, lens) => {
        const out = orderFor(attrs, lens);
        for (let i = 1; i < out.length; i++) {
          expect(SEV_RANK[severityFor(out[i - 1], lens)]).toBeGreaterThanOrEqual(
            SEV_RANK[severityFor(out[i], lens)],
          );
        }
      }),
    );
  });

  it("orderFor is idempotent — re-ordering an ordered list is a no-op", () => {
    fc.assert(
      fc.property(fc.array(attrArb), lensArb, (attrs, lens) => {
        const once = orderFor(attrs, lens);
        expect(orderFor(once, lens)).toEqual(once);
      }),
    );
  });

  it("Balanced lens severity is the safety-aware MAX of the two personas", () => {
    fc.assert(
      fc.property(sevLevelArb, sevLevelArb, (atrisk, jobseeker) => {
        expect(SEV_RANK[lensSeverity({ atrisk, jobseeker }, "balanced")]).toBe(
          Math.max(SEV_RANK[atrisk], SEV_RANK[jobseeker]),
        );
      }),
    );
  });

  it("Balanced is never less severe than either persona's own view", () => {
    fc.assert(
      fc.property(attrArb, (attr) => {
        const balanced = SEV_RANK[severityFor(attr, "balanced")];
        expect(balanced).toBeGreaterThanOrEqual(SEV_RANK[severityFor(attr, "atrisk")]);
        expect(balanced).toBeGreaterThanOrEqual(SEV_RANK[severityFor(attr, "jobseeker")]);
      }),
    );
  });

  it("abstain always wins severityFor, regardless of lens or per-persona levels", () => {
    fc.assert(
      fc.property(attrArb, lensArb, (attr, lens) => {
        if (attr.abstain) expect(severityFor(attr, lens)).toBe("abstain");
      }),
    );
  });

  it("inferredCount equals the count of non-abstaining attributes", () => {
    fc.assert(
      fc.property(fc.array(attrArb), (attrs) => {
        expect(inferredCount(attrs)).toBe(attrs.filter((a) => !a.abstain).length);
      }),
    );
  });
});
