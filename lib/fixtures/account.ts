import type { IconName } from "@/lib/icons";

export interface ConnectedAccount {
  id: string;
  icon: IconName;
  name: string;
  handle: string;
  date: string;
}

export const CONNECTED_ACCOUNTS: ConnectedAccount[] = [
  {
    id: "reddit",
    icon: "message-square",
    name: "Reddit",
    handle: "u/marta",
    date: "Connected 26 Jun 2026",
  },
  {
    id: "mastodon",
    icon: "at-sign",
    name: "Mastodon",
    handle: "@marta@mas.to",
    date: "Connected 26 Jun 2026",
  },
];

export interface SafetyResource {
  icon: IconName;
  name: string;
  desc: string;
}

export const SAFETY_RESOURCES: SafetyResource[] = [
  {
    icon: "shield",
    name: "Digital-safety guide",
    desc: "Harden your accounts, devices, and footprint — step by step.",
  },
  {
    icon: "life-buoy",
    name: "Doxxing response checklist",
    desc: "What to do right now if your address or identity is exposed.",
  },
  {
    icon: "message-square",
    name: "Crisis & DV support line",
    desc: "Confidential help, 24/7. Region-aware where possible.",
  },
];
