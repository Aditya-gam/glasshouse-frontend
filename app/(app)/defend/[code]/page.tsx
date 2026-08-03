import { getDefendSimulation } from "@/lib/data/defend";

import { DefendView, type DefendViewState } from "./_components/defend-view";

const STATES = new Set<DefendViewState>(["loaded", "loading", "unproven", "nomeaning", "error"]);

function normalizeState(state: string | undefined): DefendViewState {
  return STATES.has(state as DefendViewState) ? (state as DefendViewState) : "loaded";
}

/** A live run's honest outcome → the screen state it must show (no-false-safety). */
const LIVE_STATE: Record<string, DefendViewState> = {
  proven: "loaded",
  within_noise: "unproven",
  cant_break: "nomeaning",
};

export default async function DefendPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; inference?: string }>;
}) {
  const { state, inference } = await searchParams;
  const { target, options, decoyBackfire, liveStatus } = await getDefendSimulation(inference);
  // An explicit ?state= (the demo/E2E harness) wins; otherwise live data drives the state.
  const initialState =
    state !== undefined || liveStatus === undefined
      ? normalizeState(state)
      : LIVE_STATE[liveStatus];
  return (
    <DefendView
      initialState={initialState}
      target={target}
      options={options}
      decoyBackfire={decoyBackfire}
    />
  );
}
