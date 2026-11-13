import { type CustomOrderRequest, SpreeError } from "@spree/sdk";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Circle,
  FileImage,
  MessageCircle,
  PackageCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CancelCustomOrderButton } from "@/components/account/CancelCustomOrderButton";
import { Button } from "@/components/ui/button";
import { getCustomOrderRequest } from "@/lib/data/custom-orders";

export default async function CustomOrderPage({
  params,
}: {
  params: Promise<{ country: string; locale: string; id: string }>;
}) {
  const { country, locale, id } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "customOrders",
  });
  const basePath = `/${country}/${locale}`;
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  let request;
  try {
    request = await getCustomOrderRequest(id);
  } catch (error) {
    if (error instanceof Error && error.message === "SIGN_IN_REQUIRED") {
      redirect(
        `${basePath}/account?redirect=${encodeURIComponent(`${basePath}/account/custom-orders/${id}`)}`,
      );
    }
    if (error instanceof SpreeError && error.status === 404) notFound();
    if (error instanceof SpreeError && error.status === 401) {
      redirect(
        `${basePath}/account?redirect=${encodeURIComponent(`${basePath}/account/custom-orders/${id}`)}`,
      );
    }
    console.error("Failed to load custom order request", {
      id,
      ...(error instanceof SpreeError
        ? { status: error.status, code: error.code, message: error.message }
        : {
            name: error instanceof Error ? error.name : "UnknownError",
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }),
    });
    throw error;
  }

  const progress = ["open", "quoted", "purchased"] as const;
  const currentStep = progress.indexOf(
    request.status as (typeof progress)[number],
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="space-y-4">
        <Link
          href={`${basePath}/account/custom-orders`}
          className="inline-flex items-center gap-2 text-sm font-medium text-marketplace-muted-foreground transition-colors hover:text-marketplace-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("backToOrders")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-marketplace-border-subtle pb-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-marketplace-muted-foreground">
              {request.seller_name}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-marketplace-brand sm:text-3xl">
              {request.source_product_name || t("detailTitle")}
            </h1>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-marketplace-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-4" />
              {dateFormatter.format(new Date(request.created_at))}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${statusClasses(request.status)}`}
          >
            {t(`status_${request.status}`)}
          </span>
        </div>
      </div>

      <section
        className="rounded-[var(--marketplace-radius-md)] bg-marketplace-surface-warm/70 px-4 py-5 sm:px-6"
        aria-label={t(`statusHelp_${request.status}`)}
      >
        {request.status === "cancelled" ? (
          <p className="text-sm font-medium text-marketplace-muted-foreground">
            {t("statusHelp_cancelled")}
          </p>
        ) : (
          <ol className="grid grid-cols-3 gap-2">
            {progress.map((step, index) => {
              const complete = currentStep >= index;
              const current = currentStep === index;
              return (
                <li key={step} className="min-w-0">
                  <span
                    className={`mb-2 flex size-7 items-center justify-center rounded-full ${complete ? "bg-marketplace-brand text-white" : "bg-marketplace-surface text-marketplace-muted-foreground"}`}
                  >
                    {complete ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : (
                      <Circle aria-hidden="true" className="size-3" />
                    )}
                  </span>
                  <span
                    className={`block text-xs sm:text-sm ${current ? "font-semibold text-marketplace-foreground" : "text-marketplace-muted-foreground"}`}
                  >
                    {t(`status_${step}`)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-4 text-sm text-marketplace-muted-foreground">
          {t(`statusHelp_${request.status}`)}
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-marketplace-foreground">
              {t("requestLabel")}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-marketplace-foreground">
              {request.description}
            </p>
          </div>
          {request.seller_note ? (
            <div className="border-l-2 border-marketplace-brand pl-4">
              <h2 className="text-base font-semibold text-marketplace-foreground">
                {t("sellerNoteLabel")}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-marketplace-muted-foreground">
                {request.seller_note}
              </p>
            </div>
          ) : null}
          {request.attachments.length > 0 ? (
            <div>
              <h2 className="text-base font-semibold text-marketplace-foreground">
                {t("attachmentsLabel")}
              </h2>
              <ul className="mt-3 divide-y divide-marketplace-border-subtle border-y border-marketplace-border-subtle">
                {request.attachments.map(
                  (attachment: CustomOrderRequest["attachments"][number]) => (
                    <li key={attachment.id}>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 py-3 text-sm font-medium text-marketplace-brand hover:underline"
                      >
                        <FileImage
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                        <span className="min-w-0 truncate">
                          {attachment.filename}
                        </span>
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="h-fit space-y-4 rounded-[var(--marketplace-radius-md)] bg-marketplace-surface-warm/60 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-marketplace-surface text-marketplace-brand">
              <PackageCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-xs text-marketplace-muted-foreground">
                {t("sellerLabel")}
              </p>
              <p className="font-semibold text-marketplace-foreground">
                {request.seller_name}
              </p>
            </div>
          </div>
          {request.source_product_name ? (
            <div className="border-t border-marketplace-border-subtle pt-3">
              <p className="text-xs text-marketplace-muted-foreground">
                {t("sourceProductLabel")}
              </p>
              <p className="mt-1 text-sm font-medium text-marketplace-foreground">
                {request.source_product_name}
              </p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 border-t border-marketplace-border-subtle pt-3">
            {request.message_thread_id ? (
              <Button asChild className="w-full">
                <Link
                  href={`${basePath}/account/messages/${request.message_thread_id}`}
                >
                  <MessageCircle aria-hidden="true" />
                  {t("openConversation")}
                </Link>
              </Button>
            ) : null}
            {request.status === "quoted" && request.product_id ? (
              <Button asChild variant="outline" className="w-full">
                <Link
                  href={`${basePath}/products/private/${request.product_id}`}
                >
                  {t("viewListing")}
                </Link>
              </Button>
            ) : null}
            {request.status === "purchased" && request.resulting_order_id ? (
              <Button asChild variant="outline" className="w-full">
                <Link
                  href={`${basePath}/account/orders/${request.resulting_order_id}`}
                >
                  {t("viewOrder")}
                </Link>
              </Button>
            ) : null}
            {request.status === "open" || request.status === "quoted" ? (
              <CancelCustomOrderButton id={request.id} />
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

function statusClasses(status: string) {
  switch (status) {
    case "quoted":
      return "bg-amber-100 text-amber-900";
    case "purchased":
      return "bg-emerald-100 text-emerald-900";
    case "cancelled":
      return "bg-marketplace-surface-warm text-marketplace-muted-foreground";
    default:
      return "bg-sky-100 text-sky-900";
  }
}
