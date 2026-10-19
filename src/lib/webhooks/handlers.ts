import { formatMoney, type Order } from "@spree/sdk";
import type { WebhookEvent } from "@spree/sdk/webhooks";
import { createElement } from "react";
import { DataRequestConfirmationEmail } from "@/lib/emails/data-request-confirmation";
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

/** Formats an order amount in the order's currency and language. */
function orderMoney(order: Order, amount: string | null | undefined): string {
  return formatMoney(amount, order.currency, order.locale);
}

/**
 * Handle order.placed webhook — send order confirmation email.
 */
export async function handleOrderPlaced(event: WebhookEvent<"order.placed">) {
  if (isAlreadyProcessed(event.id)) return;
  const order = event.data;
  if (!order.email) return;

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
        display_price: formatMoney(item.price, item.currency, order.locale, {
          unitPrice: true,
        }),
        display_total: orderMoney(order, item.total),
        thumbnail_url: item.thumbnail_url,
      })),
      displayItemTotal: orderMoney(order, order.item_total),
      displayDeliveryTotal: orderMoney(order, order.delivery_total),
      displayDiscountTotal: order.discount_total
        ? orderMoney(order, order.discount_total)
        : undefined,
      displayTaxTotal: orderMoney(order, order.tax_total),
      displayTotal: orderMoney(order, order.total),
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
export async function handleOrderCanceled(
  event: WebhookEvent<"order.canceled">,
) {
  if (isAlreadyProcessed(event.id)) return;
  const order = event.data;
  if (!order.email) return;

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
        display_total: orderMoney(order, item.total),
        thumbnail_url: item.thumbnail_url,
      })),
      displayTotal: orderMoney(order, order.total),
    }),
  });

  markProcessed(event.id);
}

/**
 * Handle order.fulfilled webhook — send shipment notification email.
 *
 * We subscribe to order.fulfilled (not fulfillment.fulfilled) because the
 * order payload includes the email, customer name, and all fulfillment details.
 */
export async function handleOrderFulfilled(
  event: WebhookEvent<"order.fulfilled">,
) {
  if (isAlreadyProcessed(event.id)) return;
  const order = event.data;
  if (!order.email) return;

  const customerName =
    order.shipping_address?.full_name || order.billing_address?.full_name || "";

  // Build shipment data from the order's fulfillments
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
        display_cost: orderMoney(order, fulfillment.cost),
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
export async function handlePasswordReset(
  event: WebhookEvent<"customer.password_reset_requested">,
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

/**
 * Handle data_request.confirmation_requested webhook — ask the customer to
 * confirm a data request they raised. Spree acts on it only once someone
 * reading mail at this address confirms it.
 *
 * redirect_url is the storefront page that confirms the request, already
 * validated against allowed origins by the Spree API.
 */
export async function handleDataRequestConfirmation(
  event: WebhookEvent<"data_request.confirmation_requested">,
) {
  if (isAlreadyProcessed(event.id)) return;
  const { email, confirmation_token, redirect_url, kind } = event.data;
  if (!email || !confirmation_token) return;

  if (!SITE_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL configuration — cannot build data request confirmation link",
    );
  }
  const url = new URL(
    redirect_url ?? "/account/data-requests/confirm",
    SITE_URL,
  );
  url.searchParams.set("token", confirmation_token);
  const erasure = kind === "erasure";

  await sendEmail({
    to: email,
    subject: `${STORE_NAME} ${erasure ? "Confirm Your Erasure Request" : "Confirm Your Data Request"}`,
    react: createElement(DataRequestConfirmationEmail, {
      confirmUrl: url.toString(),
      kind: erasure ? "erasure" : "access",
    }),
  });

  markProcessed(event.id);
}
