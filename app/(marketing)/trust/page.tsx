import { TrustScreen, type TrustViewState } from "./_components/trust-screen";

const STATES: TrustViewState[] = ["loaded", "loading", "empty", "error"];

function normalizeState(state: string | undefined): TrustViewState {
  return STATES.includes(state as TrustViewState) ? (state as TrustViewState) : "loaded";
}

export default async function TrustPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <TrustScreen initialState={normalizeState(state)} />;
}
