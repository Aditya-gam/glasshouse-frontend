"use client";

import type { HTMLAttributes, KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { AttrItem, DisplaySeverity } from "@/lib/schemas/attribute";

import { ReliabilityBar } from "./reliability-bar";
import { SeverityChip } from "./severity-chip";

import "./attribute.css";

interface AttributeCardProps {
  attr: AttrItem;
  level: DisplaySeverity;
  onFix: () => void;
  /** Renders the "evidence ›" link when set (only the wired location attribute). */
  onEvidence?: (() => void) | null;
  /** Makes the whole card a button (the §6 nested-interactive pattern — the
   *  card-as-link/overlay refactor is M5.7). */
  onOpen?: (() => void) | null;
}

export function AttributeCard({ attr, level, onFix, onEvidence, onOpen }: AttributeCardProps) {
  if (attr.abstain) {
    return (
      <div className="attr-card attr-card--abstain">
        <div className="attr-head">
          <span className="attr-label">{attr.label}</span>
          <SeverityChip level="abstain" />
        </div>
        <div className="attr-value">Abstained</div>
        <p className="abstain-note">
          The engine looked and found nothing reliable to infer. This is a deliberate &ldquo;no
          signal&rdquo; — not a guess, and not an error.
        </p>
        <div className="abstain-foot">
          <span className="abstain-tag">
            <Icon name="circle-minus" size={14} /> We don&rsquo;t fabricate a value
          </span>
        </div>
      </div>
    );
  }

  const open = onOpen ?? null;
  const cardProps: HTMLAttributes<HTMLDivElement> = open
    ? {
        role: "button",
        tabIndex: 0,
        "aria-label": `Open ${attr.label} detail`,
        onClick: open,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        },
      }
    : {};

  return (
    <div className={"attr-card" + (open ? " attr-card--clickable" : "")} {...cardProps}>
      <div className="attr-head">
        <span className="attr-label">{attr.label}</span>
        <SeverityChip level={level} />
      </div>
      <div className="attr-value">
        {attr.value}
        {attr.detail && <span className="attr-detail">· {attr.detail}</span>}
        {attr.art9 && (
          <span className="tag-art9" title="GDPR Article 9 — special category">
            Art. 9
          </span>
        )}
      </div>

      {attr.reliability != null && attr.lo != null && attr.hi != null && (
        <div className="rel">
          <div className="rel-top">
            <span className="rel-label">Calibrated reliability</span>
            <span className="rel-pct">{attr.reliability}%</span>
          </div>
          <ReliabilityBar point={attr.reliability} lo={attr.lo} hi={attr.hi} />
          <div className="rel-range">
            calibrated range {attr.lo}–{attr.hi}%
          </div>
        </div>
      )}

      <div className="attr-foot">
        {onEvidence ? (
          <button
            type="button"
            className="attr-evidence attr-evidence--link"
            onClick={(e) => {
              e.stopPropagation();
              onEvidence();
            }}
            aria-label={`See why: ${attr.evidence}`}
          >
            <Icon name="file-text" size={14} />
            <span>{attr.evidence}</span>
            <Icon name="chevron-right" size={13} />
          </button>
        ) : (
          <span className="attr-evidence">
            <Icon name="file-text" size={14} />
            <span>{attr.evidence}</span>
          </span>
        )}
        <Button
          className="fix-btn"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onFix();
          }}
        >
          Fix this <Icon name="arrow-right" size={14} />
        </Button>
      </div>
    </div>
  );
}
