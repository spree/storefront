import { NextResponse } from "next/server";
import { setAccessToken, setRefreshToken } from "@/lib/spree/cookies";

function reviewE2eBootstrapAllowed(request: Request): boolean {
  if (process.env.SPREE_REVIEW_E2E !== "1") return false;
  // Explicit opt-in only in lab Playwright configs — never set on public production hosts.
  if (process.env.SPREE_E2E_BOOTSTRAP_ENABLED !== "1") return false;
  // Server-side lab marker (not sent on requests) — Host alone is not sufficient.
  if (process.env.SPREE_MARKETPLACE_LAB_CERT !== "1") return false;
  if (
    process.env.SPREE_DEPLOYMENT_PHASE === "production" ||
    process.env.NEXT_PUBLIC_DEPLOYMENT_PHASE === "production"
  ) {
    return false;
  }
  const labApi = process.env.SPREE_API_URL;
  const allowedLabApis = new Set([
    "http://127.0.0.1:3011",
    "http://127.0.0.1:3020",
    "http://127.0.0.1:3021",
    "http://127.0.0.1:3031",
  ]);
  if (!labApi || !allowedLabApis.has(labApi)) return false;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "development") {
    return false;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      const siteHost = new URL(siteUrl).hostname;
      if (siteHost !== "localhost" && siteHost !== "127.0.0.1") {
        return false;
      }
    } catch {
      return false;
    }
  }
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Playwright-only session bootstrap. Sets auth cookies the same way login does.
 */
export async function POST(request: Request) {
  if (!reviewE2eBootstrapAllowed(request)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: { token?: string; refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 422 });
  }

  const token = body.token?.trim();
  const refreshToken = body.refresh_token?.trim();
  if (!token || !refreshToken) {
    return NextResponse.json({ error: "missing_tokens" }, { status: 422 });
  }

  await setAccessToken(token);
  await setRefreshToken(refreshToken);

  return NextResponse.json({ ok: true });
}
