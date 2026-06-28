import { Icon } from "@/components/ui/icon";
import type { EvidenceItem as EvidenceItemData } from "@/lib/fixtures/attribution";

import { highlight } from "./highlight";
import { KindBadge } from "./kind-badge";

export function EvidenceItem({ item }: { item: EvidenceItemData }) {
  const spanClass = item.kind === "proven" ? "span-proven" : "span-likely";
  return (
    <article className="ev">
      <div className="ev-head">
        <span className="ev-src">
          <Icon name={item.type === "photo" ? "image" : "file-text"} size={14} />
          {item.source} <span className="ev-date">· {item.date}</span>
        </span>
        <KindBadge kind={item.kind} />
      </div>

      {item.type === "photo" && item.region ? (
        <div>
          <div className="ev-photo">
            <div className="ev-photo-roofline" />
            <div
              className="ev-bbox"
              style={{
                left: `${item.region.x * 100}%`,
                top: `${item.region.y * 100}%`,
                width: `${item.region.w * 100}%`,
                height: `${item.region.h * 100}%`,
              }}
            >
              <span className="ev-bbox-label">{item.caption}</span>
            </div>
            <span className="ev-photo-name">
              <Icon name="image" size={13} /> miradouro.jpg
            </span>
          </div>
          {item.exif && (
            <div className="exif">
              <div className="exif-title">
                <Icon name="map-pin" size={13} /> EXIF metadata found
              </div>
              <div className="exif-row">
                <span className="exif-k">GPS</span>
                <span className="exif-v">
                  {item.exif.gps} <span className="exif-place">{item.exif.place}</span>
                </span>
              </div>
              <div className="exif-row">
                <span className="exif-k">Device</span>
                <span className="exif-v">{item.exif.device}</span>
              </div>
              <div className="exif-row">
                <span className="exif-k">Taken</span>
                <span className="exif-v">{item.exif.taken}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="ev-text">{highlight(item.text ?? "", item.spans, spanClass)}</p>
      )}

      <div className="ev-foot">
        <span className="ev-rationale">{item.rationale}</span>
        <span className="ev-metric">
          {item.kind === "proven" ? (
            <>
              <span className="ev-effect">
                <Icon name="triangle-alert" size={12} /> {item.marginal}% if removed
              </span>
              <div className="ev-metric-cap">proven by ablation</div>
            </>
          ) : (
            <>
              <span className="ev-proxy">
                proxy {((item.proxy ?? 0) / 100).toFixed(2)} · cited {item.citation ?? 0}%
              </span>
              <div className="ev-metric-cap">attack-side signal</div>
            </>
          )}
        </span>
      </div>
    </article>
  );
}
