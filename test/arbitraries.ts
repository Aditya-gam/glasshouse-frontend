import fc from "fast-check";

import type { AttrItem, Lens, SeverityLevel } from "@/lib/schemas/attribute";

/** fast-check arbitraries for the domain types (shared by the property-based tests). */

export const sevLevelArb: fc.Arbitrary<SeverityLevel> = fc.constantFrom(
  "low",
  "moderate",
  "high",
  "extreme",
);

export const lensArb: fc.Arbitrary<Lens> = fc.constantFrom("balanced", "jobseeker", "atrisk");

const codeArb = fc.constantFrom(
  "location",
  "occupation",
  "sex",
  "age",
  "relationship",
  "education",
  "birthplace",
  "income",
);

/** A schema-valid AttrItem (reliability 0–100, codes from the taxonomy, valid severities). */
export const attrArb: fc.Arbitrary<AttrItem> = fc.record({
  code: codeArb,
  label: fc.string(),
  value: fc.option(fc.string(), { nil: null }),
  detail: fc.constant(null),
  evidence: fc.string(),
  reliability: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
  abstain: fc.option(fc.boolean(), { nil: undefined }),
  sev: fc.record({ atrisk: sevLevelArb, jobseeker: sevLevelArb }),
});
