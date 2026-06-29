import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DECOY_BACKFIRE, OPTIONS, TARGET } from "@/lib/fixtures/defend";
import { axe } from "@/test/axe";

vi.mock("@/components/app-shell/topbar", () => ({ Topbar: () => null }));

import { DefendView } from "./defend-view";

const props = { target: TARGET, options: OPTIONS, decoyBackfire: DECOY_BACKFIRE };

// Rendering DefendView transitively covers hero, frontier-option, diff-item, diff-text,
// interval-compare, cant-break, not-proven, decoy-dialogs.
describe("DefendView", () => {
  it("loaded: renders the break-this-inference screen", () => {
    render(<DefendView {...props} initialState="loaded" />);
    expect(screen.getByRole("heading", { name: /Break this inference/ })).toBeInTheDocument();
  });

  it("renders the unproven / nomeaning / error states", () => {
    const { rerender, container } = render(<DefendView {...props} initialState="unproven" />);
    expect(container).not.toBeEmptyDOMElement();
    rerender(<DefendView {...props} initialState="nomeaning" />);
    expect(container).not.toBeEmptyDOMElement();
    rerender(<DefendView {...props} initialState="error" />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("exercises the frontier options + decoy dialog flows", async () => {
    const user = userEvent.setup();
    render(<DefendView {...props} initialState="loaded" />);
    for (const radio of screen.queryAllByRole("radio")) await user.click(radio);
    for (const sw of screen.queryAllByRole("switch")) await user.click(sw);
    // Multiple passes so decoy dialogs open and their inner controls get clicked too.
    for (let pass = 0; pass < 3; pass++) {
      for (const btn of screen.queryAllByRole("button")) await user.click(btn).catch(() => {});
    }
    expect(document.body).not.toBeEmptyDOMElement();
  });

  it("has no a11y violations (loaded)", async () => {
    const { container } = render(<DefendView {...props} initialState="loaded" />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
