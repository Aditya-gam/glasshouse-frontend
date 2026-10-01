import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { BENCH, CALIB } from "@/lib/fixtures/trust";

import { TrustScreen } from "./trust-screen";

// Rendering TrustScreen transitively covers BenchmarkSection, CalibrationSection,
// CalibrationChart, EmptyState, and ErrorState.
describe("TrustScreen", () => {
  it("loaded: benchmark + calibration + the calibrated-not-raw invariant", () => {
    render(<TrustScreen initialState="loaded" bench={BENCH} calib={CALIB} />);
    expect(
      screen.getByRole("heading", { name: /How do we know these numbers/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Measured accuracy, per attribute/)).toBeInTheDocument(); // BenchmarkSection
    expect(screen.getByText(/Like a validated medical test/)).toBeInTheDocument();
    expect(screen.getByText(/never see a raw model confidence/i)).toBeInTheDocument();
  });

  it("loading: still renders the benchmark section (in skeleton form)", () => {
    render(<TrustScreen initialState="loading" bench={BENCH} calib={CALIB} />);
    expect(screen.getByText(/Measured accuracy, per attribute/)).toBeInTheDocument();
  });

  it("empty: prompts to run the eval", () => {
    render(<TrustScreen initialState="empty" bench={BENCH} calib={CALIB} />);
    expect(screen.getByText("No benchmark yet")).toBeInTheDocument();
  });

  it("error: shows a calm, recoverable error", () => {
    render(<TrustScreen initialState="error" bench={BENCH} calib={CALIB} />);
    expect(screen.getByText("Couldn't load the benchmark")).toBeInTheDocument();
  });

  it("has no a11y violations (loaded)", async () => {
    const { container } = render(<TrustScreen initialState="loaded" bench={BENCH} calib={CALIB} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
