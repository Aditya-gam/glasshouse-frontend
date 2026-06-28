import { getDefendSimulation } from "@/lib/data/defend";

import { DefendView, type DefendViewState } from "./_components/defend-view";

const STATES = new Set<DefendViewState>(["loaded", "loading", "unproven", "nomeaning", "error"]);

function normalizeState(state: string | undefined): DefendViewState {
  return STATES.has(state as DefendViewState) ? (state as DefendViewState) : "loaded";
}

export default async function DefendPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const { target, options, decoyBackfire } = await getDefendSimulation();
  return (
    <DefendView
      initialState={normalizeState(state)}
      target={target}
      options={options}
      decoyBackfire={decoyBackfire}
    />
  );
}
