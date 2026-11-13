"use client";

import {
  ChevronDown,
  CreditCard,
  LogOut,
  MessageSquare,
  Settings,
  ShoppingBag,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { getCustomer } from "@/lib/data/customer";

interface BuyerAccountMenuProps {
  basePath: string;
}

export function BuyerAccountMenu({ basePath }: BuyerAccountMenuProps) {
  const t = useTranslations("account");
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [creditBalance, setCreditBalance] = useState<string | null>(null);
  const [creditLoaded, setCreditLoaded] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen || creditLoaded) return;

    setCreditLoaded(true);
    try {
      const customer = await getCustomer();
      setCreditBalance(customer?.display_available_store_credit_total ?? null);
    } catch (error) {
      console.error("Failed to load buyer credit balance", error);
    }
  }

  const displayName = user?.first_name || user?.email || t("myAccount");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-header-hover-trigger="true"
          aria-label={t("myAccount")}
          className="relative flex h-9 w-9 items-center justify-center gap-1 rounded-full px-0 text-marketplace-foreground transition-[background-color,color] duration-200 ease-out hover:bg-marketplace-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand motion-reduce:transition-none sm:h-10 sm:w-auto sm:px-1"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-marketplace-foreground text-xs font-semibold text-marketplace-surface sm:size-7">
            {initial}
          </span>
          <span className="sr-only">{displayName}</span>
          <ChevronDown className="hidden size-3 sm:block" aria-hidden="true" />
          <span aria-hidden="true" className="marketplace-header-hover-label">
            {t("myAccount")}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="max-w-60 whitespace-normal px-3 py-2">
          <span className="block truncate text-sm font-semibold text-marketplace-foreground">
            {displayName}
          </span>
          {user?.first_name ? (
            <span className="mt-0.5 block truncate text-xs font-normal text-marketplace-muted-foreground">
              {user.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`${basePath}/account/orders`}>
            <ShoppingBag aria-hidden="true" />
            {t("purchasesAndReviews")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${basePath}/account/messages`}>
            <MessageSquare aria-hidden="true" />
            {t("messages")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="opacity-100">
          <CreditCard aria-hidden="true" />
          <span>{t("storeCredit")}</span>
          <span className="ml-auto text-marketplace-muted-foreground">
            {creditBalance ?? "—"}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${basePath}/account/quotes`}>
            <Tag aria-hidden="true" />
            {t("quotes")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${basePath}/account/offers`}>
            <Tag aria-hidden="true" />
            {t("specialOffers")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`${basePath}/account/settings`}>
            <Settings aria-hidden="true" />
            {t("accountSettings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut aria-hidden="true" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
