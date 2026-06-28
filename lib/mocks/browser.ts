import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

/** Browser worker for client-side mocking (started behind a dev flag in M5.4). */
export const worker = setupWorker(...handlers);
