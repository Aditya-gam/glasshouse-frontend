"use client";

import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Light/dark toggle. The icon is driven by the `.dark` class via CSS (no mounted
 * flag, so no hydration mismatch and no setState-in-effect).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle light or dark theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Icon name="moon" size={18} className="dark:hidden" />
      <Icon name="sun" size={18} className="hidden dark:block" />
    </Button>
  );
}
