import { API_BASE_URL, authToHeaders, backendAuth } from "@/lib/dal/backend";

/**
 * SSE proxy for run progress (state-and-polling decision (c)).
 *
 * The browser opens `EventSource('/api/runs/{id}/events')` (same-origin, no headers).
 * This server route injects the caller's bearer/dev credential and streams the backend's
 * `GET /v1/runs/{id}/events` through unchanged — so the token never reaches the client and
 * EventSource's no-custom-headers limitation is sidestepped. The client falls back to
 * polling `GET /v1/runs/{id}` (DAL `readRun`) if this stream drops.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache a live stream

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const credential = await backendAuth();
  const authHeaders = authToHeaders(credential);

  // Fail closed: no Clerk session and no dev fallback ⇒ deny before touching the backend.
  if (!authHeaders.Authorization && !authHeaders["X-Dev-User-Id"]) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/v1/runs/${encodeURIComponent(id)}/events`, {
      headers: { ...authHeaders, Accept: "text/event-stream" },
      cache: "no-store",
    });
  } catch {
    // Backend unreachable — fail with a gateway error, not a 500; leak no internals.
    return new Response("Run-events stream unavailable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Run-events stream unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // disable proxy buffering so events flush immediately
    },
  });
}
