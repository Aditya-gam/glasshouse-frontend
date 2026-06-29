import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuditRun } from "./use-audit-run";

describe("useAuditRun", () => {
  afterEach(() => vi.useRealTimers());

  it("streams retrieve → infer → calibrate, then completes", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { result } = renderHook(() => useAuditRun(true, onDone));
    expect(result.current.status).toBe("running");

    act(() => void vi.advanceTimersByTime(1300)); // past retrieve
    expect(result.current.stage).toBe(1);
    act(() => void vi.advanceTimersByTime(2500)); // past infer
    expect(result.current.stage).toBe(2);
    act(() => void vi.advanceTimersByTime(2000)); // past calibrate
    expect(result.current.status).toBe("done");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("does nothing while inactive", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { result } = renderHook(() => useAuditRun(false, onDone));
    act(() => void vi.advanceTimersByTime(6000));
    expect(result.current.status).toBe("running");
    expect(onDone).not.toHaveBeenCalled();
  });
});
