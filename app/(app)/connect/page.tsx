import { getConsentContext, requireSelfAuditConsent } from "@/lib/data/consent";

import { ConnectScreen } from "./_components/connect-screen";

export default async function ConnectPage() {
  await requireSelfAuditConsent();
  // Backend presence decides whether uploads go to the wire or demo-simulate (the
  // extraction always runs for real — file errors are honest either way).
  const { live } = await getConsentContext();
  return <ConnectScreen live={live} />;
}
