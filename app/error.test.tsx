import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import ErrorBoundary from "./error";

const err = Object.assign(new Error("boom — sensitive detail"), { digest: "abc123" });

describe("route error boundary", () => {
  it("shows a calm message and the digest, never the raw error text", () => {
    render(<ErrorBoundary error={err} reset={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/your data is safe/i)).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument(); // digest is the only id shown
    expect(screen.queryByText(/sensitive detail/)).not.toBeInTheDocument(); // raw message never leaked
  });

  it("calls reset() when 'Try again' is clicked", async () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={err} reset={reset} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("offers a home link", () => {
    render(<ErrorBoundary error={err} reset={vi.fn()} />);
    expect(screen.getByRole("link", { name: /return home/i })).toHaveAttribute("href", "/");
  });

  it("has no a11y violations", async () => {
    const { container } = render(<ErrorBoundary error={err} reset={vi.fn()} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
