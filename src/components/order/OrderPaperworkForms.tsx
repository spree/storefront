"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_ORDER_DOCUMENT_BYTES } from "@/lib/constants/order-documents";
import { requestInvoice, uploadOrderDocument } from "@/lib/data/invoices";

/** Asks the seller for an invoice, with the company details to print on it. */
export function InvoiceRequestForm({ orderId }: { orderId: string }) {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("requestInvoice")}
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 mt-3"
      // onSubmit rather than action: React clears an action form, losing the
      // customer's input when the request fails.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          setError(null);
          try {
            const result = await requestInvoice(orderId, {
              company_name: String(formData.get("company_name") ?? ""),
              tax_id: String(formData.get("tax_id") ?? ""),
            });
            if (!result.success) setError(result.error);
          } catch {
            setError(t("paperworkError"));
          }
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`company-${orderId}`}>{t("invoiceCompanyName")}</Label>
        <Input id={`company-${orderId}`} name="company_name" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`tax-id-${orderId}`}>{t("invoiceTaxId")}</Label>
        <Input id={`tax-id-${orderId}`} name="tax_id" />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t("sendInvoiceRequest")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}

/** Adds the customer's own paperwork, such as their purchase order. */
export function DocumentUploadForm({ orderId }: { orderId: string }) {
  const t = useTranslations("orders");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end mt-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const file = formData.get("file");
        // An empty file passes `required`.
        if (!(file instanceof File) || file.size === 0) {
          setError(t("documentEmpty"));
          return;
        }
        // Checked here because a larger file fails Next's body limit before the action runs.
        if (file.size > MAX_ORDER_DOCUMENT_BYTES) {
          setError(t("documentTooLarge"));
          return;
        }
        startTransition(async () => {
          setError(null);
          try {
            const result = await uploadOrderDocument(orderId, formData);
            if (result.success) form.reset();
            else setError(result.error);
          } catch {
            setError(t("paperworkError"));
          }
        });
      }}
    >
      <div className="grid gap-1.5 flex-1">
        <Label htmlFor={`doc-label-${orderId}`}>{t("documentName")}</Label>
        <Input id={`doc-label-${orderId}`} name="label" />
      </div>
      <div className="grid gap-1.5 flex-1">
        <Label htmlFor={`doc-file-${orderId}`}>{t("documentFile")}</Label>
        <Input id={`doc-file-${orderId}`} name="file" type="file" required />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {t("addDocument")}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
