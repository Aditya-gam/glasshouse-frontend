import type { IconName } from "@/lib/icons";

export type SourceKind = "oauth" | "upload";

/** A footprint source the user can import (read-only OAuth or an export upload).
 *  Local UI constants (HANDOFF §3 — not a backend DTO); `kept`/`dropped` are
 *  illustrative kept-vs-third-party counts. */
export interface Source {
  id: string;
  name: string;
  icon: IconName;
  kind: SourceKind;
  kept: number;
  dropped: number;
  desc: string;
}

export const OAUTH_SOURCES: Source[] = [
  {
    id: "reddit",
    name: "Reddit",
    icon: "message-square",
    kind: "oauth",
    kept: 84,
    dropped: 22,
    desc: "Import your posts and comments. Read-only — we can never post, vote, or delete.",
  },
  {
    id: "mastodon",
    name: "Mastodon",
    icon: "at-sign",
    kind: "oauth",
    kept: 61,
    dropped: 18,
    desc: "Connect your instance, read-only. Your toots and replies only.",
  },
];

export const UPLOAD_SOURCES: Source[] = [
  {
    id: "x",
    name: "X archive",
    icon: "archive",
    kind: "upload",
    kept: 203,
    dropped: 57,
    desc: "X (Twitter) export",
  },
  {
    id: "reddit-export",
    name: "Reddit export",
    icon: "archive",
    kind: "upload",
    kept: 84,
    dropped: 22,
    desc: "Reddit GDPR export",
  },
  {
    id: "takeout",
    name: "Google Takeout",
    icon: "package",
    kind: "upload",
    kept: 140,
    dropped: 30,
    desc: "Photos, places & more",
  },
  {
    id: "photos",
    name: "Photos",
    icon: "image",
    kind: "upload",
    kept: 48,
    dropped: 6,
    desc: "Images with EXIF",
  },
];

export const ALL_SOURCES: Source[] = [...OAUTH_SOURCES, ...UPLOAD_SOURCES];
