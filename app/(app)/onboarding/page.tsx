import { CONSENT_POLICIES } from "@/lib/consent/policy";
import { getConsentContext } from "@/lib/data/consent";

import { OnboardingWizard } from "./_components/onboarding-wizard";

export default async function OnboardingPage() {
  const { account, live } = await getConsentContext();
  // No text for the backend's current version ⇒ the wizard must not offer the grant —
  // a consent the user can't read isn't consent (WC.1).
  const policy = CONSENT_POLICIES[account.currentPolicyVersion] ?? null;
  return (
    <OnboardingWizard policyVersion={account.currentPolicyVersion} policy={policy} live={live} />
  );
}
