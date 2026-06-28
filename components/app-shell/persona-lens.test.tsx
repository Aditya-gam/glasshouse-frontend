import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LENSES } from "@/lib/persona";
import { axe } from "@/test/axe";

import { PersonaLens } from "./persona-lens";

describe("PersonaLens", () => {
  it("shows ALL persona lenses as a radiogroup (reframes the view, never hides options)", () => {
    render(<PersonaLens value="balanced" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Persona lens" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(LENSES.length);
    for (const lens of LENSES) {
      expect(screen.getByRole("radio", { name: lens.label })).toBeInTheDocument();
    }
  });

  it("marks the active lens and reports the new lens on selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PersonaLens value="balanced" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Balanced" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "At-risk" }));
    expect(onChange).toHaveBeenCalledWith("atrisk");
  });

  it("has no a11y violations", async () => {
    const { container } = render(<PersonaLens value="balanced" onChange={() => {}} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
