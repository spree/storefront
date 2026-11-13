"use client";

import { Compass } from "@phosphor-icons/react/dist/csr/Compass";
import { Heart } from "@phosphor-icons/react/dist/csr/Heart";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { ShoppingCart } from "@phosphor-icons/react/dist/csr/ShoppingCart";
import { User } from "@phosphor-icons/react/dist/csr/User";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import { cn } from "@/lib/utils";

interface MarketplaceBottomNavProps {
  basePath: string;
}

function normalizeStorefrontPath(pathname: string) {
  return pathname.replace(/^\/storefront-embed(?=\/|$)/, "") || "/";
}

function isExplorePath(storefrontPath: string, basePath: string) {
  const prefix = basePath.replace(/\/+$/, "") || "";
  const relative =
    prefix && storefrontPath.startsWith(prefix)
      ? storefrontPath.slice(prefix.length) || "/"
      : storefrontPath;
  return (
    relative.startsWith("/products") ||
    relative.startsWith("/categories") ||
    relative.startsWith("/collections") ||
    relative.startsWith("/shops") ||
    relative.startsWith("/search")
  );
}

function isYouPath(storefrontPath: string, basePath: string) {
  const accountRoot = `${basePath.replace(/\/+$/, "")}/account`;
  return (
    storefrontPath === accountRoot ||
    storefrontPath.startsWith(`${accountRoot}/`)
  );
}

export function MarketplaceBottomNav({ basePath }: MarketplaceBottomNavProps) {
  const t = useTranslations("header");
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const storefrontPathname = normalizeStorefrontPath(pathname);
  const homeHref = basePath || "/";
  const { general } = useStoreThemeSettings();
  const showWishlist = themeSettingEnabled(general?.enable_wishlist, true);
  const savedHref =
    typeof general?.wishlist_page_slug === "string" &&
    general.wishlist_page_slug
      ? `${basePath}/pages/${encodeURIComponent(general.wishlist_page_slug)}`
      : `${basePath}/account/favorites`;
  const exploreHref = `${basePath}/products`;
  const cartHref = `${basePath}/cart`;
  const youHref = `${basePath}/account`;

  const pathnameForActive = mounted ? storefrontPathname : "";

  const items = [
    {
      href: homeHref,
      label: t("home"),
      icon: House,
      isActive: pathnameForActive === homeHref,
    },
    {
      href: exploreHref,
      label: t("navExplore"),
      icon: Compass,
      isActive: isExplorePath(pathnameForActive, basePath),
    },
    ...(showWishlist
      ? [
          {
            href: savedHref,
            label: t("navSaved"),
            icon: Heart,
            isActive:
              pathnameForActive === savedHref ||
              pathnameForActive.startsWith(`${savedHref}/`),
          },
        ]
      : []),
    {
      href: cartHref,
      label: t("cart"),
      icon: ShoppingCart,
      isActive:
        pathnameForActive === cartHref || pathnameForActive.endsWith("/cart"),
      badgeCount: mounted ? itemCount : 0,
    },
    {
      href: youHref,
      label: t("navYou"),
      icon: User,
      isActive: isYouPath(pathnameForActive, basePath),
    },
  ];

  return (
    <nav
      aria-label={t("marketplaceNavigation")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-marketplace-border bg-marketplace-surface/98 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm motion-reduce:backdrop-blur-none md:hidden"
    >
      <div
        className={cn(
          "grid h-16",
          items.length === 5 ? "grid-cols-5" : "grid-cols-4",
        )}
      >
        {items.map((item) => (
          <BottomNavLink key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
}

interface BottomNavLinkProps {
  href: string;
  label: string;
  icon: typeof House;
  isActive: boolean;
  badgeCount?: number;
}

function BottomNavLink({
  href,
  label,
  icon: Icon,
  isActive,
  badgeCount = 0,
}: BottomNavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-marketplace-muted-foreground transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand motion-reduce:transition-none",
        isActive && "text-marketplace-brand",
      )}
    >
      <span className="relative flex size-[1.375rem] items-center justify-center">
        <Icon className="size-[1.375rem]" weight="regular" aria-hidden="true" />
        {badgeCount > 0 ? (
          <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-marketplace-brand px-0.5 text-[9px] font-semibold leading-none text-marketplace-brand-foreground">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
