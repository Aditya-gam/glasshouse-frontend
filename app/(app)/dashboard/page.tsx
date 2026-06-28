import { getAttributes } from "@/lib/data/attributes";

import { Dashboard, type DashboardView } from "./_components/dashboard";

const STATES: DashboardView[] = ["loaded", "loading", "empty", "abstained", "error"];

function normalizeState(state: string | undefined): DashboardView {
  return STATES.includes(state as DashboardView) ? (state as DashboardView) : "loaded";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const attrs = await getAttributes();
  return <Dashboard attrs={attrs} initialState={normalizeState(state)} />;
}
