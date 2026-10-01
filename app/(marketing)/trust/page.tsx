import { getTrustBenchmark } from "@/lib/data/trust";
import { BENCH, CALIB } from "@/lib/fixtures/trust";

import { TrustScreen, type TrustViewState } from "./_components/trust-screen";

const STATES = new Set<TrustViewState>(["loaded", "loading", "empty", "error"]);

function normalizeState(state: string | undefined): TrustViewState {
  return STATES.has(state as TrustViewState) ? (state as TrustViewState) : "loaded";
}

export default async function TrustPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const { bench, calib, live } = await getTrustBenchmark();
  // An explicit ?state= (the demo/E2E harness) wins; otherwise a LIVE empty benchmark is the
  // real "no eval has run yet" state — honest, not an error, and never the fixture numbers.
  const initialState =
    state === undefined && live && bench.length === 0 ? "empty" : normalizeState(state);
  // The harness forces a state for demos/tests — give it populated sections when live data
  // is empty; the un-forced (real) path above never substitutes fixtures for live-empty.
  const forcedDemo = state !== undefined && bench.length === 0;
  return (
    <TrustScreen
      initialState={initialState}
      bench={forcedDemo ? BENCH : bench}
      calib={forcedDemo ? CALIB : calib}
    />
  );
}
