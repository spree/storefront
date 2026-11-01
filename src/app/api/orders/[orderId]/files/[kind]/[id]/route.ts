import { type NextRequest, NextResponse } from "next/server";
import { getAuthOptions, getConfig } from "@/lib/spree";

const KINDS = new Set(["invoices", "documents"]);

/**
 * Streams an invoice or order document to the signed-in customer. The Store
 * API serves these files only to whoever owns the order, so the request is
 * made here with the customer's session rather than linked from the browser.
 */
export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ orderId: string; kind: string; id: string }> },
) {
  const { orderId, kind, id } = await params;
  if (!KINDS.has(kind)) return new NextResponse(null, { status: 404 });

  const { token } = await getAuthOptions();
  if (!token) return new NextResponse(null, { status: 401 });

  const { baseUrl, publishableKey } = getConfig();
  const path = `/api/v3/store/orders/${encodeURIComponent(orderId)}/${kind}/${encodeURIComponent(id)}/download`;
  const upstream = await fetch(new URL(path, baseUrl), {
    headers: {
      "X-Spree-Api-Key": publishableKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: upstream.status || 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition":
        upstream.headers.get("Content-Disposition") ?? "attachment",
      "Cache-Control": "private, no-store",
    },
  });
}
