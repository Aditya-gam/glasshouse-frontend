import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SetupSteps } from "./setup-steps";

describe("SetupSteps", () => {
  it("renders all steps and marks the active one", () => {
    render(<SetupSteps active="connect" />);
    for (const label of ["Set up", "Connect", "Audit"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("Connect").closest("[data-state]")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});
