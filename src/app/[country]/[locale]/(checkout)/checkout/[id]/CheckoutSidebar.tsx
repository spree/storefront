"use client";

import type { Cart } from "@spree/sdk";
import { Summary } from "@/components/checkout/Summary";

interface CheckoutSidebarProps {
  cart: Cart;
}

export function CheckoutSidebar({ cart }: CheckoutSidebarProps) {
  return <Summary cart={cart} />;
}
