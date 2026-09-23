import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createWebhookHandler } from "@/lib/spree/webhooks";
import {
  handleOrderCanceled,
  handleOrderFulfilled,
  handleOrderPlaced,
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
      // Spree 6.0 names. The legacy `order.completed` / `order.shipped`
      // aliases are still dual-emitted until 6.1 — they are deliberately not
      // handled here, so an endpoint subscribed to both sends one email.
      "order.placed": handleOrderPlaced,
      "order.canceled": handleOrderCanceled,
      "order.fulfilled": handleOrderFulfilled,
      "customer.password_reset_requested": handlePasswordReset,
    },
  });

  return handler(request);
}
