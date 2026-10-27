"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useHiddenPricing } from "@/contexts/HiddenPricingContext";
import { cn } from "@/lib/utils";

/**
 * Rendered in place of a price the viewer is not entitled to see, saying what
 * they can do about it: sign in, register a business, or wait for the merchant
 * to review the one they have. Which of the three comes from the API's
 * `pricing_access` code, so the prompt never guesses.
 *
 * Renders nothing outside a HiddenPricingProvider — so on the DTC storefront a
 * genuinely absent price stays silent.
 */
export function HiddenPricePrompt({ className }: { className?: string }) {
  const hiddenPricing = useHiddenPricing();
  const t = useTranslations("wholesale");

  if (!hiddenPricing) return null;

  const remedy = hiddenPricing.remedy ?? "sign-in";

  // Nothing to click: the company exists and the merchant is reviewing it, so
  // the honest thing is to say so rather than offer an action that repeats.
  if (remedy === "awaiting-approval") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-slate-500",
          className,
        )}
      >
        <Lock className="h-3.5 w-3.5" />
        {t("hiddenPrice.awaitingApproval")}
      </span>
    );
  }

  const href =
    remedy === "register" && hiddenPricing.registerHref
      ? hiddenPricing.registerHref
      : hiddenPricing.signInHref;

  return (
    <Link
      href={href}
      className={cn(
        // Keeps the prompt clickable when a host card covers itself with a
        // stretched-link overlay (ProductCard).
        "relative z-10",
        className ??
          "inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900",
      )}
    >
      <Lock className="h-3.5 w-3.5" />
      {remedy === "register"
        ? t("hiddenPrice.registerForPricing")
        : t("hiddenPrice.signInForPricing")}
    </Link>
  );
}
