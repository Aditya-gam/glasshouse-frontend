import type { ReactNode, RefObject } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";

interface ConnectStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  consentedAt: number | null;
}

function fmt(ts: number | null): string {
  if (!ts) return "Just now";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "Just now";
  }
}

function Path({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <div className="path">
      <div className="path-ic">
        <Icon name={icon} size={18} />
      </div>
      <div className="path-t">{title}</div>
      <div className="path-d">{children}</div>
    </div>
  );
}

export function ConnectStep({ headingRef, consentedAt }: ConnectStepProps) {
  return (
    <div className="step-anim">
      <p className="eyebrow">You&rsquo;re set</p>
      <h1 className="step-title" ref={headingRef} tabIndex={-1}>
        Let&rsquo;s bring in your footprint
      </h1>
      <p className="lede">
        Consent recorded. Next, connect a read-only account or upload an export. We keep only your
        own items and drop anything about other people.
      </p>
      <div className="recorded">
        <div className="recorded-head">
          <span className="recorded-ic">
            <Icon name="check" size={13} stroke={3} />
          </span>
          <span>Consent recorded</span>
          <span className="recorded-time">{fmt(consentedAt)}</span>
        </div>
        <ul className="recorded-list">
          <li>
            <Icon name="check" size={14} stroke={2.5} /> Self-audit purpose
          </li>
          <li>
            <Icon name="check" size={14} stroke={2.5} /> Article 9 — explicit consent
          </li>
          <li>
            <Icon name="check" size={14} stroke={2.5} /> No false safety acknowledged
          </li>
        </ul>
      </div>
      <div className="paths">
        <Path icon="link" title="Connect read-only">
          Reddit or Mastodon — we never post or change anything.
        </Path>
        <Path icon="upload" title="Upload an export">
          X archive, Reddit export, Google Takeout, or photos.
        </Path>
      </div>
    </div>
  );
}
