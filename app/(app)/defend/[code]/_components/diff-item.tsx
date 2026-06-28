import { Icon } from "@/components/ui/icon";
import type { DefendEdit } from "@/lib/fixtures/defend";

import { DiffText } from "./diff-text";

export function DiffItem({ edit }: { edit: DefendEdit }) {
  let actionKey: string;
  let actionLabel: string;
  let body: React.ReactNode;

  if (edit.remove) {
    actionKey = "remove";
    actionLabel = "Remove";
    body = <p className="diff-removed">{edit.original}</p>;
  } else if (edit.exif) {
    actionKey = "strip";
    actionLabel = "Strip GPS";
    body = (
      <div className="diff-exif">
        <Icon name="map-pin" size={16} /> Remove GPS metadata
        {edit.crop ? " and crop the identifying skyline" : ""}
      </div>
    );
  } else if (edit.decoy) {
    actionKey = "decoy";
    actionLabel = "Decoy";
    body = (
      <>
        <DiffText segs={edit.segs ?? []} />
        <div className="diff-falseflag">
          <Icon name="triangle-alert" size={14} /> This publishes a statement that isn&rsquo;t true.
        </div>
      </>
    );
  } else {
    actionKey = "edit";
    actionLabel = "Rewrite";
    body = <DiffText segs={edit.segs ?? []} />;
  }

  const isPhoto = Boolean(edit.exif) || /Photo/.test(edit.src);

  return (
    <div className="diff-item">
      <div className="diff-src">
        <Icon name={isPhoto ? "image" : "file-text"} size={14} />
        {edit.src} <span className="diff-date">· {edit.date}</span>
        <span className={`diff-action diff-action--${actionKey}`}>{actionLabel}</span>
      </div>
      {body}
      {edit.note && <p className="diff-note">{edit.note}</p>}
    </div>
  );
}
