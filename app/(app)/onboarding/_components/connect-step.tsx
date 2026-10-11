import type { ReactNode, RefObject } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";

/** What the grant action actually RECORDED — the receipt renders only this. */
export interface RecordedConsent {
  /** False = stub-era demo acknowledgement: nothing was stored anywhere. */
  live: boolean;
  art9Granted: boolean;
  /** The optional Art. 9 grant failed after the required grant succeeded. */
  art9Error: boolean;
  /** Grant time (the backend's record when live; the client clock in demo mode). */
  at: number;
}

interface ConnectStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  recorded: RecordedConsent;
}

function fmt(ts: number): string {
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

export function ConnectStep({ headingRef, recorded }: ConnectStepProps) {
  let art9Line: ReactNode;
  if (recorded.art9Error) {
    art9Line = (
      <>
        <Icon name="circle-minus" size={14} stroke={2.5} /> Article 9 — we couldn&rsquo;t record the
        optional consent; grant it later in Account
      </>
    );
  } else if (recorded.art9Granted) {
    art9Line = (
      <>
        <Icon name="check" size={14} stroke={2.5} /> Article 9 — explicit consent
      </>
    );
  } else {
    art9Line = (
      <>
        <Icon name="circle-minus" size={14} stroke={2.5} /> Article 9 — declined; special-category
        findings stay sealed
      </>
    );
  }

  return (
    <div className="step-anim">
      <p className="eyebrow">You&rsquo;re set</p>
      <h1 className="step-title" ref={headingRef} tabIndex={-1}>
        Let&rsquo;s bring in your footprint
      </h1>
      <p className="lede">
        {recorded.live ? "Consent recorded." : "Consent acknowledged."} Next, connect a read-only
        account or upload an export. We keep only your own items and drop anything about other
        people.
      </p>
      <div className="recorded">
        <div className="recorded-head">
          <span className="recorded-ic">
            <Icon name="check" size={13} stroke={3} />
          </span>
          <span>{recorded.live ? "Consent recorded" : "Consent acknowledged — demo"}</span>
          <span className="recorded-time">{fmt(recorded.at)}</span>
        </div>
        {!recorded.live && (
          <p className="recorded-demo-note">
            The backend isn&rsquo;t connected yet, so nothing was stored — you&rsquo;ll be asked
            again once it is.
          </p>
        )}
        <ul className="recorded-list">
          <li>
            <Icon name="check" size={14} stroke={2.5} /> Self-audit purpose
          </li>
          <li>{art9Line}</li>
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
