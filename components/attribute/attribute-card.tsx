"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { AttrItem, DisplaySeverity } from "@/lib/schemas/attribute";
import { cn } from "@/lib/utils";

import { ReliabilityBar } from "./reliability-bar";
import { SeverityChip } from "./severity-chip";

import "./attribute.css";

interface AttributeCardProps {
  attr: AttrItem;
  level: DisplaySeverity;
  /**
   * When set, the whole card is a single link to the detail (the wired `location`
   * attribute) — evidence + "Fix this" render as decorative affordances inside it, so
   * there are no nested interactive elements (the §6 a11y refactor).
   */
  detailHref?: string | null;
  /** "Fix this" handler for non-linked attributes (a toast in M5.5). */
  onFix?: () => void;
}

export function AttributeCard({ attr, level, detailHref, onFix }: AttributeCardProps) {
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

  const body = (
    <>
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
    </>
  );

  // Linked card (location): one stretched link, decorative foot — no nested buttons.
  if (detailHref) {
    return (
      <Link
        href={detailHref}
        className="attr-card attr-card--link"
        aria-label={`Open ${attr.label} detail`}
      >
        {body}
        <div className="attr-foot" aria-hidden="true">
          <span className="attr-evidence">
            <Icon name="file-text" size={14} />
            <span>{attr.evidence}</span>
            <Icon name="chevron-right" size={13} />
          </span>
          <span className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "fix-btn")}>
            Fix this <Icon name="arrow-right" size={14} />
          </span>
        </div>
      </Link>
    );
  }

  // Non-linked card: a single real action (Fix this), no whole-card link.
  return (
    <div className="attr-card">
      {body}
      <div className="attr-foot">
        <span className="attr-evidence">
          <Icon name="file-text" size={14} />
          <span>{attr.evidence}</span>
        </span>
        <Button className="fix-btn" variant="secondary" size="sm" onClick={onFix}>
          Fix this <Icon name="arrow-right" size={14} />
        </Button>
      </div>
    </div>
  );
}
