import {
  ArrowRight,
  ArrowLeft,
  User,
  Link,
  Download,
  LogOut,
  Scan,
  Sun,
  Moon,
  Check,
  Inbox,
  WifiOff,
  RotateCw,
  ChevronRight,
  ShieldCheck,
  CircleAlert,
  TriangleAlert,
  OctagonAlert,
  CircleMinus,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated kebab-name → Lucide component map. Kept explicit (not the full Lucide set)
 * so the bundle stays tight and `IconName` is type-checked. Extend per screen as new
 * icons are needed.
 */
export const ICONS = {
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  user: User,
  link: Link,
  download: Download,
  "log-out": LogOut,
  scan: Scan,
  sun: Sun,
  moon: Moon,
  check: Check,
  inbox: Inbox,
  "wifi-off": WifiOff,
  "rotate-cw": RotateCw,
  "chevron-right": ChevronRight,
  "shield-check": ShieldCheck,
  "circle-alert": CircleAlert,
  "triangle-alert": TriangleAlert,
  "octagon-alert": OctagonAlert,
  "circle-minus": CircleMinus,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
