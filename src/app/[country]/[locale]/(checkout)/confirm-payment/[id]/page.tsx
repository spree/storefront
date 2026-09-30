"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect, useRef } from "react";
import { confirmPaymentAndCompleteCart } from "@/lib/data/payment";
import { orderPlacedPath } from "@/lib/utils/order-placed";
import { extractBasePath } from "@/lib/utils/path";

interface ConfirmPaymentPageProps {
  params: Promise<{
    id: string;
    country: string;
    locale: string;
  }>;
}

/**
 * Intermediate page that offsite payment gateways redirect to.
 *
 * When a customer returns from an offsite gateway (e.g. Stripe 3D Secure,
 * Adyen Klarna/iDEAL), the payment webhook may not have arrived yet. This page:
 * 1. Tries to complete the payment session (tells Spree to check with the provider)
 * 2. If successful, completes the order and redirects to order-placed
 * 3. If failed, redirects back to checkout with an error
 */
export default function ConfirmPaymentPage({
  params,
}: ConfirmPaymentPageProps) {
  const { id: cartId } = use(params);
  const t = useTranslations("checkout");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    // Stripe: ?session={spreeSessionId}
    // Adyen:  ?sessionId={adyenSessionId}&redirectResult=...
    const sessionId = searchParams.get("session");
    const sessionResult = searchParams.get("sessionResult");
    const redirectResult = searchParams.get("redirectResult");
    const adyenSessionId = searchParams.get("sessionId");

    async function confirmAndRedirect() {
      const result = await confirmPaymentAndCompleteCart(
        cartId,
        sessionId ?? undefined,
        sessionResult ?? undefined,
        redirectResult ?? undefined,
        adyenSessionId ?? undefined,
      );

      if (result.success) {
        // Cache the completed order for the thank-you page
        if (result.order) {
          const { cacheCompletedOrder } = await import(
            "@/lib/utils/completed-order-cache"
          );
          cacheCompletedOrder(cartId, result.order);
        }

        router.replace(orderPlacedPath(basePath, cartId, result.order));
      } else {
        const errorMessage = encodeURIComponent(
          result.error || t("paymentError"),
        );
        router.replace(
          `${basePath}/checkout/${cartId}?payment_error=${errorMessage}`,
        );
      }
    }

    confirmAndRedirect();
  }, [cartId, searchParams, basePath, router, t]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <p className="text-sm text-gray-500">{t("confirmingPayment")}</p>
    </div>
  );
}
