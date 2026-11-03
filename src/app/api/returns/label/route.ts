import { type NextRequest, NextResponse } from "next/server";
import { getAccessToken, getConfig } from "@/lib/spree";

/**
 * Streams a prepaid return label to the customer who owns the return. The API
 * serves the file only to the order's owner — by session or by the order
 * token a guest's link carries — so the browser download goes through here
 * with those credentials attached rather than to the API directly.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order");
  const returnId = request.nextUrl.searchParams.get("return");
  const orderToken = request.nextUrl.searchParams.get("token");
  if (!orderId || !returnId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { baseUrl, publishableKey } = getConfig();
  const headers: Record<string, string> = { "X-Spree-Api-Key": publishableKey };
  const accessToken = await getAccessToken();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (orderToken) headers["X-Spree-Token"] = orderToken;

  const upstream = await fetch(
    `${baseUrl}/api/v3/store/orders/${encodeURIComponent(orderId)}/returns/${encodeURIComponent(returnId)}/label`,
    { headers, redirect: "follow", cache: "no-store" },
  );
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ??
        'attachment; filename="return-label.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
