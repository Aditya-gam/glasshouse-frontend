import type { ReactNode, RefObject } from "react";

import { EmptyState } from "@/components/states/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import type { ConsentPolicy } from "@/lib/consent/policy";

export type ConsentKey = "purpose" | "art9" | "noFalse";

interface ConsentProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Null ⇒ this build has no text for the backend's current policy version. */
  policy: ConsentPolicy | null;
  consents: Record<ConsentKey, boolean>;
  toggle: (key: ConsentKey) => void;
}

function Kv({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="kv-row">
      <dt>{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ConsentRow({
  id,
  checked,
  onToggle,
  title,
  optional = false,
  children,
}: {
  id: string;
  checked: boolean;
  onToggle: () => void;
  title: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="consent-row" data-checked={checked}>
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
      <label className="consent-text" htmlFor={id}>
        <span className="consent-t">
          {title}
          {optional && <span className="consent-opt"> (optional)</span>}
        </span>
        <span className="consent-d">{children}</span>
      </label>
    </div>
  );
}

export function Consent({ headingRef, policy, consents, toggle }: ConsentProps) {
  if (policy === null) {
    // WC.1: never offer a grant against text the user can't read.
    return (
      <div className="step-anim">
        <p className="eyebrow">Your consent</p>
        <h1 className="step-title" ref={headingRef} tabIndex={-1}>
          Nothing runs until you agree
        </h1>
        <EmptyState
          icon="circle-minus"
          title="This app needs updating"
          message="The consent terms were updated on the server, and this version of the app doesn't include their text yet. We won't ask you to agree to terms you can't read."
          message2="Update or reload the app, then come back to this step."
        />
      </div>
    );
  }

  return (
    <div className="step-anim">
      <p className="eyebrow">Your consent</p>
      <h1 className="step-title" ref={headingRef} tabIndex={-1}>
        Nothing runs until you agree
      </h1>
      <p className="lede">
        We process your footprint only for this self-audit. Please confirm the two required points
        below — the special-category consent is optional.
      </p>
      <dl className="kv">
        <Kv k="Purpose">{policy.kv.purpose}</Kv>
        <Kv k="Data">{policy.kv.data}</Kv>
        <Kv k="Withdraw">{policy.kv.withdraw}</Kv>
      </dl>
      <fieldset className="consents">
        <legend className="sr-only">Consents — two required, one optional</legend>
        <ConsentRow
          id="c-purpose"
          checked={consents.purpose}
          onToggle={() => toggle("purpose")}
          title={policy.selfAudit.title}
        >
          {policy.selfAudit.body}
        </ConsentRow>
        <ConsentRow
          id="c-art9"
          checked={consents.art9}
          onToggle={() => toggle("art9")}
          title={policy.art9.title}
          optional
        >
          {policy.art9.body} {policy.art9.declinedNote}
        </ConsentRow>
        <ConsentRow
          id="c-nofalse"
          checked={consents.noFalse}
          onToggle={() => toggle("noFalse")}
          title={policy.noFalseSafety.title}
        >
          {policy.noFalseSafety.body}
        </ConsentRow>
      </fieldset>
      <Alert className="mt-4">
        <Icon name="shield-check" size={16} />
        <AlertTitle>{policy.alert.title}</AlertTitle>
        <AlertDescription>{policy.alert.body}</AlertDescription>
      </Alert>
    </div>
  );
}
