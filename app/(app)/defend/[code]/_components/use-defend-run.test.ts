import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDefendRun } from "./use-defend-run";

describe("useDefendRun", () => {
  afterEach(() => vi.useRealTimers());

  it("advances through the rewrite-and-prove stages, then completes", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { result } = renderHook(() => useDefendRun(true, onDone));
    expect(result.current.status).toBe("running");

    act(() => void vi.advanceTimersByTime(2300));
    expect(result.current.stage).toBe(1);
    act(() => void vi.advanceTimersByTime(2500));
    expect(result.current.stage).toBe(2);
    act(() => void vi.advanceTimersByTime(2600));
    expect(result.current.status).toBe("done");
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
