import { requireSelfAuditConsent } from "@/lib/data/consent";

import { AccountScreen } from "./_components/account-screen";

export default async function AccountPage() {
  await requireSelfAuditConsent();
  return <AccountScreen />;
}
