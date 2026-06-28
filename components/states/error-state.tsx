"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import "./states.css";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Plain-language detail in a <details> — never a stack trace. */
  details?: string;
}

/** Honest error — calm, not a red alert. `role="alert"` announces it once. */
export function ErrorState({
  title = "We couldn't complete that",
  message,
  onRetry,
  retryLabel = "Try again",
  details,
}: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <div className="state-ic state-ic--error">
        <Icon name="wifi-off" size={26} />
      </div>
      <h3 className="state-title">{title}</h3>
      {message && <p className="state-msg">{message}</p>}
      {onRetry && (
        <div className="state-actions">
          <Button onClick={onRetry}>
            <Icon name="rotate-cw" size={15} /> {retryLabel}
          </Button>
        </div>
      )}
      {details && (
        <details className="state-details">
          <summary>
            <Icon name="chevron-right" size={13} className="chev" /> What happened
          </summary>
          <div className="state-detail-body">{details}</div>
        </details>
      )}
    </div>
  );
}
