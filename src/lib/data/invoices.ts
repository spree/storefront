"use server";

import type { Invoice, InvoiceRequest, OrderDocument } from "@spree/sdk";
import { revalidatePath } from "next/cache";
import { getClient, withAuthRefresh } from "@/lib/spree";
import { actionResult, withFallback } from "./utils";

const ORDER_PAGE =
  "/[country]/[locale]/(storefront)/account/(authenticated)/orders/[id]";

export interface OrderPaperwork {
  invoices: Invoice[];
  documents: OrderDocument[];
  openRequest: InvoiceRequest | null;
}

/**
 * One order's invoices, the documents the merchant made visible or the
 * customer added, and whether an invoice request is waiting.
 */
export async function getOrderPaperwork(
  orderId: string,
): Promise<OrderPaperwork> {
  return withFallback(
    () =>
      withAuthRefresh(async (options) => {
        const client = getClient();
        const [invoices, documents, requests] = await Promise.all([
          client.orders.invoices.list(orderId, { limit: 100 }, options),
          client.orders.documents.list(orderId, { limit: 100 }, options),
          client.orders.invoiceRequests.list(orderId, options),
        ]);
        return {
          invoices: invoices.data,
          documents: documents.data,
          openRequest:
            requests.data.find((request) => request.status === "open") ?? null,
        };
      }),
    { invoices: [], documents: [], openRequest: null },
  );
}

/** Asks for an invoice on the order, with the company details to put on it. */
export async function requestInvoice(
  orderId: string,
  params: { company_name?: string; tax_id?: string },
) {
  return actionResult(async () => {
    await withAuthRefresh((options) =>
      getClient().orders.invoiceRequests.create(
        orderId,
        {
          company_name: params.company_name?.trim() || null,
          tax_id: params.tax_id?.trim() || null,
        },
        options,
      ),
    );
    revalidatePath(ORDER_PAGE, "page");
    return {};
  }, "Could not request an invoice");
}

/** Adds the customer's own document, such as their purchase order, to the order. */
export async function uploadOrderDocument(orderId: string, formData: FormData) {
  return actionResult(async () => {
    const file = formData.get("file");
    const label = String(formData.get("label") ?? "").trim();
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose a file to upload");
    }

    // Two calls, so a token refresh before `create` doesn't store the file twice.
    const client = getClient();
    const upload = await withAuthRefresh((options) =>
      client.orders.documents.upload(
        orderId,
        file,
        { filename: file.name, contentType: file.type },
        options,
      ),
    );
    await withAuthRefresh((options) =>
      client.orders.documents.create(
        orderId,
        { label: label || file.name, file_signed_id: upload.signed_id },
        options,
      ),
    );
    revalidatePath(ORDER_PAGE, "page");
    return {};
  }, "Could not upload the document");
}
