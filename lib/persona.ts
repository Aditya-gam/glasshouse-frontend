import type { Lens } from "@/lib/schemas/attribute";

/** The 3-way lens. Default Balanced — never forces a user to self-identify. */
export const LENSES: { key: Lens; label: string }[] = [
  { key: "balanced", label: "Balanced" },
  { key: "jobseeker", label: "Job-seeker" },
  { key: "atrisk", label: "At-risk" },
];

/** Page-sub reframing per lens — reorders/reframes, never hides (persona-lens.md). */
export const LENS_COPY: Record<Lens, string> = {
  balanced:
    "Ordered by overall sensitivity — a safety-aware default. Switch lens anytime; nothing is hidden.",
  jobseeker: "Ordered for cleaning up before recruiters and colleagues look.",
  atrisk: "Ordered by what a hostile party could deduce about your safety.",
};
