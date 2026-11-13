"use client";

import { ShoppingCart } from "@phosphor-icons/react/dist/csr/ShoppingCart";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

interface CartButtonProps {
  compact?: boolean;
}

export function CartButton({ compact = false }: CartButtonProps) {
  const t = useTranslations("header");
  const { itemCount, openCart } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (compact) {
    return (
      <button
        type="button"
        onClick={openCart}
        data-header-hover-trigger="true"
        aria-label={t("openCart")}
        className="relative flex size-9 items-center justify-center rounded-full text-[#2f2933] transition-[background-color,color] duration-200 ease-out hover:bg-marketplace-accent motion-reduce:transition-none sm:size-10"
      >
        <span className="relative">
          <ShoppingCart
            className="size-5 sm:size-6"
            weight="regular"
            aria-hidden
          />
          {mounted && itemCount > 0 ? (
            <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-marketplace-brand px-0.5 text-[9px] font-semibold text-marketplace-brand-foreground">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          ) : null}
        </span>
        <span aria-hidden="true" className="marketplace-header-hover-label">
          {t("cart")}
        </span>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={openCart}
      aria-label={t("openCart")}
      data-header-hover-trigger="true"
      className="relative"
    >
      <ShoppingCart className="size-5" weight="regular" aria-hidden />
      <span aria-hidden="true" className="marketplace-header-hover-label">
        {t("cart")}
      </span>
      {mounted && itemCount > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-marketplace-brand px-0.5 text-[9px] font-semibold text-marketplace-brand-foreground">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Button>
  );
}
