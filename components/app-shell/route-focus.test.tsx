import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn(() => "/dashboard") }));
vi.mock("next/navigation", () => ({ usePathname }));

import { RouteFocus } from "./route-focus";

describe("RouteFocus", () => {
  it("moves focus to the first heading on a route change (skipping the initial render)", () => {
    // Fresh JSX each render so React actually re-renders RouteFocus on the route change.
    const { rerender } = render(
      <div>
        <h1>Page heading</h1>
        <RouteFocus />
      </div>,
    );
    usePathname.mockReturnValue("/connect");
    rerender(
      <div>
        <h1>Page heading</h1>
        <RouteFocus />
      </div>,
    );
    expect(document.querySelector("h1")).toHaveAttribute("tabindex", "-1");
  });
});
