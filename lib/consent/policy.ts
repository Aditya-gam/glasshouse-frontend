/**
 * Consent policy copy, keyed by `policy_version` (write-paths plan, WC.1): the backend's
 * `current_policy_version` names the text the user must be shown, and the grant echoes
 * that version back. If the backend announces a version this module has no text for, the
 * UI must NOT offer the grant — a consent the user can't read isn't consent.
 *
 * Adding or changing consent wording = a NEW version key here, never an edit in place,
 * so a recorded `policy_version` always names exactly what the user saw.
 */

export interface ConsentPointCopy {
  title: string;
  body: string;
}

export interface ConsentPolicy {
  /** The plain-language summary rows above the checkboxes. */
  kv: { purpose: string; data: string; withdraw: string };
  /** Required: the self-audit purpose (wire purpose `self_audit`). */
  selfAudit: ConsentPointCopy;
  /** Optional, separate and explicit (GDPR Art. 9; wire purpose `art9_inference`). */
  art9: ConsentPointCopy & { declinedNote: string };
  /** Required acknowledgement — product honesty, not a wire purpose. */
  noFalseSafety: ConsentPointCopy;
  alert: { title: string; body: string };
}

export const CONSENT_POLICIES: Record<string, ConsentPolicy> = {
  "2026-10-11": {
    kv: {
      purpose: "Self-audit — reveal what others can infer about you",
      data: "Your own footprint, encrypted; content is never logged",
      withdraw:
        "Anytime, from Account — revoking stops processing; deleting your account is the separate step that crypto-shreds your data",
    },
    selfAudit: {
      title: "I'm auditing my own footprint",
      body: "I understand this processes data I control to show what others could infer about me.",
    },
    art9: {
      title: "I explicitly consent to special-category data",
      body:
        "Some inferences — like birthplace, which can relate to ethnic origin — fall under GDPR " +
        "Article 9. This consent is explicit, optional, and reversible.",
      declinedNote:
        "Leave this unchecked and special-category findings stay sealed until you grant it in Account.",
    },
    noFalseSafety: {
      title: "I understand this can't recall existing copies",
      body:
        "Reducing exposure later can't pull back screenshots, archives, or reposts others have " +
        "already made.",
    },
    alert: {
      title: "No false safety",
      body:
        "Even after you act, we'll only say a specific adversary can no longer recover an " +
        "attribute — never that it's “safe.”",
    },
  },
};

/** The newest version this build ships text for — the demo default before W1 is live. */
export const LATEST_POLICY_VERSION = "2026-10-11";
