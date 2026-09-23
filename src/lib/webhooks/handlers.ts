import type { Order } from "@spree/sdk";
import type { WebhookEvent } from "@spree/sdk/webhooks";
import { createElement } from "react";
import { OrderCanceledEmail } from "@/lib/emails/order-canceled";
import { OrderConfirmationEmail } from "@/lib/emails/order-confirmation";
import { PasswordResetEmail } from "@/lib/emails/password-reset";
import { sendEmail } from "@/lib/emails/send";
import { ShipmentShippedEmail } from "@/lib/emails/shipment-shipped";
import { getStoreName, getStoreUrl } from "@/lib/store";

const STORE_NAME = getStoreName();
const SITE_URL = getStoreUrl();

if (!SITE_URL && process.env.NODE_ENV === "production") {
  console.warn(
    "[webhooks] NEXT_PUBLIC_SITE_URL is not set — email links will be broken",
  );
}

/**
 * Idempotency guard — prevents duplicate email sends when Spree retries
 * a webhook delivery (timeout, lost response, etc.).
 *
 * Call `isAlreadyProcessed(id)` before sending. Call `markProcessed(id)`
 * only after the email is successfully sent. This way, failed sends
 * are retried on the next webhook delivery attempt.
 */
const PROCESSED_EVENTS = new Set<string>();
const MAX_PROCESSED_EVENTS = 10_000;

function isAlreadyProcessed(eventId: string): boolean {
  return PROCESSED_EVENTS.has(eventId);
}

function markProcessed(eventId: string): void {
  if (PROCESSED_EVENTS.size >= MAX_PROCESSED_EVENTS) {
    const first = PROCESSED_EVENTS.values().next().value;
    if (first) PROCESSED_EVENTS.delete(first);
  }
  PROCESSED_EVENTS.add(eventId);
}

/**
 * `order.placed` and `order.canceled` carry `notify_customer` in the payload.
 * It is `false` when whoever placed or canceled the order asked for the
 * customer not to be emailed — e.g. an admin placing a draft silently, or the
 * extra orders a split marketplace checkout places beside the first one.
 */
type OrderEventData = Order & { notify_customer?: boolean | null };

/**
 * Handle order.placed webhook — send order confirmation email.
 */
export async function handleOrderPlaced(event: WebhookEvent<OrderEventData>) {
  if (isAlreadyProcessed(event.id)) return;
  const order = event.data;
  if (!order.email || order.notify_customer === false) return;

  const customerName =
    order.shipping_address?.full_name || order.billing_address?.full_name || "";

  const deliveryMethodNames = [
    ...new Set(
      (order.fulfillments ?? [])
        .map((f) => f.delivery_method?.name)
        .filter(Boolean),
    ),
  ];
  const deliveryMethodName =
    deliveryMethodNames.length === 1 ? deliveryMethodNames[0] : undefined;

  await sendEmail({
    to: order.email,
    subject: `${STORE_NAME} Order Confirmation #${order.number}`,
    react: createElement(OrderConfirmationEmail, {
      orderNumber: order.number,
      customerName,
      items: (order.items || []).map((item) => ({
        name: item.name,
        slug: item.slug,
        quantity: item.quantity,
        options_text: item.options_text,
        display_price: item.display_price ?? "",
        display_total: item.display_total ?? "",
        thumbnail_url: item.thumbnail_url,
      })),
      displayItemTotal: order.display_item_total ?? "",
      displayDeliveryTotal: order.display_delivery_total ?? "",
      displayDiscountTotal: order.display_discount_total ?? undefined,
      displayTaxTotal: order.display_tax_total ?? "",
      displayTotal: order.display_total ?? "",
      shippingAddress: order.shipping_address ?? undefined,
      billingAddress: order.billing_address ?? undefined,
      deliveryMethodName,
    }),
  });

  markProcessed(event.id);
}

/**
 * Handle order.canceled webhook — send cancellation email.
 */
