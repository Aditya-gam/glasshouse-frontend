import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Source } from "@/lib/fixtures/sources";

interface SourceCardProps {
  src: Source;
  imported: boolean;
  busy: boolean;
  onConnect: (src: Source) => void;
}

export function SourceCard({ src, imported, busy, onConnect }: SourceCardProps) {
  return (
    <div className="src">
      <div className="src-ic">
        <Icon name={src.icon} size={20} />
      </div>
      <div className="src-body">
        <div className="src-name-row">
          <span className="src-name">{src.name}</span>
          <span className="src-tag">Read-only</span>
        </div>
        <p className="src-desc">{src.desc}</p>
        {imported ? (
          <span className="src-done">
            <Icon name="check" size={15} stroke={2.5} /> Connected
          </span>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => onConnect(src)}>
            <Icon name="link" size={14} /> Connect
          </Button>
        )}
      </div>
    </div>
  );
}
