import { NextResponse } from "next/server";
import { revalidateProductCache } from "@/lib/cache/revalidate-product";

interface RevalidateBody {
  slug?: string;
  id?: string;
}

function authorized(request: Request): boolean {
  const secret =
    process.env.STOREFRONT_REVALIDATE_SECRET?.trim() ||
    process.env.NEXT_PUBLIC_STOREFRONT_REVALIDATE_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token === secret;
}

export async function POST(request: Request) {
  const secretConfigured = Boolean(
    process.env.STOREFRONT_REVALIDATE_SECRET?.trim() ||
      process.env.NEXT_PUBLIC_STOREFRONT_REVALIDATE_SECRET?.trim(),
  );
  if (!secretConfigured) {
    return NextResponse.json(
      { error: "revalidate_not_configured" },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const slug = body.slug?.trim();
  const id = body.id?.trim();
  if (!slug && !id) {
    return NextResponse.json({ error: "missing_product" }, { status: 422 });
  }

  revalidateProductCache({ slug, id });

  return NextResponse.json({
    revalidated: true,
    slug: slug ?? null,
    id: id ?? null,
  });
}
