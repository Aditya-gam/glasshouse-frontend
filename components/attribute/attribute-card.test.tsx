import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AttrItem } from "@/lib/schemas/attribute";
import { axe } from "@/test/axe";

import { AttributeCard } from "./attribute-card";

const location: AttrItem = {
  code: "location",
  label: "Current location",
  value: "Lisbon, Portugal",
  detail: "city-level",
  reliability: 86,
  lo: 81,
  hi: 90,
  evidence: "6 posts pin this",
  evidenceCount: 6,
  sev: { atrisk: "extreme", jobseeker: "moderate" },
};

describe("AttributeCard", () => {
  it("shows CALIBRATED reliability — point + interval — never raw confidence", () => {
    render(<AttributeCard attr={location} level="extreme" />);
    expect(screen.getByText("Current location")).toBeInTheDocument();
    expect(screen.getByText("Lisbon, Portugal")).toBeInTheDocument();
    expect(screen.getByText("Calibrated reliability")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(screen.getByText(/calibrated range 81.90%/)).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/Calibrated reliability 86 percent/);
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  it("carries severity as an icon + label", () => {
    const { container } = render(<AttributeCard attr={location} level="extreme" />);
    expect(screen.getByText("Extreme")).toBeInTheDocument();
    expect(container.querySelector(".sev svg")).toBeInTheDocument();
  });

  it("renders the wired location attribute as one card-as-link with no nested interactive", () => {
    render(<AttributeCard attr={location} level="extreme" detailHref="/attribute/location" />);
    expect(screen.getByRole("link", { name: "Open Current location detail" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("fires onFix from the non-linked card's action", async () => {
    const user = userEvent.setup();
    const onFix = vi.fn();
    render(<AttributeCard attr={location} level="extreme" onFix={onFix} />);
    await user.click(screen.getByRole("button", { name: /Fix this/ }));
    expect(onFix).toHaveBeenCalledOnce();
  });

  it("renders abstain as a first-class no-signal state (not a fabricated guess)", () => {
    const abstain: AttrItem = {
      ...location,
      code: "income",
      label: "Income",
      value: null,
      abstain: true,
    };
    render(<AttributeCard attr={abstain} level="abstain" />);
    expect(screen.getByText("Abstained")).toBeInTheDocument();
    expect(screen.getByText(/We don.t fabricate a value/)).toBeInTheDocument();
    expect(screen.queryByText("Lisbon, Portugal")).not.toBeInTheDocument();
  });

  it("has no a11y violations (linked and non-linked)", async () => {
    const { container, rerender } = render(
      <AttributeCard attr={location} level="extreme" detailHref="/attribute/location" />,
    );
    expect((await axe(container)).violations).toEqual([]);
    rerender(<AttributeCard attr={location} level="extreme" onFix={() => {}} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
