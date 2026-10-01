"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Moves focus to the first content heading on client-side route change (Next doesn't
 * do this automatically) — so keyboard/screen-reader users land on the new page's
 * heading, not back at the top of the document. Skips the initial load.
 */
export function RouteFocus() {
  const pathname = usePathname();
  // Track the last-seen pathname instead of a first-render flag: StrictMode (and Next 16.3's
  // dev effect replay) re-runs mount effects, which defeated a boolean guard and stole initial
  // focus from the top of the document (breaking the skip link's first-Tab position).
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const changed = previous.current !== null && previous.current !== pathname;
    previous.current = pathname;
    if (!changed) return;
    const heading = document.querySelector<HTMLElement>("h1, h2, h3");
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus();
  }, [pathname]);

  return null;
}
