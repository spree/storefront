import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { sellerStorefrontCacheTag } from "@/lib/data/seller-storefront-cache";

interface RevalidateBody {
  slug?: string;
}

function isAllowedLocalDevelopmentRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (
    process.env.NODE_ENV === "development" &&
    origin &&
    isAllowedSellerPanelOrigin(origin)
  ) {
    return true;
  }
  return false;
}

function isAllowedSellerPanelOrigin(origin: string): boolean {
  if (allowedSellerPanelOrigins().has(origin)) return true;
  if (process.env.NODE_ENV !== "development") return false;

  // Worktree seller panels use portless URLs such as
  // https://sellers.<worktree>.spree.localhost. Their hostname changes per
  // branch, so permit only that exact local development host pattern.
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      /^sellers\.[a-z0-9-]+\.spree\.localhost$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

function authorized(request: Request): boolean {
  if (isAllowedLocalDevelopmentRequest(request)) return true;
  const secret =
    process.env.STOREFRONT_REVALIDATE_SECRET?.trim() ||
    process.env.NEXT_PUBLIC_STOREFRONT_REVALIDATE_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token === secret;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  if (!origin || !isAllowedSellerPanelOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
}

function allowedSellerPanelOrigins(): Set<string> {
  return new Set(
    [
      process.env.SELLER_PANEL_ORIGIN?.trim(),
      process.env.NEXT_PUBLIC_SELLER_PANEL_URL?.trim(),
      "http://127.0.0.1:5174",
      "http://localhost:5174",
      "http://127.0.0.1:5175",
      "http://localhost:5175",
      // The local seller dashboard runs on 5176 in the unified marketplace
      // worktree. Keep both loopback hostnames allowed so its post-save cache
      // invalidation can reach the buyer storefront during development.
      "http://127.0.0.1:5176",
      "http://localhost:5176",
    ].filter(Boolean) as string[],
  );
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  const secretConfigured =
    Boolean(process.env.STOREFRONT_REVALIDATE_SECRET?.trim()) ||
    Boolean(process.env.NEXT_PUBLIC_STOREFRONT_REVALIDATE_SECRET?.trim());
  if (!secretConfigured && !isAllowedLocalDevelopmentRequest(request)) {
    return NextResponse.json(
      { error: "revalidate_not_configured" },
      { status: 503, headers },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers },
    );
  }

  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers },
    );
  }

  const slug = body.slug?.trim();
  if (!slug) {
    return NextResponse.json(
      { error: "missing_slug" },
      { status: 422, headers },
    );
  }

  const tag = sellerStorefrontCacheTag(slug);
  // Immediate expiry — "max" is stale-while-revalidate and keeps serving the
  // previous About/branding on the next public request.
  revalidateTag(tag, { expire: 0 });
  revalidatePath(`/[country]/[locale]/sellers/[slug]`, "page");

  return NextResponse.json({ revalidated: true, slug, tag }, { headers });
}
