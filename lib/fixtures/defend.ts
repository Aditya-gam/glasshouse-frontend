import type { Lens } from "@/lib/schemas/attribute";

/** insf = inserted FALSEHOOD (decoy). */
export type DiffSeg = { t: "eq" | "del" | "ins" | "insf"; v: string };

export interface DefendEdit {
  src: string;
  date: string;
  segs?: DiffSeg[];
  remove?: boolean;
  original?: string;
  exif?: boolean;
  crop?: boolean;
  decoy?: boolean;
  note?: string;
}

export type DefendOptionKey = "minimal" | "stronger" | "remove" | "decoy";

export interface DefendOption {
  key: DefendOptionKey;
  name: string;
  desc: string;
  truthful: boolean;
  recommended?: boolean;
  optIn?: boolean;
  remove?: boolean;
  /** 0..1 calibrated after-value + interval (from the noise floor). */
  after: number;
  lo: number;
  hi: number;
  recovered: boolean;
  /** decoy: the wrong city the adversary now guesses. */
  misled?: string;
  /** 0..100; 0 = content removed; null = publishes a falsehood. */
  utility: number | null;
  utilityLabel: string;
  edits: DefendEdit[];
}

export interface DefendTarget {
  attribute: string;
  value: string;
  before: number;
  beforeLo: number;
  beforeHi: number;
}

/** "within noise" honest state — overlapping before/after intervals. */
export interface NoiseResult {
  before: number;
  beforeLo: number;
  beforeHi: number;
  after: number;
  afterLo: number;
  afterHi: number;
}

/** "can't break" honest state — the load-bearing detail. */
export interface LoadBearing {
  src: string;
  date: string;
  before: string;
  after: number;
  afterLo: number;
  afterHi: number;
}

export const TARGET: DefendTarget = {
  attribute: "Current location",
  value: "Lisbon",
  before: 0.86,
  beforeLo: 0.81,
  beforeHi: 0.9,
};

const seg = (t: DiffSeg["t"], v: string): DiffSeg => ({ t, v });

export const OPTIONS: DefendOption[] = [
  {
    key: "minimal",
    name: "Minimal generalization",
    recommended: true,
    truthful: true,
    after: 0.21,
    lo: 0.16,
    hi: 0.27,
    recovered: false,
    utility: 91,
    utilityLabel: "Keeps your voice",
    desc: "Generalize only the cues that pin you — tram lines, the district, the exact time. Your posts still sound like you.",
    edits: [
      {
        src: "Mastodon · @marta",
        date: "9 Mar",
        segs: [
          seg("eq", "The "),
          seg("del", "28"),
          seg("ins", "tram"),
          seg("eq", " is a tourist sardine can now — locals just take "),
          seg("del", "the 24"),
          seg("ins", "the quieter line"),
          seg("eq", " up to "),
          seg("del", "Graça"),
          seg("ins", "the hill"),
          seg("eq", "."),
        ],
      },
      {
        src: "Mastodon · @marta",
        date: "28 Feb",
        segs: [
          seg("eq", "Voting reminder for everyone in my "),
          seg("del", "freguesia 🇵🇹"),
          seg("ins", "area"),
          seg("eq", " — polls close "),
          seg("del", "at 19h"),
          seg("ins", "this evening"),
          seg("eq", "."),
        ],
      },
      {
        src: "Photo · miradouro.jpg",
        date: "14 Mar",
        exif: true,
        note: "GPS coordinates removed. The skyline still hints at the city — crop or blur it for more.",
      },
    ],
  },
  {
    key: "stronger",
    name: "Stronger generalization",
    truthful: true,
    after: 0.14,
    lo: 0.1,
    hi: 0.19,
    recovered: false,
    utility: 78,
    utilityLabel: "More abstract",
    desc: "Replace the local detail entirely. Lower exposure, but the posts lose some texture.",
    edits: [
      {
        src: "Mastodon · @marta",
        date: "9 Mar",
        segs: [
          seg("eq", "The "),
          seg("del", "28 is a tourist sardine can now — locals just take the 24 up to Graça"),
          seg("ins", "trams are packed with tourists now — locals know the quieter ways around"),
          seg("eq", "."),
        ],
      },
      {
        src: "Mastodon · @marta",
        date: "28 Feb",
        segs: [
          seg("del", "Voting reminder for everyone in my freguesia 🇵🇹 — polls close at 19h."),
          seg("ins", "Reminder to everyone eligible: don't forget to vote today."),
        ],
      },
      {
        src: "Photo · miradouro.jpg",
        date: "14 Mar",
        exif: true,
        crop: true,
        note: "GPS removed and the identifying skyline region cropped out.",
      },
    ],
  },
  {
    key: "remove",
    name: "Remove the posts",
    truthful: true,
    remove: true,
    after: 0.09,
    lo: 0.05,
    hi: 0.13,
    recovered: false,
    utility: 0,
    utilityLabel: "Content removed",
    desc: "Delete the revealing items entirely. Maximum truthful privacy — but you lose the posts and the photo.",
    edits: [
      {
        src: "Mastodon · @marta",
        date: "9 Mar",
        remove: true,
        original: "The 28 is a tourist sardine can now — locals just take the 24 up to Graça.",
      },
      {
        src: "Mastodon · @marta",
        date: "28 Feb",
        remove: true,
        original: "Voting reminder for everyone in my freguesia 🇵🇹 — polls close at 19h.",
      },
      {
        src: "Photo · miradouro.jpg",
        date: "14 Mar",
        remove: true,
        original: "Sunset photo with GPS in Alfama.",
      },
    ],
  },
  {
    key: "decoy",
    name: "Decoy",
    optIn: true,
    truthful: false,
    after: 0.05,
    lo: 0.02,
    hi: 0.09,
    recovered: false,
    misled: "Madrid",
    utility: null,
    utilityLabel: "Publishes a falsehood",
    desc: "Inject a misleading cue so the adversary confidently guesses the wrong city. Maximum privacy, at the cost of publishing something untrue.",
    edits: [
      {
        src: "Suggested new reply",
        date: "draft",
        decoy: true,
        segs: [
          seg("eq", "Loving the change of scenery — "),
          seg("insf", "settling into Madrid for a few weeks"),
          seg("eq", "."),
        ],
      },
    ],
  },
];

/** Persona-specific decoy backfire warnings (ethics-and-tone.md). */
export const DECOY_BACKFIRE: Record<Lens, string> = {
  balanced:
    "It can backfire: you could be caught misrepresenting yourself, and in safety-critical situations a false alibi can be dangerous if it's exposed.",
  jobseeker:
    "If you're caught misrepresenting yourself, it can damage your reputation — the opposite of what you came here for.",
  atrisk:
    "A false alibi can be dangerous if it's exposed, and it can create a false sense of security. Truthful options are safer for you.",
};

/** Honest "within noise" outcome — before/after calibrated intervals overlap. */
export const NOISE: NoiseResult = {
  before: 0.86,
  beforeLo: 0.81,
  beforeHi: 0.9,
  after: 0.79,
  afterLo: 0.73,
  afterHi: 0.86,
};

/** The post whose identifying detail is load-bearing (can't-break). */
export const LOADBEARING: LoadBearing = {
  src: "Mastodon · @marta",
  date: "9 Mar",
  before: "the 24",
  after: 0.71,
  afterLo: 0.64,
  afterHi: 0.78,
};
