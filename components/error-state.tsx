import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";

type ErrorStateProps = {
  /** Lucide icon name; defaults to a neutral alert glyph. */
  icon?: IconName;
  title: string;
  description: string;
  /**
   * Stable error id (Next's `digest`) for a support reference. Never pass the raw error
   * message — it can carry sensitive detail (privacy-by-design).
   */
  reference?: string;
  /** Action buttons/links. */
  children?: ReactNode;
};

/** Calm, full-page state for errors and not-found — advise-only, never alarmist, no PII. */
export function ErrorState({
  icon = "triangle-alert",
  title,
  description,
  reference,
  children,
}: Readonly<ErrorStateProps>) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-24"
    >
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-2 text-center">
          <div
            className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            <Icon name={icon} size={22} />
          </div>
          <div className="space-y-1">
            <h1 className="font-heading text-lg font-medium">{title}</h1>
            <p className="text-pretty text-sm text-muted-foreground">{description}</p>
          </div>
          {children ? (
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{children}</div>
          ) : null}
          {reference ? (
            <p className="text-xs text-muted-foreground">
              Reference <code className="font-mono">{reference}</code>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
