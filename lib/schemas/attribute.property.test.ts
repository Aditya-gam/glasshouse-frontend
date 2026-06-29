import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { attrArb } from "@/test/arbitraries";

import { attrItemSchema, lensSchema } from "./attribute";

const TAXONOMY = [
  "location",
  "occupation",
  "sex",
  "age",
  "relationship",
  "education",
  "birthplace",
  "income",
];

describe("attribute schema invariants (property-based)", () => {
  it("accepts every well-formed attribute the domain arbitrary produces", () => {
    fc.assert(
      fc.property(attrArb, (a) => {
        expect(attrItemSchema.safeParse(a).success).toBe(true);
      }),
    );
  });

  it("rejects calibrated reliability outside 0–100", () => {
    fc.assert(
      fc.property(attrArb, fc.oneof(fc.integer({ max: -1 }), fc.integer({ min: 101 })), (a, r) => {
        expect(attrItemSchema.safeParse({ ...a, reliability: r }).success).toBe(false);
      }),
    );
  });

  it("rejects any attribute code outside the fixed taxonomy", () => {
    fc.assert(
      fc.property(
        attrArb,
        fc.string().filter((s) => !TAXONOMY.includes(s)),
        (a, badCode) => {
          expect(attrItemSchema.safeParse({ ...a, code: badCode }).success).toBe(false);
        },
      ),
    );
  });

  it("lensSchema accepts exactly its three members", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(lensSchema.safeParse(s).success).toBe(
          ["balanced", "jobseeker", "atrisk"].includes(s),
        );
      }),
    );
  });
});
