import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/** Node server for mocking in Vitest (M5.6). */
export const server = setupServer(...handlers);
