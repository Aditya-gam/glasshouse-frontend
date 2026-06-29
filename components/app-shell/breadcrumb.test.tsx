import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "./breadcrumb";

describe("Breadcrumb", () => {
  it("renders links and marks the last item as the current page", () => {
    render(
      <Breadcrumb
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Current location" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Current location")).toHaveAttribute("aria-current", "page");
  });
});
