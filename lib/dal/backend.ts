import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { Problem } from "@/lib/api";
import { client } from "@/lib/api/client.gen";

/**
 * Server-only backend access layer. The ONLY place that reads the API base URL and
 * resolves the caller's credentials; Server Components / route handlers call through
 * here so no token or base URL leaks into the client bundle (frontend.md DAL rule).
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const DEV_USER_ID = process.env.DEV_USER_ID;

// Point the generated client at the backend once — the base URL is static config.
client.setConfig({ baseUrl: BASE_URL });

/** Backend base URL (server-only; used by the SSE proxy's direct fetch). */
export const API_BASE_URL = BASE_URL;

export interface BackendAuth {
  /** Clerk session JWT for `Authorization: Bearer` (preferred). */
  token?: string;
  /** Dev-only `X-Dev-User-Id` fallback before real sign-in→user-sync exists. */
  devUserId?: string;
}

/**
 * Resolve per-request backend auth. The Clerk JWT is fetched FRESH each call (~60s TTL —
 * never cache). Falls back to the dev-only `X-Dev-User-Id`. Fail-closed: returns empty
 * when neither is available, so the backend denies.
 */
export async function backendAuth(): Promise<BackendAuth> {
  const { getToken } = await auth();
  const token = await getToken();
  if (token) return { token };
  if (DEV_USER_ID) return { devUserId: DEV_USER_ID };
  return {};
}

/** Raw HTTP auth headers — for the SSE proxy's direct fetch (SDK calls use `auth`). */
export function authToHeaders({ token, devUserId }: BackendAuth): Record<string, string> {
  if (token) return { Authorization: `Bearer ${token}` };
  if (devUserId) return { "X-Dev-User-Id": devUserId };
  return {};
}

/** RFC 9457 problem+json surfaced as a typed error; never leaks internals to the client. */
export class BackendError extends Error {
  readonly status: number;
  readonly problem?: Problem;

  constructor(status: number, problem?: Problem) {
    super(problem?.detail ?? problem?.title ?? `Backend request failed (${status})`);
    this.name = "BackendError";
    this.status = status;
    this.problem = problem;
  }
}

/** Map a hey-api `{ error, response }` failure into a BackendError. */
export function toBackendError(error: unknown, response?: Response): BackendError {
  const status = response?.status ?? 0;
  const problem =
    error && typeof error === "object" && "title" in error ? (error as Problem) : undefined;
  return new BackendError(status, problem);
}
