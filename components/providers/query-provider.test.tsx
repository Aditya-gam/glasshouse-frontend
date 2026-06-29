import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/components/theme-provider";

import { QueryProvider } from "./query-provider";

describe("app providers", () => {
  it("ThemeProvider and QueryProvider render their children", () => {
    render(
      <ThemeProvider attribute="class">
        <QueryProvider>
          <span>app-content</span>
        </QueryProvider>
      </ThemeProvider>,
    );
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });
});
