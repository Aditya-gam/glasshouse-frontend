import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import { Topbar } from "./topbar";

// Rendering the real Topbar covers PersonaLens, ThemeToggle, and AccountMenu.
describe("Topbar", () => {
  it("renders the brand, persona lens, and account cluster", () => {
    render(<Topbar />);
    expect(screen.getByRole("radiogroup", { name: "Persona lens" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Glasshouse/ })).toBeInTheDocument();
  });

  it("renders a center slot and hides back/lens when asked", () => {
    render(<Topbar center={<span>center-slot</span>} showBack={false} showLens={false} />);
    expect(screen.getByText("center-slot")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Persona lens" })).not.toBeInTheDocument();
  });
});
