"use client";

import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";

import "./globals.css";

/**
 * Last-resort boundary for errors thrown by the root layout itself (production only).
 * It replaces the entire document, so it must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorState
          icon="triangle-alert"
          title="Something went wrong"
          description="The application ran into an unexpected problem. Your data is safe. Please try again."
          reference={error.digest}
        >
          <Button onClick={reset}>Try again</Button>
        </ErrorState>
      </body>
    </html>
  );
}
