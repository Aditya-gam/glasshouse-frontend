import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EVIDENCE, LOCATION, LOCATION_WHY } from "@/lib/fixtures/attribution";
import { axe } from "@/test/axe";

vi.mock("@/components/app-shell/topbar", () => ({ Topbar: () => null }));

import { AttributionView } from "./attribution-view";

const props = {
  code: "location",
  finding: LOCATION,
  why: LOCATION_WHY,
  evidence: EVIDENCE,
} as const;

// Rendering AttributionView transitively covers evidence-item, highlight, kind-badge, verify.
describe("AttributionView", () => {
  it("loaded: renders the attribution detail with headings", () => {
    const { container } = render(<AttributionView {...props} initialState="loaded" />);
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("renders the loading, empty, and error states", () => {
    const { rerender, container } = render(<AttributionView {...props} initialState="loading" />);
    expect(container).not.toBeEmptyDOMElement(); // attr-skeleton
    rerender(<AttributionView {...props} initialState="empty" />);
    expect(container).not.toBeEmptyDOMElement();
    rerender(<AttributionView {...props} initialState="error" />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("threads the live inference id into the Defend handoff link", () => {
    render(
      <AttributionView
        {...props}
        initialState="loaded"
        inferenceId="8e7fab32-e609-4c9a-b970-0e13e6447236"
      />,
    );
    expect(screen.getByRole("link", { name: /Break this inference/ })).toHaveAttribute(
      "href",
      "/defend/location?inference=8e7fab32-e609-4c9a-b970-0e13e6447236",
    );
  });

  it("masked: renders the consent affordance in place of value, evidence, and reasoning", () => {
    render(
      <AttributionView
        {...props}
        finding={{ ...LOCATION, value: null }}
        initialState="loaded"
        masked
      />,
    );
    expect(screen.getByText("Consent required to reveal")).toBeInTheDocument();
    expect(screen.getByText(/Hidden — consent required/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review consent in Account/ })).toHaveAttribute(
      "href",
      "/account",
    );
    // Sealed content never leaks: no evidence items, reasoning, or candidates.
    expect(screen.queryByText(EVIDENCE[0].rationale)).not.toBeInTheDocument();
    expect(screen.queryByText(/How it was inferred/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Top guess/)).not.toBeInTheDocument();
    // Calibrated reliability stays visible — honesty about exposure is the product.
    expect(screen.getByText(`${LOCATION.reliability}%`)).toBeInTheDocument();
  });

  it("has no a11y violations (loaded and masked)", async () => {
    const { container, rerender } = render(<AttributionView {...props} initialState="loaded" />);
    expect((await axe(container)).violations).toEqual([]);
    rerender(
      <AttributionView
        {...props}
        finding={{ ...LOCATION, value: null }}
        initialState="loaded"
        masked
      />,
    );
    expect((await axe(container)).violations).toEqual([]);
  });
});
