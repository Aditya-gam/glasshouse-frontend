import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SEV_META } from "@/lib/severity";

import { SeverityChip } from "./severity-chip";

describe("SeverityChip", () => {
  it("renders severity as an icon + text label (never color alone)", () => {
    const { container } = render(<SeverityChip level="high" />);
    expect(screen.getByText(SEV_META.high.label)).toBeInTheDocument(); // "High"
    expect(container.querySelector("svg")).toBeInTheDocument(); // accompanying icon
  });

  it("labels abstain as an explicit no-signal state", () => {
    render(<SeverityChip level="abstain" />);
    expect(screen.getByText(SEV_META.abstain.label)).toBeInTheDocument(); // "No signal"
  });
});
