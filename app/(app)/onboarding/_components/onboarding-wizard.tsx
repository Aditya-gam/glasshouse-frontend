"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { Consent, type ConsentKey } from "./consent";
import { ConnectStep } from "./connect-step";
import { Welcome } from "./welcome";

import "../onboarding.css";

const STEPS = [
  { key: "welcome", label: "Welcome" },
  { key: "consent", label: "Consent" },
  { key: "connect", label: "Connect" },
] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    purpose: false,
    art9: false,
    noFalse: false,
  });
  const [consentedAt, setConsentedAt] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Move focus to the step heading on step change (not on first mount) — a11y.
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  const toggle = (key: ConsentKey) => setConsents((c) => ({ ...c, [key]: !c[key] }));
  const allConsented = consents.purpose && consents.art9 && consents.noFalse;
  const count = Object.values(consents).filter(Boolean).length;
  const confirmConsent = () => {
    setConsentedAt((t) => t ?? Date.now());
    setStep(2);
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
      <Button onClick={confirmConsent} disabled={!allConsented} aria-describedby="consent-help">
        I consent &amp; continue <Icon name="arrow-right" size={16} />
      </Button>
    );
  } else {
    primary = (
      <Button onClick={() => router.push("/connect")}>
        Connect or import <Icon name="arrow-right" size={16} />
      </Button>
    );
  }

  return (
    <div className="page">
      <main className="wrap">
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
                      disabled={i >= step}
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
            {step === 1 && <Consent headingRef={headingRef} consents={consents} toggle={toggle} />}
            {step === 2 && <ConnectStep headingRef={headingRef} consentedAt={consentedAt} />}

            <div className="panel-foot">
              <div className="actions">
                {step > 0 ? (
                  <Button variant="secondary" onClick={() => setStep(step - 1)}>
                    <Icon name="arrow-left" size={16} /> Back
                  </Button>
                ) : (
                  <span className="hint">Takes about two minutes</span>
                )}
                <div className="actions-right">
                  {step === 1 && (
                    <span className="count" aria-live="polite">
                      {count} of 3 confirmed
                    </span>
                  )}
                  {primary}
                </div>
              </div>
              {step === 1 && (
                <p className="foot-note" id="consent-help">
                  {allConsented
                    ? "You can withdraw consent anytime in Account."
                    : "Deny-by-default — leave any box unchecked and nothing runs. Confirm all three to continue."}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
