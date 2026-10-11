import { API_BASE_URL, authToHeaders, backendAuth } from "@/lib/dal/backend";

/**
 * Download proxy for the DSAR export bundle (write-paths W5/F3).
 *
 * The browser follows a same-origin link to `/api/export/{runId}`; this server route
 * injects the caller's bearer/dev credential and streams the backend's owner-only,
 * expiring `GET /v1/account/export/{run_id}` through unchanged — the token never
 * reaches the client, and the backend re-checks ownership and expiry on its side.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // an expiring, owner-only download — never cache

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const credential = await backendAuth();
  const authHeaders = authToHeaders(credential);

  // Fail closed: no Clerk session and no dev fallback ⇒ deny before touching the backend.
  if (!authHeaders.Authorization && !authHeaders["X-Dev-User-Id"]) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { runId } = await params;
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/v1/account/export/${encodeURIComponent(runId)}`, {
      headers: authHeaders,
      cache: "no-store",
    });
  } catch {
    // Backend unreachable — a gateway error, no internals leaked.
    return new Response("Export download unavailable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    // Pass the meaningful denials through (expired link, not the owner, not ready).
    const status = [401, 403, 404, 410].includes(upstream.status) ? upstream.status : 502;
    return new Response("Export download unavailable", { status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition":
        upstream.headers.get("Content-Disposition") ?? "attachment; filename=glasshouse-export",
      "Cache-Control": "no-store",
    },
  });
}
