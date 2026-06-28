"use client";

import { useRef, type KeyboardEvent } from "react";

import { LENSES } from "@/lib/persona";
import type { Lens } from "@/lib/schemas/attribute";

import "./app-shell.css";

interface PersonaLensProps {
  value: Lens;
  onChange: (lens: Lens) => void;
}

/** Accessible radiogroup with roving tabIndex + arrow-key navigation. */
export function PersonaLens({ value, onChange }: PersonaLensProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = LENSES.findIndex((l) => l.key === value);
    const next =
      e.key === "ArrowRight" ? (i + 1) % LENSES.length : (i - 1 + LENSES.length) % LENSES.length;
    onChange(LENSES[next].key);
    ref.current?.querySelectorAll<HTMLButtonElement>(".seg-btn")[next]?.focus();
  }

  return (
    <div className="seg" role="radiogroup" aria-label="Persona lens" ref={ref} onKeyDown={onKey}>
      {LENSES.map((l) => {
        const active = value === l.key;
        return (
          <button
            key={l.key}
            type="button"
            className={"seg-btn" + (active ? " seg-btn--active" : "")}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(l.key)}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
