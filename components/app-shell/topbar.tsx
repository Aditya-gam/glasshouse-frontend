"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

import { AccountMenu } from "./account-menu";
import { useLens } from "./use-lens";
import { PersonaLens } from "./persona-lens";
import { ThemeToggle } from "./theme-toggle";

import "./app-shell.css";

interface TopbarProps {
  /** Slot between brand and the right cluster (run-status pill, breadcrumb, steps). */
  center?: ReactNode;
  showLens?: boolean;
  showBack?: boolean;
}

/** The shared top bar, identical across authenticated screens. */
export function Topbar({ center = null, showLens = true, showBack = true }: TopbarProps) {
  const router = useRouter();
  const { lens, setLens } = useLens();

  return (
    <header className="topbar">
      {showBack && (
        <button
          type="button"
          className="topbar-back"
          onClick={() => router.back()}
          aria-label="Go back"
        >
          <Icon name="arrow-left" size={16} /> <span className="topbar-back-label">Back</span>
        </button>
      )}
      <Link className="brand brand-link" href="/dashboard" aria-label="Glasshouse — dashboard">
        <span className="brand-mark">
          <Icon name="scan" size={18} />
        </span>
        <span className="brand-text">
          <span className="brand-name">Glasshouse</span>
        </span>
      </Link>
      {center}
      <div className="topbar-right">
        {showLens && <PersonaLens value={lens} onChange={setLens} />}
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
