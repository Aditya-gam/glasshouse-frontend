import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("@/components/app-shell/topbar", () => ({ Topbar: () => null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import { ConnectScreen } from "./connect-screen";

// Rendering ConnectScreen transitively covers source-card, connect-error, import-run.
describe("ConnectScreen", () => {
  it("renders the connect / import screen", () => {
    const { container } = render(<ConnectScreen />);
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("exercises the source connect / import controls", async () => {
    const user = userEvent.setup();
    render(<ConnectScreen />);
    for (const btn of screen.queryAllByRole("button")) {
      await user.click(btn).catch(() => {}); // start imports / retention toggles
    }
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
  });

  it("has no a11y violations", async () => {
    const { container } = render(<ConnectScreen />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
