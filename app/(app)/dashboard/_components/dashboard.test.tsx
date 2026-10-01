import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ATTRIBUTES } from "@/lib/fixtures/attributes";

// Stub the shared shell — its router/theme/account/lens deps are orthogonal to what the
// dashboard itself renders (the audit results + honest states).
vi.mock("@/components/app-shell/topbar", () => ({ Topbar: () => null }));

import { Dashboard } from "./dashboard";

describe("Dashboard (integration)", () => {
  it("loaded: renders inferred attributes with CALIBRATED reliability — never raw confidence", () => {
    render(<Dashboard attrs={ATTRIBUTES} initialState="loaded" />);
    expect(screen.getByText("Current location")).toBeInTheDocument();
    expect(screen.getByText("Investigative journalist")).toBeInTheDocument();
    // calibrated band (point + interval), shown per inferred card — never raw confidence.
    expect(screen.getByText(/calibrated range 81.90%/)).toBeInTheDocument();
    expect(screen.getAllByText("Calibrated reliability").length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText("Abstained")).toBeInTheDocument(); // income abstains
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  it("loaded: the wired location attribute is a single card-as-link", () => {
    render(<Dashboard attrs={ATTRIBUTES} initialState="loaded" />);
    expect(screen.getByRole("link", { name: "Open Current location detail" })).toBeInTheDocument();
  });

  it("loaded: a LIVE inference (one with an id) links to its detail whatever its code", () => {
    const live = ATTRIBUTES.map((attr) =>
      attr.code === "occupation" ? { ...attr, id: "8e7fab32-e609-4c9a-b970-0e13e6447236" } : attr,
    );
    render(<Dashboard attrs={live} initialState="loaded" />);
    const link = screen.getByRole("link", { name: "Open Occupation detail" });
    expect(link).toHaveAttribute("href", "/attribute/occupation");
  });

  it("empty: prompts to connect and shows no attribute cards", () => {
    render(<Dashboard attrs={ATTRIBUTES} initialState="empty" />);
    expect(screen.getByText("Nothing to analyze yet")).toBeInTheDocument();
    expect(screen.getByText(/Connect or import/)).toBeInTheDocument();
    expect(screen.queryByText("Current location")).not.toBeInTheDocument();
  });

  it("error: shows a calm, recoverable error with a retry affordance", () => {
    render(<Dashboard attrs={ATTRIBUTES} initialState="error" />);
    expect(screen.getByText("We couldn't finish your audit")).toBeInTheDocument();
    expect(screen.getByText(/Re-run audit/)).toBeInTheDocument();
  });

  it("abstained: states no signal without fabricating any values", () => {
    render(<Dashboard attrs={ATTRIBUTES} initialState="abstained" />);
    expect(screen.getByText(/couldn.t infer anything/i)).toBeInTheDocument();
    expect(screen.getAllByText("Abstained").length).toBeGreaterThan(1);
  });

  it("loading: shows run progress and no finished results yet", () => {
    render(<Dashboard attrs={ATTRIBUTES} initialState="loading" />);
    expect(screen.getByText("Running your audit")).toBeInTheDocument();
  });
});
