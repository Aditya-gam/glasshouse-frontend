"use client";

import { useSyncExternalStore } from "react";

import { lensSchema, type Lens } from "@/lib/schemas/attribute";

const STORAGE_KEY = "glasshouse_lens";
const listeners = new Set<() => void>();
let current: Lens | null = null;

/** Reads the persisted lens once, then serves the cached value. */
function load(): Lens {
  if (current !== null) return current;
  try {
    const parsed = lensSchema.safeParse(localStorage.getItem(STORAGE_KEY));
    current = parsed.success ? parsed.data : "balanced";
  } catch {
    current = "balanced";
  }
  return current;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * The persona lens, shared app-wide via an external store (no provider needed).
 * Default Balanced (never forces self-identification); persisted to localStorage.
 * SSR renders Balanced; `useSyncExternalStore` reconciles to the stored value on the
 * client with no hydration warning.
 */
export function useLens(): { lens: Lens; setLens: (lens: Lens) => void } {
  const lens = useSyncExternalStore(subscribe, load, () => "balanced" as Lens);

  function setLens(next: Lens): void {
    current = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode); the lens still works in-session.
    }
    listeners.forEach((notify) => notify());
  }

  return { lens, setLens };
}
