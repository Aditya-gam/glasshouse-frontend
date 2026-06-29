import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// use-lens caches the lens in a module singleton; reset modules + storage per test so each
// starts from a clean load.
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

describe("useLens", () => {
  it("defaults to Balanced when nothing is stored (never forces self-identification)", async () => {
    const { useLens } = await import("./use-lens");
    const { result } = renderHook(() => useLens());
    expect(result.current.lens).toBe("balanced");
  });

  it("falls back to Balanced on a corrupt stored value", async () => {
    localStorage.setItem("glasshouse_lens", "not-a-lens");
    const { useLens } = await import("./use-lens");
    expect(renderHook(() => useLens()).result.current.lens).toBe("balanced");
  });

  it("reads a valid persisted lens on load", async () => {
    localStorage.setItem("glasshouse_lens", "jobseeker");
    const { useLens } = await import("./use-lens");
    expect(renderHook(() => useLens()).result.current.lens).toBe("jobseeker");
  });

  it("persists a lens change and serves it back", async () => {
    const { useLens } = await import("./use-lens");
    const { result } = renderHook(() => useLens());
    act(() => result.current.setLens("atrisk"));
    expect(result.current.lens).toBe("atrisk");
    expect(localStorage.getItem("glasshouse_lens")).toBe("atrisk");
  });
});
