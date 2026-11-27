import { NextResponse } from "next/server";
import { getConfig } from "@/lib/spree";

/**
 * The store's Universal Commerce Protocol profile, at the path an AI shopping
 * agent looks for on the merchant's own domain. Spree builds it; it names the
 * store's MCP endpoint and the shopping capabilities that endpoint offers.
 */
export async function GET(): Promise<NextResponse> {
  const { baseUrl, publishableKey } = getConfig();

  try {
    const response = await fetch(`${baseUrl}/api/v3/store/ucp_profile`, {
      headers: { "X-Spree-API-Key": publishableKey },
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "UCP profile unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { error: "UCP profile unavailable" },
      { status: 503 },
    );
  }
}
