import { getAccountOverview } from "@/lib/data/account";
import { requireSelfAuditConsent } from "@/lib/data/consent";

import { AccountScreen } from "./_components/account-screen";

export default async function AccountPage() {
  await requireSelfAuditConsent();
  const { account, connections, live } = await getAccountOverview();
  return <AccountScreen account={account} connections={connections} live={live} />;
}
