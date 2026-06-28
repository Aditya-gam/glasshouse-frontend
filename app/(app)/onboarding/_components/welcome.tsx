import type { RefObject } from "react";

import { Pillar } from "./pillar";

interface WelcomeProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
}

export function Welcome({ headingRef }: WelcomeProps) {
  return (
    <div className="step-anim">
      <p className="eyebrow">Privacy self-audit</p>
      <h1 className="step-title" ref={headingRef} tabIndex={-1}>
        A private audit of your own footprint
      </h1>
      <p className="lede">
        See what an AI can infer about you from data you already control — then reduce what&rsquo;s
        exposed, and measure the drop. You&rsquo;re auditing yourself. Nothing is shared, and
        nothing runs until you consent.
      </p>
      <div className="pillars">
        <Pillar step="01" title="Attack" icon="crosshair">
          We run the same inference an adversary could — only on your own posts, photos, and
          profiles.
        </Pillar>
        <Pillar step="02" title="Measure" icon="gauge">
          Each finding gets a calibrated reliability band — honest about what the model can&rsquo;t
          tell.
        </Pillar>
        <Pillar step="03" title="Defend" icon="shield">
          We help you break the strongest inferences, then prove the exposure actually dropped.
        </Pillar>
      </div>
      <p className="reassure">Your data only · encrypted · advise-only · erase anytime</p>
    </div>
  );
}
