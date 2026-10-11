import { API_BASE_URL, authToHeaders, backendAuth } from "@/lib/dal/backend";

/**
 * Upload proxy for export imports (write-paths D3/W2). The browser extracts the
 * allow-listed members client-side and POSTs them here as multipart form data; this
 * server route injects the caller's bearer/dev credential and streams the body to
 * the backend's `POST /v1/imports` unchanged — the token never reaches the client,
 * and the backend enforces consent, the size cap, and zip safety on its side.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const credential = await backendAuth();
  const authHeaders = authToHeaders(credential);

  // Fail closed: no Clerk session and no dev fallback ⇒ deny before touching the backend.
  if (!authHeaders.Authorization && !authHeaders["X-Dev-User-Id"]) {
    return new Response("Unauthorized", { status: 401 });
  }

  const headers: Record<string, string> = { ...authHeaders };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType; // keeps the multipart boundary
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/v1/imports`, {
      method: "POST",
      headers,
      body: request.body,
      // Node fetch requires half-duplex to stream a request body through.
      // @ts-expect-error -- duplex is missing from the lib.dom RequestInit type
      duplex: "half",
      cache: "no-store",
    });
  } catch {
    // Backend unreachable — a gateway error, no internals leaked.
    return new Response("Upload unavailable", { status: 502 });
  }

  // Pass the backend's verdict through (202 accepted, 4xx refusals, 501 stub era).
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
