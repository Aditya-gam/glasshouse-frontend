import { Icon } from "@/components/ui/icon";
import type { DefendOption, DefendTarget } from "@/lib/fixtures/defend";

/** The headline: the value-recovery flip (proven by an independent adversary) + the
 *  calibrated magnitude with intervals. */
export function Hero({ opt, target }: { opt: DefendOption; target: DefendTarget }) {
  const decoy = opt.key === "decoy";
  const drop = target.before - opt.after;
  return (
    <div className="hero">
      <div className="recovery">
        <div className="recov-head">
          {decoy ? (
            <>
              An independent adversary is now <b>misled to the wrong city</b> — not where you
              actually live.
            </>
          ) : (
            <>
              An independent adversary can <b>no longer recover your city</b>.
            </>
          )}
        </div>
        <div className="recov-flow">
          <span className="recov-pill recov-before">
            recovered <span className="recov-val">{target.value}</span>
          </span>
          <Icon name="arrow-right" className="recov-arrow" size={18} />
          {decoy ? (
            <span className="recov-pill recov-decoy">
              <Icon name="triangle-alert" size={14} /> guesses {opt.misled} — false
            </span>
          ) : (
            <span className="recov-pill recov-after">
              <Icon name="shield-check" size={14} /> not recovered
            </span>
          )}
        </div>
      </div>

      <div className="magnitude">
        <div className="mag-num mag-before">
          <span className="mag-big">{target.before.toFixed(2)}</span>
          <span className="mag-ci">
            [{target.beforeLo.toFixed(2)}–{target.beforeHi.toFixed(2)}]
          </span>
          <span className="mag-cap">calibrated reliability before</span>
        </div>
        <div className="mag-arrow">
          <Icon name="arrow-right" size={22} />
          <span className="mag-drop">−{drop.toFixed(2)}</span>
        </div>
        <div className="mag-num mag-after">
          <span className="mag-big">{opt.after.toFixed(2)}</span>
          <span className="mag-ci">
            [{opt.lo.toFixed(2)}–{opt.hi.toFixed(2)}]
          </span>
          <span className="mag-cap">
            {decoy ? "reliability on your true city" : "after this fix"}
          </span>
        </div>
      </div>

      <div className="hero-proof">
        <span className="proof-badge">
          <Icon name="shield-check" size={13} /> Proven by an independent adversary
        </span>
        <span className="proof-badge proof-badge--muted">
          <Icon name="check" size={13} /> Beats run-to-run noise
        </span>
        <span className="proof-note">
          A <b>different</b> model re-attacked the edited content, blind to the change — not the
          rewriter scoring itself. The value-recovery flip is the safety signal; the calibrated
          drop, with intervals, is the magnitude.
        </span>
      </div>
    </div>
  );
}
