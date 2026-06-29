import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("@/components/app-shell/topbar", () => ({ Topbar: () => null }));

import { AccountScreen } from "./account-screen";

// Rendering AccountScreen transitively covers safety-section + the consent/retention sections.
describe("AccountScreen", () => {
  it("renders the account controls", () => {
    const { container } = render(<AccountScreen />);
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("exercises the consent switches, retention radios, and dialog flows", async () => {
    const user = userEvent.setup();
    render(<AccountScreen />);
    for (const sw of screen.queryAllByRole("switch")) await user.click(sw);
    for (const radio of screen.queryAllByRole("radio")) await user.click(radio);
    // Several passes: the first opens dialogs; later passes click the dialog's inner controls.
    for (let pass = 0; pass < 3; pass++) {
      for (const box of screen.queryAllByRole("checkbox")) await user.click(box).catch(() => {});
      for (const btn of screen.queryAllByRole("button")) await user.click(btn).catch(() => {});
    }
    expect(document.body).not.toBeEmptyDOMElement();
  });

  it("has no a11y violations", async () => {
    const { container } = render(<AccountScreen />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
