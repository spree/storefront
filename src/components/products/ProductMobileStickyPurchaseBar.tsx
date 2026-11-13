"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";

interface ProductMobileStickyPurchaseBarProps {
  visible: boolean;
  displayPrice: string | null | undefined;
  busy: boolean;
  isPurchasable: boolean;
  purchaseReady: boolean;
  onAddToCart: () => void;
}

export function ProductMobileStickyPurchaseBar({
  visible,
  displayPrice,
  busy,
  isPurchasable,
  purchaseReady,
  onAddToCart,
}: ProductMobileStickyPurchaseBarProps) {
  const t = useTranslations("products");
  const tp = useTranslations("personalization");
  const { isOpen: cartDrawerOpen } = useCart();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!visible || cartDrawerOpen || !portalTarget) return null;

  return createPortal(
    <section
      data-product-sticky-purchase="true"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-marketplace-border bg-marketplace-surface/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0_/_8%)] backdrop-blur-sm motion-reduce:backdrop-blur-none md:hidden",
        "motion-reduce:transition-none transition-transform duration-200 ease-out",
      )}
      aria-label={t("addToCart")}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-3">
        <Button
          type="button"
          size="lg"
          onClick={onAddToCart}
          disabled={!purchaseReady || busy || !isPurchasable}
          className="h-12 min-h-11 w-full rounded-full border-transparent bg-[#222] text-base font-semibold text-white hover:bg-black"
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
              {tp("uploading")}
            </>
          ) : isPurchasable ? (
            t("addToCart")
          ) : (
            t("outOfStock")
          )}
        </Button>
      </div>
    </section>,
    portalTarget,
  );
}
