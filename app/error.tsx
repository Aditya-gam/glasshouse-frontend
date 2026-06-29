"use client";

import Link from "next/link";

import { ErrorState } from "@/components/error-state";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Route-segment error boundary — catches render errors in any route under app/. Calm,
 * advise-only UI; surfaces only the error `digest` for support, never the raw message.
 */
export default function Error({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ErrorState
      icon="triangle-alert"
      title="Something went wrong"
      description="An unexpected error interrupted this page. Your data is safe — you can retry, or return home."
      reference={error.digest}
    >
      <Button onClick={reset}>Try again</Button>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Return home
      </Link>
    </ErrorState>
  );
}
