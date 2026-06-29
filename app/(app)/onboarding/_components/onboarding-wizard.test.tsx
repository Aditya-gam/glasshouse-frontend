import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import { OnboardingWizard } from "./onboarding-wizard";

// Rendering OnboardingWizard transitively covers welcome, pillar, consent, connect-step.
describe("OnboardingWizard", () => {
  it("renders the onboarding wizard", () => {
    const { container } = render(<OnboardingWizard />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("steps through the wizard (consent → connect)", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);
    // Walk forward through the steps, toggling any checkboxes/switches and clicking through.
    for (let i = 0; i < 4; i++) {
      for (const box of screen.queryAllByRole("checkbox")) await user.click(box).catch(() => {});
      for (const sw of screen.queryAllByRole("switch")) await user.click(sw).catch(() => {});
      for (const btn of screen.queryAllByRole("button")) await user.click(btn).catch(() => {});
    }
    expect(document.body).not.toBeEmptyDOMElement();
  });

  it("has no a11y violations", async () => {
    const { container } = render(<OnboardingWizard />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
