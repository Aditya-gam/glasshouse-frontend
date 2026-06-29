import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SkelCard, SkelChart, SkelGrid, SkelRow } from "./skeletons";

describe("skeletons", () => {
  it("render the card / row / chart / grid compositions", () => {
    const { container } = render(
      <>
        <SkelCard />
        <SkelRow />
        <SkelChart />
        <SkelGrid n={3} />
      </>,
    );
    expect(container.querySelectorAll(".skel-card").length).toBe(4); // 1 SkelCard + 3 in SkelGrid
    expect(container.querySelector(".skel-chart")).toBeInTheDocument();
  });
});
