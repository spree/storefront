"use client";

import { ArrowLeft, ChevronDown, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { StoreBrandLogo } from "@/components/layout/StoreBrandLogo";
import {
  CheckoutProvider,
  CheckoutSummary,
  useCheckout,
} from "@/contexts/CheckoutContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { POLICY_LINKS } from "@/lib/constants/policies";
import { getStoreName } from "@/lib/store";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import { extractBasePath } from "@/lib/utils/path";

const storeName = getStoreName();

function CheckoutHeader() {
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const t = useTranslations("checkoutLayout");
  const { checkout } = useStoreThemeSettings();
  const logoPosition =
    checkout?.logo_position === "center"
      ? "center"
      : checkout?.logo_position === "right"
        ? "right"
        : "left";

  return (
    <header className="relative flex h-16 items-center justify-between">
      <div
        className="flex min-w-0 items-center"
        style={{
          order: logoPosition === "right" ? 2 : 1,
          marginInline: logoPosition === "center" ? "auto" : undefined,
        }}
      >
        <StoreBrandLogo
          basePath={basePath || "/"}
          compact
          appearance="etsy"
          logoImageUrl={
            checkout?.logo_image_url
              ? String(checkout.logo_image_url)
              : undefined
          }
          logoImageAlt={storeName}
        />
      </div>
      <Link
        href={basePath || "/"}
        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        style={{
          order: logoPosition === "right" ? 1 : 2,
          marginLeft: logoPosition === "center" ? 0 : "auto",
          position: logoPosition === "center" ? "absolute" : undefined,
          right: logoPosition === "center" ? 0 : undefined,
        }}
        aria-label={t("backToStore")}
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        {t("backToStore")}
      </Link>
    </header>
  );
}

function CheckoutFooter() {
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const t = useTranslations("checkoutLayout");
  const tp = useTranslations("policies");

  return (
    <footer className="py-4 text-xs text-gray-500 border-t border-gray-200 mt-auto flex flex-wrap items-center gap-x-3 gap-y-1">
      <p>
        {t("allRightsReserved", { year: new Date().getFullYear(), storeName })}
      </p>
      {POLICY_LINKS.map((policy) => (
        <Link
          key={policy.slug}
          href={`${basePath}/policies/${policy.slug}`}
          target="_blank"
          className="text-gray-500 underline hover:text-gray-700"
        >
          {tp(policy.nameKey)}
        </Link>
      ))}
    </footer>
  );
}

function MobileSummaryToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("checkoutLayout");
  const { summaryContent } = useCheckout();
  const { checkout } = useStoreThemeSettings();

  // Hide the toggle entirely when there's no summary to show (e.g. the
  // order-placed page clears summaryContent because the page already
  // displays the order details inline).
  if (
    summaryContent === null ||
    !themeSettingEnabled(checkout?.show_order_summary, true)
  )
    return null;

  return (
    <div
      className="lg:hidden border-b border-gray-200 bg-gray-50"
      style={{ backgroundColor: "var(--checkout-summary, #f9fafb)" }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
        aria-expanded={isOpen}
        aria-controls="checkout-summary-panel"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <ShoppingBag className="w-5 h-5 text-gray-600" />
          {isOpen ? t("hideOrderSummary") : t("showOrderSummary")}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div id="checkout-summary-panel" className="px-5 pb-4">
          <CheckoutSummary />
        </div>
      )}
    </div>
  );
}

interface CheckoutLayoutProps {
  children: React.ReactNode;
}

function CheckoutLayoutContent({ children }: CheckoutLayoutProps) {
  const { checkout } = useStoreThemeSettings();
  const bannerHeight =
    checkout?.banner_height === "compact"
      ? "py-5"
      : checkout?.banner_height === "tall"
        ? "py-16"
        : "py-10";
  const bannerImage =
    typeof checkout?.banner_image_url === "string"
      ? checkout.banner_image_url
      : "";
  const summaryBelow = checkout?.summary_position === "below";
  const mainContentWidth =
    checkout?.main_content_width === "wide" ? "wide" : "standard";
  const checkoutFont =
    checkout?.font === "heading"
      ? "var(--marketplace-heading-font)"
      : "var(--marketplace-body-font)";
  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      style={{
        backgroundColor: "var(--checkout-main, #ffffff)",
        color: "var(--checkout-text, inherit)",
        fontFamily: checkoutFont,
        fontSize:
          checkout?.base_size === "small"
            ? "14px"
            : checkout?.base_size === "large"
              ? "18px"
              : undefined,
      }}
    >
      {themeSettingEnabled(checkout?.banner_enabled) && (
        <div
          aria-hidden="true"
          className={`w-full bg-cover bg-center ${bannerHeight}`}
          style={{
            backgroundColor: "var(--checkout-banner, transparent)",
            backgroundImage: bannerImage
              ? `url("${bannerImage.replace(/["\\]/g, "")}")`
              : undefined,
          }}
        />
      )}
      {/* Mobile header */}
      <div className="lg:hidden border-b border-gray-200">
        <div className="px-5">
          <CheckoutHeader />
        </div>
      </div>

      {/* Mobile summary toggle */}
      <MobileSummaryToggle />

      {/* Main checkout grid — Shopify proportions */}
      <div
        data-theme-checkout-summary-position={summaryBelow ? "below" : "right"}
        data-theme-checkout-main-width={mainContentWidth}
        className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,640px)_minmax(0,440px)_1fr]"
      >
        {/* Main content area — white bg */}
        <div className="lg:col-start-2 flex flex-col">
          <div className="flex-1 px-5 py-6 lg:pl-10 lg:pr-12 lg:py-10">
            {/* Desktop header */}
            <div className="hidden lg:block mb-8">
              <CheckoutHeader />
            </div>
            {children}
          </div>
          <div className="px-5 lg:pl-10 lg:pr-12 pb-4">
            <CheckoutFooter />
          </div>
        </div>

        {/* Desktop summary sidebar — separated by its background tone, without a divider */}
        {themeSettingEnabled(checkout?.show_order_summary, true) && (
          <div
            className={`hidden lg:block ${summaryBelow ? "lg:col-start-2 lg:col-span-1 border-t border-gray-200" : "lg:col-start-3"} bg-gray-50`}
            style={{ backgroundColor: "var(--checkout-summary, #f9fafb)" }}
          >
            <div className="sticky top-0 px-10 py-10">
              <CheckoutSummary />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  return (
    <CheckoutProvider>
      <CheckoutLayoutContent>{children}</CheckoutLayoutContent>
    </CheckoutProvider>
  );
}
