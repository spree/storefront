import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidateCmsPageCache } from "@/lib/cache/revalidate-cms-page";
import { revalidateProductCache } from "@/lib/cache/revalidate-product";
import { createWebhookHandler } from "@/lib/spree/webhooks";
import { clearStaticGuestHomeComposition } from "@/lib/theme/guest-home-composition";
import { PUBLISHED_THEME_CACHE_TAG } from "@/lib/theme/published-cache";
import {
  handleOrderCanceled,
  handleOrderCompleted,
  handleOrderShipped,
  handlePasswordReset,
} from "@/lib/webhooks/handlers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.SPREE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook endpoint not configured" },
      { status: 503 },
    );
  }

  const handler = createWebhookHandler({
    secret: webhookSecret,
    handlers: {
      "order.completed": handleOrderCompleted,
      "order.canceled": handleOrderCanceled,
      "order.shipped": handleOrderShipped,
      "customer.password_reset_requested": handlePasswordReset,
      "theme.published": async (event) => {
        if (event.name === "theme.published") {
          revalidateTag(PUBLISHED_THEME_CACHE_TAG, { expire: 0 });
          clearStaticGuestHomeComposition();
        }
      },
      "product.updated": async (event) => {
        const data = event.data as { slug?: string; id?: string } | null;
        revalidateProductCache({
          slug: data?.slug,
          id: data?.id,
        });
      },
      "product.approved": async (event) => {
        const data = event.data as { slug?: string; id?: string } | null;
        revalidateProductCache({
          slug: data?.slug,
          id: data?.id,
        });
      },
      "cms_page.published": async (event) => {
        const data = event.data as {
          slug?: string;
          id?: string;
          page_id?: string;
        } | null;
        revalidateCmsPageCache({
          slug: data?.slug,
          id: data?.page_id ?? data?.id,
        });
      },
    },
  });

  return handler(request);
}
