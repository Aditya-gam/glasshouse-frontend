import type { ReactNode, RefObject } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";

export type ConsentKey = "purpose" | "art9" | "noFalse";

interface ConsentProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
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
  children,
}: {
  id: string;
  checked: boolean;
  onToggle: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="consent-row" data-checked={checked}>
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
      <label className="consent-text" htmlFor={id}>
        <span className="consent-t">{title}</span>
        <span className="consent-d">{children}</span>
      </label>
    </div>
  );
}

export function Consent({ headingRef, consents, toggle }: ConsentProps) {
  return (
    <div className="step-anim">
      <p className="eyebrow">Your consent</p>
      <h1 className="step-title" ref={headingRef} tabIndex={-1}>
        Nothing runs until you agree
      </h1>
      <p className="lede">
        We process your footprint only for this self-audit. Please confirm each point below.
      </p>
      <dl className="kv">
        <Kv k="Purpose">Self-audit — reveal what others can infer about you</Kv>
        <Kv k="Data">Your own footprint, encrypted; content is never logged</Kv>
        <Kv k="Withdraw">Anytime, from Account — we crypto-shred your data</Kv>
      </dl>
      <fieldset className="consents">
        <legend className="sr-only">Required consents</legend>
        <ConsentRow
          id="c-purpose"
          checked={consents.purpose}
          onToggle={() => toggle("purpose")}
          title="I'm auditing my own footprint"
        >
          I understand this processes data I control to show what others could infer about me.
        </ConsentRow>
        <ConsentRow
          id="c-art9"
          checked={consents.art9}
          onToggle={() => toggle("art9")}
          title="I explicitly consent to special-category data"
        >
          Some inferences — like birthplace, which can relate to ethnic origin — fall under GDPR
          Article 9. This consent is explicit and reversible.
        </ConsentRow>
        <ConsentRow
          id="c-nofalse"
          checked={consents.noFalse}
          onToggle={() => toggle("noFalse")}
          title="I understand this can't recall existing copies"
        >
          Reducing exposure later can&rsquo;t pull back screenshots, archives, or reposts others
          have already made.
        </ConsentRow>
      </fieldset>
      <Alert className="mt-4">
        <Icon name="shield-check" size={16} />
        <AlertTitle>No false safety</AlertTitle>
        <AlertDescription>
          Even after you act, we&rsquo;ll only say a specific adversary can no longer recover an
          attribute — never that it&rsquo;s &ldquo;safe.&rdquo;
        </AlertDescription>
      </Alert>
    </div>
  );
}
