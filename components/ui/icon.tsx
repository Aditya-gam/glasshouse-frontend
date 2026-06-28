import type { CSSProperties } from "react";

import { ICONS, type IconName } from "@/lib/icons";

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Thin Lucide wrapper mirroring the prototype's `Icon` API. Decorative by default
 * (`aria-hidden`) — meaning is carried by adjacent text, never color/icon alone.
 */
export function Icon({ name, size = 18, stroke = 2, className, style }: Readonly<IconProps>) {
  const LucideGlyph = ICONS[name];
  return (
    <LucideGlyph size={size} strokeWidth={stroke} className={className} style={style} aria-hidden />
  );
}
