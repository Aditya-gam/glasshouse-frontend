"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/** next-themes wrapper — handles `.dark` class toggling, persistence, and system sync
 *  with no flash-of-incorrect-theme (it injects a pre-paint script). */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
