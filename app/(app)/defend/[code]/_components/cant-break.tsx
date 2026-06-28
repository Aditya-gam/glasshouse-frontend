import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LOADBEARING } from "@/lib/fixtures/defend";

/** Honest "can't break without losing meaning" outcome — the load-bearing detail. */
export function CantBreakResult({
  onRemove,
  onAccept,
}: {
  onRemove: () => void;
  onAccept: () => void;
}) {
  const lb = LOADBEARING;
  return (
    <div className="result">
      <span className="result-flag result-flag--blocked">
        <Icon name="circle-minus" size={14} /> No clean break found
      </span>
      <h2 className="result-head">No small edit breaks this without changing what you said</h2>
      <p className="result-body">
        The detail that pins your city is the same detail that makes the post worth posting.
        Generalizing it enough to fool an independent adversary would{" "}
        <b>change what you actually said</b> — so we won&rsquo;t pretend a light edit works here.
      </p>
      <div className="lb">
        <div className="lb-src">
          <Icon name="file-text" size={14} /> {lb.src} <span className="ev-date">· {lb.date}</span>
        </div>
        <p className="lb-text">
          The <mark>28</mark> is a tourist sardine can now — locals just take <mark>the 24</mark> up
          to <mark>Graça</mark>.
        </p>
        <p className="lb-note">
          The highlighted detail is load-bearing: it&rsquo;s both what reveals your city and what
          gives the post its meaning.
        </p>
      </div>
      <div className="paths-2">
        <div className="path2 path2--remove">
          <div className="path2-head">
            <span className="path2-ic">
              <Icon name="trash-2" size={17} />
            </span>
            <span className="path2-t">Remove the post</span>
          </div>
          <p className="path2-d">
            The only way to actually break this inference. You lose the post, but the city signal
            goes with it.
          </p>
          <Button onClick={onRemove}>
            <Icon name="copy" size={15} /> Copy removal list
          </Button>
        </div>
        <div className="path2 path2--accept">
          <div className="path2-head">
            <span className="path2-ic">
              <Icon name="shield-alert" size={17} />
            </span>
            <span className="path2-t">Accept residual exposure</span>
          </div>
          <div className="path2-residual">
            <span className="pr-num">{lb.after.toFixed(2)}</span>
            <span className="pr-ci">
              [{lb.afterLo.toFixed(2)}–{lb.afterHi.toFixed(2)}]
            </span>
          </div>
          <p className="path2-d">
            Keep the post as-is. Your city stays recoverable at this calibrated reliability —{" "}
            <b>an honest residual, not a safe state.</b>
          </p>
          <Button variant="secondary" onClick={onAccept}>
            Keep it &amp; understand the risk
          </Button>
        </div>
      </div>
    </div>
  );
}
