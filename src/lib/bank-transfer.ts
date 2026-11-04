import type { Payment, PaymentMethod } from "@spree/sdk";

/**
 * Bank transfer data from spree-bank_payments, read off the Store API.
 *
 * The gem adds a `bank_transfer` field to Spree's payment method and payment
 * serializers, which the SDK's types don't know, and its customer-facing
 * webhook events carry the same quote. Everything here narrows `unknown` by
 * hand: the bank details are admin-edited JSON and provider data, so a
 * malformed part is dropped rather than rendered or thrown on.
 */

/** One set of payable coordinates: a local scheme, or SWIFT. */
export interface BankTransferDetailSet {
  label?: string;
  beneficiaryName?: string;
  beneficiaryAddress?: string;
  fields: { label: string; value: string }[];
}

/** What a buyer needs to pay one order by bank transfer. */
export interface BankTransferQuote {
  reference: string;
  amount: string;
  currency: string;
  expiresAt: string | null;
  discountPercent: string;
  bankDetails: BankTransferDetailSet[];
}

/** What a bank transfer payment method advertises before the buyer chooses. */
export interface BankTransferMethodInfo {
  discountPercent: string;
  expiryDays: number;
}

/** The customer-facing events the storefront emails about. */
export type BankTransferEventName =
  | "bank_transfer.instructions_ready"
  | "bank_transfer.reminder_due"
  | "bank_transfer.expired";

/** A bank transfer webhook event's data: the session's notification payload. */
export interface BankTransferNotification {
  payment_session_id: string | null;
  order_id: string | null;
  order_number: string | null;
  order_email: string | null;
  reference: string | null;
  amount: string | null;
  currency: string | null;
  expires_at: string | null;
  discount_percent: string | null;
  bank_details: unknown;
}

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function detailSet(raw: unknown): BankTransferDetailSet | null {
  if (!isFields(raw) || !Array.isArray(raw.fields)) return null;

  const fields = raw.fields.flatMap((field) => {
    if (!isFields(field)) return [];
    const value = text(field.value);
    return value ? [{ label: text(field.label) ?? "", value }] : [];
  });
  if (fields.length === 0) return null;

  return {
    label: text(raw.label),
    beneficiaryName: text(raw.beneficiary_name),
    beneficiaryAddress: text(raw.beneficiary_address),
    fields,
  };
}

/**
 * Reads a quote: a payment's `bank_transfer`, or a bank transfer event's data.
 * Null when there is no reference and amount to show.
 */
export function bankTransferQuote(value: unknown): BankTransferQuote | null {
  if (!isFields(value)) return null;

  const reference = text(value.reference);
  const amount = text(value.amount);
  if (!reference || !amount) return null;

  const details = Array.isArray(value.bank_details) ? value.bank_details : [];

  return {
    reference,
    amount,
    currency: text(value.currency) ?? "",
    expiresAt: text(value.expires_at) ?? null,
    discountPercent: text(value.discount_percent) ?? "0",
    bankDetails: details.flatMap((raw) => detailSet(raw) ?? []),
  };
}

/** The discount and payment window a bank transfer method advertises. */
export function bankTransferMethodInfo(
  method: PaymentMethod,
): BankTransferMethodInfo | null {
  const info = (method as PaymentMethod & { bank_transfer?: unknown })
    .bank_transfer;
  if (!isFields(info)) return null;

  return {
    discountPercent: text(info.discount_percent) ?? "0",
    expiryDays: typeof info.expiry_days === "number" ? info.expiry_days : 0,
  };
}

/**
 * The quotes an order still has to be paid against: its bank transfer
 * payments that are not yet completed. The gem gives a voided payment (a
 * switch, an expiry) no quote, so those drop out too.
 */
export function pendingBankTransfers(order: {
  payments?: Payment[] | null;
}): BankTransferQuote[] {
  return (order.payments ?? []).flatMap((payment) => {
    if (payment.status === "completed") return [];
    const quote = bankTransferQuote(
      (payment as typeof payment & { bank_transfer?: unknown }).bank_transfer,
    );
    return quote ? [quote] : [];
  });
}

/** Whether a discount percent is worth advertising: anything above zero. */
export function hasBankTransferDiscount(
  percent: string | null | undefined,
): boolean {
  return Number.parseFloat(percent ?? "") > 0;
}

/**
 * A quote's deadline as a long date in `locale`, or null without one. UTC, so
 * the server's timezone can't shift the day.
 */
export function formatBankTransferDeadline(
  iso: string | null,
  locale: string,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  });
}
