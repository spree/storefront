import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createWebhookHandler,
  type WebhookHandlers,
} from "@/lib/spree/webhooks";
import {
  handleDataRequestConfirmation,
  handleOrderCanceled,
  handleOrderFulfilled,
  handleOrderPlaced,
  handlePasswordReset,
} from "@/lib/webhooks/handlers";
import {
  handleProductChanged,
  type ProductCatalogEvent,
} from "@/lib/webhooks/products";

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
      // Catalog cache: keep search and listings in step with product status.
      "product.created": handleProductChanged,
      "product.updated": handleProductChanged,
      "product.deleted": handleProductChanged,
      "product.activated": handleProductChanged,
      "product.approved": handleProductChanged,
      "product.drafted": handleProductChanged,
      "product.archived": handleProductChanged,
    } satisfies Record<ProductCatalogEvent, unknown> & WebhookHandlers,
  });

  return handler(request);
}
