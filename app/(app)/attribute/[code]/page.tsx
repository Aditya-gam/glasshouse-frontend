import { getLocationAttribution } from "@/lib/data/attribution";

import { AttributionView, type AttributionViewState } from "./_components/attribution-view";

const STATES = new Set<AttributionViewState>(["loaded", "loading", "empty", "error"]);

function normalizeState(state: string | undefined): AttributionViewState {
  return STATES.has(state as AttributionViewState) ? (state as AttributionViewState) : "loaded";
}

export default async function AttributionPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { code } = await params;
  const { state } = await searchParams;
  const { finding, why, evidence } = await getLocationAttribution();
  return (
    <AttributionView
      code={code}
      initialState={normalizeState(state)}
      finding={finding}
      why={why}
      evidence={evidence}
    />
  );
}
