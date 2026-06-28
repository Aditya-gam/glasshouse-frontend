import { describe, expect, it } from "vitest";

import type { AttrItem } from "@/lib/schemas/attribute";
import { inferredCount, lensSeverity, orderFor, severityFor } from "@/lib/severity";

/** Minimal AttrItem factory — only the fields the severity logic reads matter. */
function makeAttr(over: Partial<AttrItem> & Pick<AttrItem, "code">): AttrItem {
  return {
    label: over.code,
    value: "x",
    detail: null,
    evidence: "source",
    sev: { atrisk: "low", jobseeker: "low" },
    ...over,
  };
}

describe("lensSeverity", () => {
  it("Balanced is the safety-aware MAX across personas", () => {
    expect(lensSeverity({ atrisk: "extreme", jobseeker: "low" }, "balanced")).toBe("extreme");
    expect(lensSeverity({ atrisk: "low", jobseeker: "high" }, "balanced")).toBe("high");
  });

  it("a persona lens returns that persona's level verbatim", () => {
    const sev = { atrisk: "extreme", jobseeker: "low" } as const;
    expect(lensSeverity(sev, "atrisk")).toBe("extreme");
    expect(lensSeverity(sev, "jobseeker")).toBe("low");
  });
});

describe("severityFor", () => {
  it("abstain wins regardless of lens", () => {
    const a = makeAttr({
      code: "income",
      abstain: true,
      sev: { atrisk: "extreme", jobseeker: "extreme" },
    });
    expect(severityFor(a, "balanced")).toBe("abstain");
    expect(severityFor(a, "atrisk")).toBe("abstain");
  });

  it("non-abstain uses the lens-relative level", () => {
    const a = makeAttr({ code: "location", sev: { atrisk: "high", jobseeker: "moderate" } });
    expect(severityFor(a, "balanced")).toBe("high");
    expect(severityFor(a, "jobseeker")).toBe("moderate");
  });
});

describe("orderFor", () => {
  const low = makeAttr({ code: "age", sev: { atrisk: "low", jobseeker: "low" }, reliability: 90 });
  const high = makeAttr({
    code: "location",
    sev: { atrisk: "high", jobseeker: "low" },
    reliability: 50,
  });
  const abstain = makeAttr({ code: "income", abstain: true });

  it("orders by lens severity desc, sinking abstain last — without dropping anything", () => {
    const ordered = orderFor([low, abstain, high], "atrisk");
    expect(ordered.map((a) => a.code)).toEqual(["location", "age", "income"]);
    expect(ordered).toHaveLength(3); // reorders, never hides
  });

  it("re-ranks when the lens changes (high attribute sinks under jobseeker lens)", () => {
    // under jobseeker, `high` is "low" (jobseeker:low) and ties with `low`; reliability breaks the tie
    const ordered = orderFor([high, low], "jobseeker");
    expect(ordered.map((a) => a.code)).toEqual(["age", "location"]); // age has higher reliability
  });

  it("does not mutate the input array", () => {
    const input = [low, high];
    orderFor(input, "balanced");
    expect(input.map((a) => a.code)).toEqual(["age", "location"]);
  });
});

describe("inferredCount", () => {
  it("counts only attributes with a usable signal", () => {
    expect(
      inferredCount([
        makeAttr({ code: "location" }),
        makeAttr({ code: "income", abstain: true }),
        makeAttr({ code: "age" }),
      ]),
    ).toBe(2);
  });
});
