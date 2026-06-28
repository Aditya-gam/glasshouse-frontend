import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "@/lib/mocks/node";

// jsdom doesn't implement matchMedia; components that read it (e.g. the run hook's
// prefers-reduced-motion check) need a stub. Defaults to "no match".
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// a11y assertions read `(await axe(container)).violations` directly (no custom matcher).

// MSW lifecycle. `error` on unhandled requests keeps tests deterministic — any real
// network call (or a missing handler) fails loudly instead of hitting the wire.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  // `cleanup` touches the DOM — skip it in the node-env DAL tests (no document).
  if (typeof document !== "undefined") cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