export async function handleOrderCanceled(event: WebhookEvent<OrderEventData>) {
  if (isAlreadyProcessed(event.id)) return;
  const order = event.data;
  if (!order.email || order.notify_customer === false) return;

  const customerName =
    order.shipping_address?.full_name || order.billing_address?.full_name || "";

  await sendEmail({
    to: order.email,
    subject: `${STORE_NAME} Order Canceled #${order.number}`,
    react: createElement(OrderCanceledEmail, {
      orderNumber: order.number,
      customerName,
      items: (order.items || []).map((item) => ({
        name: item.name,
        slug: item.slug,
        quantity: item.quantity,
        options_text: item.options_text,
        display_total: item.display_total ?? "",
        thumbnail_url: item.thumbnail_url,
      })),
      displayTotal: order.display_total ?? "",
    }),
  });

  markProcessed(event.id);
}

/**
 * Handle order.fulfilled webhook — send shipment notification email.
 *
 * Fires once every fulfillment on the order was handed over. We subscribe to
 * order.fulfilled (not fulfillment.fulfilled) because the order payload
 * includes the email, customer name, and all fulfillment details.
 */
export async function handleOrderFulfilled(event: WebhookEvent<Order>) {
  if (isAlreadyProcessed(event.id)) return;
  const order = event.data;
  if (!order.email) return;

  const customerName =
    order.shipping_address?.full_name || order.billing_address?.full_name || "";

  // Build shipment data from the order's handed-over fulfillments. Spree 6.0
  // fulfillment statuses: unfulfilled → fulfilled → delivered (no "shipped").
  const shipments = (order.fulfillments || [])
    .filter((f) => f.status === "fulfilled" || f.status === "delivered")
    .map((fulfillment) => {
      // Map fulfillment items back to line items for display data
      const shippedItems = (fulfillment.items || []).map((fi) => {
        const lineItem = order.items?.find(
          (li) => li.id === fi.item_id || li.variant_id === fi.variant_id,
        );
        return {
          name: lineItem?.name || "Item",
          slug: lineItem?.slug,
          quantity: fi.quantity,
          options_text: lineItem?.options_text,
          thumbnail_url: lineItem?.thumbnail_url,
        };
      });

      return {
        number: fulfillment.number,
        tracking: fulfillment.tracking,
        tracking_url: fulfillment.tracking_url,
        delivery_method_name:
          fulfillment.delivery_method?.name || "Standard Shipping",
        display_cost: fulfillment.display_cost ?? "",
        items: shippedItems,
      };
    });

  if (shipments.length === 0) return;

  await sendEmail({
    to: order.email,
    subject: `${STORE_NAME} Shipment Notification #${order.number}`,
    react: createElement(ShipmentShippedEmail, {
      orderNumber: order.number,
      customerName,
      shipments,
    }),
  });

  markProcessed(event.id);
}

/**
 * Handle customer.password_reset_requested webhook — send password reset email.
 *
 * The payload contains { email, reset_token, redirect_url }.
 * redirect_url is the storefront page where the customer enters their new password,
 * already validated against allowed origins by the Spree API.
 */
interface PasswordResetData {
  email: string;
  reset_token: string;
  redirect_url?: string;
}

export async function handlePasswordReset(
  event: WebhookEvent<PasswordResetData>,
) {
  if (isAlreadyProcessed(event.id)) return;
  const { email, reset_token, redirect_url } = event.data;
  if (!email || !reset_token) return;

  // Build the reset URL by appending the token to the redirect_url.
  // If no redirect_url was provided (e.g. no allowed origins configured),
  // fall back to the storefront's reset-password page.
  if (!SITE_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL configuration — cannot build password reset link",
    );
  }
  const url = new URL(redirect_url ?? "/account/reset-password", SITE_URL);
  url.searchParams.set("token", reset_token);
  const resetUrl = url.toString();

  await sendEmail({
    to: email,
    subject: `${STORE_NAME} Password Reset`,
    react: createElement(PasswordResetEmail, {
      resetUrl,
    }),
  });

  markProcessed(event.id);
}
