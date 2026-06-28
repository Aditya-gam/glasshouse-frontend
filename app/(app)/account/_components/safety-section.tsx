"use client";

import { Icon } from "@/components/ui/icon";
import { SAFETY_RESOURCES } from "@/lib/fixtures/account";

/** Curated digital-safety + crisis resources. `emphasized` promotes it to the top
 *  under the at-risk lens (ethics-and-tone.md). Pointers, not advice. */
export function SafetySection({ emphasized = false }: Readonly<{ emphasized?: boolean }>) {
  return (
    <>
      <div className="sec-head">
        <span className="sec-head-ic">
          <Icon name="life-buoy" size={17} />
        </span>
        <h2>Safety resources</h2>
      </div>
      <p className="sec-desc">
        Curated digital-safety and crisis support. These are pointers, not advice — and never
        replace professional help.
      </p>
      <div className="sec-card">
        {emphasized && (
          <div className="safety-intro">
            <Icon name="shield" size={16} />
            <span>
              Surfaced for you because safety matters most in your situation. Take what&rsquo;s
              useful; ignore the rest.
            </span>
          </div>
        )}
        {SAFETY_RESOURCES.map((r) => (
          <a className="res-row" key={r.name} href="#" onClick={(e) => e.preventDefault()}>
            <span className="res-ic">
              <Icon name={r.icon} size={17} />
            </span>
            <div className="res-body">
              <div className="res-name">{r.name}</div>
              <div className="res-desc">{r.desc}</div>
            </div>
            <Icon name="external-link" size={16} />
          </a>
        ))}
        <div className="safety-foot">
          Region-aware where possible. If you&rsquo;re in immediate danger, contact your local
          emergency number.
        </div>
      </div>
    </>
  );
}
