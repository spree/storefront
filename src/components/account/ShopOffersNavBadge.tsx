"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUnreadShopOfferCount } from "@/lib/data/shop-offers";

export function ShopOffersNavBadge() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    void getUnreadShopOfferCount()
      .then((value) => {
        if (!cancelled) setCount(value);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (count <= 0) return null;

  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-marketplace-sale px-1 text-[9px] font-semibold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
