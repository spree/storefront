import { formatMoney } from "@spree/sdk";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getOrderPaperwork } from "@/lib/data/invoices";
import { formatDate } from "@/lib/utils/format";
import { DocumentUploadForm, InvoiceRequestForm } from "./OrderPaperworkForms";

/**
 * One order's invoices and documents on the customer's order page. A checkout
 * that reached several sellers shows one of these per seller, because each
 * seller invoices their own order.
 */
export async function OrderPaperwork({
  orderId,
  orderNumber,
  locale,
}: {
  orderId: string;
  /** Set when the checkout split, to tell the sellers' orders apart. */
  orderNumber?: string;
  locale: string;
}) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "orders",
  });
  const paperwork = await getOrderPaperwork(orderId);
  if (!paperwork) return null;

  const { invoices, documents, openRequest } = paperwork;
  const hasInvoice = invoices.some((invoice) => invoice.kind === "invoice");
  const fileUrl = (kind: "invoices" | "documents", id: string) =>
    `/api/orders/${orderId}/files/${kind}/${id}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {orderNumber
          ? t("documentsFor", { number: orderNumber })
          : t("documents")}
      </h3>

      {invoices.length === 0 && documents.length === 0 ? (
        <p className="text-sm text-gray-500">{t("noDocuments")}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {invoices.map((invoice) => (
            <li
              key={invoice.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <a
                href={fileUrl("invoices", invoice.id)}
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <FileText className="w-4 h-4" />
                {t.has(`invoiceKinds.${invoice.kind}`)
                  ? t(`invoiceKinds.${invoice.kind}`)
                  : invoice.kind}{" "}
                {invoice.number}
              </a>
              <span className="text-gray-500">
                {formatDate(invoice.issued_on, "-", locale, "UTC")} ·{" "}
                {formatMoney(invoice.total, invoice.currency, locale)}
              </span>
            </li>
          ))}
          {documents.map((document) => (
            <li key={document.id} className="py-2 text-sm">
              <a
                href={fileUrl("documents", document.id)}
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <FileText className="w-4 h-4" />
                {document.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      {openRequest ? (
        <p className="text-sm text-gray-500 mt-3" role="status">
          {t("invoiceRequested")}
        </p>
      ) : (
        !hasInvoice && (
          <div className="mt-3">
            <InvoiceRequestForm orderId={orderId} />
          </div>
        )
      )}

      <DocumentUploadForm orderId={orderId} />
    </div>
  );
}
