import type { Category } from "@spree/sdk";
import { User } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { CartButton } from "@/components/layout/CartButton";
import { SearchToggle } from "@/components/layout/SearchToggle";
import { WishlistNavButton } from "@/components/layout/WishlistNavButton";
import { Button } from "@/components/ui/button";
import { isWholesaleEnabled } from "@/lib/spree";
import { getStoreName } from "@/lib/store";

const LazyMobileMenu = dynamic(
  () =>
    import("@/components/layout/MobileMenu").then((mod) => ({
      default: mod.MobileMenu,
    })),
  {
    loading: () => (
      <div className="inline-flex items-center justify-center h-10 w-10" />
    ),
  },
);

const LazyRegionPreferences = dynamic(
  () =>
    import("@/components/layout/RegionPreferences").then((mod) => ({
      default: mod.RegionPreferences,
    })),
  {
    loading: () => <div className="size-11" aria-hidden="true" />,
  },
);

const storeName = getStoreName();

interface HeaderProps {
  basePath: string;
  locale: Locale;
  mobileNavigation: ReactNode;
}

interface HeaderMobileMenuProps {
  rootCategories: Category[];
  basePath: string;
}

export function HeaderMobileMenu({
  rootCategories,
  basePath,
}: HeaderMobileMenuProps) {
  return (
    <LazyMobileMenu
      rootCategories={rootCategories}
      basePath={basePath}
      wholesaleEnabled={isWholesaleEnabled()}
    />
  );
}

export async function Header({
  basePath,
  locale,
  mobileNavigation,
}: HeaderProps) {
  const t = await getTranslations({ locale, namespace: "header" });
  const wholesaleEnabled = isWholesaleEnabled();

  return (
    <SearchToggle
      basePath={basePath}
      left={mobileNavigation}
      center={
        <Link href={basePath || "/"} className="flex items-center min-w-0">
          <Image
            src="/spree.png"
            alt={storeName}
            width={90}
            height={32}
            className="max-w-full object-contain"
            style={{ width: "auto", height: "auto" }}
            fetchPriority="high"
            loading="eager"
          />
        </Link>
      }
      rightStart={
        <div className="hidden lg:flex lg:items-center lg:gap-1">
          {/* Trade portal entry point — understated, secondary to the catalog nav.
              Only shown when the wholesale addon is enabled. */}
          {wholesaleEnabled && (
            <Link
              href={`${basePath}/wholesale`}
              className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap"
            >
              {t("wholesale")}
            </Link>
          )}
          <LazyRegionPreferences variant="header" />
        </div>
      }
      rightEnd={
        <>
          {/* Account - desktop only */}
          <div className="hidden md:block">
            <Button variant="ghost" size="icon-lg" asChild>
              <Link href={`${basePath}/account`} aria-label={t("account")}>
                <User className="size-5" />
              </Link>
            </Button>
          </div>

          {/* Wishlist */}
          <WishlistNavButton />

          {/* Cart */}
          <CartButton />
        </>
      }
    />
  );
}
