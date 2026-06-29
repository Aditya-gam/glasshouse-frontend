import Link from "next/link";

import { ErrorState } from "@/components/error-state";
import { buttonVariants } from "@/components/ui/button";

/** Custom 404 — replaces Next's default not-found page. */
export default function NotFound() {
  return (
    <ErrorState
      icon="circle-alert"
      title="Page not found"
      description="That page doesn't exist or may have moved. Check the address, or return home."
    >
      <Link href="/" className={buttonVariants()}>
        Return home
      </Link>
    </ErrorState>
  );
}
