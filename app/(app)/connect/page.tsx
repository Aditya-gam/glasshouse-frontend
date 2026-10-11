import { requireSelfAuditConsent } from "@/lib/data/consent";

import { ConnectScreen } from "./_components/connect-screen";

export default async function ConnectPage() {
  await requireSelfAuditConsent();
  return <ConnectScreen />;
}
