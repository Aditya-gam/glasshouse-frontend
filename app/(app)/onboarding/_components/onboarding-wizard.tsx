"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";

import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ConsentPolicy } from "@/lib/consent/policy";

import { grantConsents } from "../actions";
import { Consent, type ConsentKey } from "./consent";
import { ConnectStep, type RecordedConsent } from "./connect-step";
import { Welcome } from "./welcome";

import "../onboarding.css";

const STEPS = [
  { key: "welcome", label: "Welcome" },
  { key: "consent", label: "Consent" },
  { key: "connect", label: "Connect" },
] as const;

const UNCHECKED: Record<ConsentKey, boolean> = { purpose: false, art9: false, noFalse: false };

interface OnboardingWizardProps {
  /** The backend's current consent-text version — echoed back with the grant (WC.1). */
  policyVersion: string;
  /** The copy for that version, or null when this build has none (grant not offered). */
  policy: ConsentPolicy | null;
  /** False = demo (backend absent): the grant stays local and says so. */
  live: boolean;
}

export function OnboardingWizard({ policyVersion, policy, live }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [consents, setConsents] = useState(UNCHECKED);
  // The receipt renders from what was RECORDED (the action's result), never from
  // checkbox state — a re-confirm can't misreport a standing Art. 9 grant.
  const [recorded, setRecorded] = useState<RecordedConsent | null>(null);
  const [grantError, setGrantError] = useState<"stale_policy" | "error" | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevStep = useRef<number | null>(null);

  // Move focus to the step heading on step CHANGE only. Tracking the previous step
  // (not a mounted boolean) keeps this correct under StrictMode's replayed effects.
  useEffect(() => {
    if (prevStep.current !== null && prevStep.current !== step) headingRef.current?.focus();
    prevStep.current = step;
  }, [step]);

  const toggle = (key: ConsentKey) => setConsents((c) => ({ ...c, [key]: !c[key] }));
  // Required to proceed: the self-audit purpose + the no-false-safety acknowledgement.
  // Art. 9 is a separate, OPTIONAL explicit choice (GDPR consent must be freely given,
  // never bundled) — declining it just keeps special-category findings sealed.
  const required = consents.purpose && consents.noFalse;
  const requiredCount = [consents.purpose, consents.noFalse].filter(Boolean).length;

  const confirmConsent = () => {
    setGrantError(null);
    // Demo mode never touches the network: acknowledge locally, honestly labeled.
    if (!live) {
      setRecorded({ live: false, art9Granted: consents.art9, art9Error: false, at: Date.now() });
      setStep(2);
      return;
    }
    startTransition(async () => {
      const result = await grantConsents({ policyVersion, art9: consents.art9 });
      if (result.ok) {
        setRecorded({
          live: result.live,
          art9Granted: result.art9Granted,
          art9Error: result.art9Error === true,
          // The backend's grant time is the record; the client clock only serves demo mode.
          at: result.grantedAt ? Date.parse(result.grantedAt) : Date.now(),
        });
        setStep(2);
      } else if (result.code === "stale_policy") {
        setGrantError("stale_policy");
        // New text requires new affirmative acts: clear every box, then re-render the
        // current version's copy (a grant must record exactly what the user confirmed).
        setConsents(UNCHECKED);
        router.refresh();
      } else {
        setGrantError("error");
      }
    });
  };

  let primary;
  if (step === 0) {
    primary = (
      <Button onClick={() => setStep(1)}>
        Get started <Icon name="arrow-right" size={16} />
      </Button>
    );
  } else if (step === 1) {
    primary = (
      <Button
        onClick={confirmConsent}
        disabled={!required || pending || policy === null}
        aria-describedby="consent-help"
      >
        {pending ? "Recording…" : "I consent & continue"} <Icon name="arrow-right" size={16} />
      </Button>
    );
  } else {
    primary = (
      <Button onClick={() => router.push("/connect")}>
        Connect or import <Icon name="arrow-right" size={16} />
      </Button>
    );
  }

  let footNote: string;
  if (policy === null) {
    footNote = "Consent is unavailable until the app is updated.";
  } else if (grantError === "stale_policy") {
    footNote =
      "The consent text changed while you were reading. Please review the updated points and confirm them again.";
  } else if (grantError === "error") {
    footNote = "We couldn't record your consent. Nothing runs until it's recorded — try again.";
  } else if (required) {
    footNote = consents.art9
      ? "You can withdraw consent anytime in Account."
      : "You can continue without the optional Article 9 consent — special-category findings stay sealed.";
  } else {
    footNote = "Deny-by-default — nothing runs until you confirm both required points.";
  }

  return (
    <div className="page">
      <main id="main-content" tabIndex={-1} className="wrap">
        <div className="ob-topbar">
          <div className="brand">
            <div className="brand-mark">
              <Icon name="scan" size={19} />
            </div>
            <div className="brand-text">
              <span className="brand-name">Glasshouse</span>
              <span className="brand-sub">Privacy self-audit</span>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <nav className="stepper" aria-label="Onboarding progress">
          <ol>
            {STEPS.map((s, i) => {
              let status: "done" | "current" | "todo" = "todo";
              if (i < step) status = "done";
              else if (i === step) status = "current";
              return (
                <Fragment key={s.key}>
                  <li>
                    <button
                      type="button"
                      className="step-node"
                      data-status={status}
                      disabled={i >= step || pending}
                      aria-current={i === step ? "step" : undefined}
                      onClick={() => {
                        if (i < step) setStep(i);
                      }}
                    >
                      <span className="step-dot">
                        {status === "done" ? <Icon name="check" size={14} stroke={2.5} /> : i + 1}
                      </span>
                      <span className="step-label">{s.label}</span>
                    </button>
                  </li>
                  {i < STEPS.length - 1 && (
                    <li aria-hidden="true">
                      <span className="step-connector" data-done={i < step} />
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ol>
        </nav>

        <div className="panel">
          <div className="panel-inner">
            {step === 0 && <Welcome headingRef={headingRef} />}
            {step === 1 && (
              <Consent
                headingRef={headingRef}
                policy={policy}
                consents={consents}
                toggle={toggle}
              />
            )}
            {step === 2 && recorded && <ConnectStep headingRef={headingRef} recorded={recorded} />}

            <div className="panel-foot">
              <div className="actions">
                {step > 0 ? (
                  <Button variant="secondary" disabled={pending} onClick={() => setStep(step - 1)}>
                    <Icon name="arrow-left" size={16} /> Back
                  </Button>
                ) : (
                  <span className="hint">Takes about two minutes</span>
                )}
                <div className="actions-right">
                  {step === 1 && policy !== null && (
                    <span className="count" aria-live="polite">
                      {requiredCount} of 2 required confirmed
                    </span>
                  )}
                  {primary}
                </div>
              </div>
              {step === 1 && (
                <p className="foot-note" id="consent-help" aria-live="polite">
                  {footNote}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
