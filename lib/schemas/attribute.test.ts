import { describe, expect, it } from "vitest";

import { attrItemSchema, lensSchema } from "./attribute";

const valid = {
  code: "location",
  label: "Current location",
  value: "Lisbon, Portugal",
  detail: "city-level",
  evidence: "6 posts pin this",
  reliability: 86,
  lo: 81,
  hi: 90,
  sev: { atrisk: "extreme", jobseeker: "moderate" },
};

describe("attrItemSchema", () => {
  it("accepts a well-formed inferred attribute", () => {
    expect(attrItemSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects calibrated reliability outside 0–100", () => {
    expect(attrItemSchema.safeParse({ ...valid, reliability: 120 }).success).toBe(false);
    expect(attrItemSchema.safeParse({ ...valid, reliability: -1 }).success).toBe(false);
  });

  it("rejects an attribute code outside the fixed taxonomy", () => {
    expect(attrItemSchema.safeParse({ ...valid, code: "ssn" }).success).toBe(false);
  });

  it("accepts a first-class abstain with a null value", () => {
    const abstain = {
      code: "income",
      label: "Income",
      value: null,
      detail: null,
      evidence: "no posts gave a usable signal",
      abstain: true,
      sev: { atrisk: "low", jobseeker: "low" },
    };
    expect(attrItemSchema.safeParse(abstain).success).toBe(true);
  });
});

describe("lensSchema", () => {
  it("accepts the three persona lenses and rejects anything else", () => {
    for (const ok of ["balanced", "jobseeker", "atrisk"]) {
      expect(lensSchema.safeParse(ok).success).toBe(true);
    }
    expect(lensSchema.safeParse("admin").success).toBe(false);
  });
});
