import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { ReliabilityBar } from "./reliability-bar";

describe("ReliabilityBar", () => {
  it("exposes the calibrated point + interval to assistive tech as a labelled image", () => {
    render(<ReliabilityBar point={86} lo={81} hi={90} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Calibrated reliability 86 percent, interval 81 to 90 percent",
    );
  });

  it("has no a11y violations", async () => {
    const { container } = render(<ReliabilityBar point={86} lo={81} hi={90} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
