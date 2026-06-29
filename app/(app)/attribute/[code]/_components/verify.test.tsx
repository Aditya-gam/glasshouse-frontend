import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Verify } from "./verify";

describe("Verify", () => {
  it("confirm → undo", async () => {
    const user = userEvent.setup();
    render(<Verify />);
    await user.click(screen.getByRole("button", { name: /Confirm/ }));
    expect(screen.getByText(/You confirmed this is right/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Is this right?")).toBeInTheDocument();
  });

  it("deny → pick a reason (never changes what others can infer)", async () => {
    const user = userEvent.setup();
    render(<Verify />);
    await user.click(screen.getByRole("button", { name: /Not right/ }));
    await user.click(screen.getByRole("button", { name: "Wrong city" }));
    expect(screen.getByText(/Recorded as not right/)).toBeInTheDocument();
  });
});
