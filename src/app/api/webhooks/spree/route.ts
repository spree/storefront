import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createWebhookHandler } from "@/lib/spree/webhooks";
import {
  handleDataRequestConfirmation,
  handleExchangeRequested,
  handleOrderCanceled,
  handleOrderFulfilled,
  handleOrderLookup,
  handleOrderPlaced,
  handlePasswordReset,
  handleReturnRequested,
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
      "order.placed": handleOrderPlaced,
      "order.canceled": handleOrderCanceled,
      "order.fulfilled": handleOrderFulfilled,
      "customer.password_reset_requested": handlePasswordReset,
      "data_request.confirmation_requested": handleDataRequestConfirmation,
      "order.lookup_requested": handleOrderLookup,
      "return.requested": handleReturnRequested,
      "exchange.requested": handleExchangeRequested,
    },
  });

  return handler(request);
}
