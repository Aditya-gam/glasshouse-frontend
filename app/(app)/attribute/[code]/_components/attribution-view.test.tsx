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

  it("has no a11y violations (loaded)", async () => {
    const { container } = render(<AttributionView {...props} initialState="loaded" />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
