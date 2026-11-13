"use client";

import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  Gift,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AccountUnderlineTabs } from "@/components/account/AccountUnderlineTabs";
import { MessagesNavBadge } from "@/components/account/MessagesNavBadge";
import { MarketplacePage } from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import { cn } from "@/lib/utils";
import { extractBasePath } from "@/lib/utils/path";

interface AccountNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "messages";
  primary?: boolean;
}

interface AccountNavGroup {
  label: string;
  items: AccountNavItem[];
}

function getNavGroups(
  t: ReturnType<typeof useTranslations<"account">>,
): AccountNavGroup[] {
  return [
    {
      label: t("shoppingGroup"),
      items: [
        {
          href: "/account",
          label: t("overview"),
          icon: Home,
          primary: true,
        },
        {
          href: "/account/orders",
          label: t("orders"),
          icon: ShoppingBag,
          primary: true,
        },
        {
          href: "/account/reviews",
          label: t("reviews"),
          icon: Star,
          primary: true,
        },
        {
          href: "/account/gift-cards",
          label: t("giftCards"),
          icon: Gift,
          primary: true,
        },
        {
          href: "/account/favorites",
          label: t("favorites"),
          icon: Heart,
          primary: true,
        },
        {
          href: "/account/followed-shops",
          label: t("followedShops"),
          icon: Store,
        },
        {
          href: "/account/saved-searches",
          label: t("savedSearches"),
          icon: Search,
        },
      ],
    },
    {
      label: t("communicationGroup"),
      items: [
        {
          href: "/account/messages",
          label: t("messages"),
          icon: MessageCircle,
          badge: "messages",
          primary: true,
        },
      ],
    },
    {
      label: t("accountGroup"),
      items: [
        {
          href: "/account/settings/account",
          label: t("accountSettings"),
          icon: Settings,
        },
      ],
    },
  ];
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("account");
  const pathname = usePathname();
  const router = useRouter();
  const basePath = extractBasePath(pathname);
  const { user, logout } = useAuth();
  const { general } = useStoreThemeSettings();
  const showWishlist = themeSettingEnabled(general?.enable_wishlist, true);
  const navGroups = getNavGroups(t)
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => showWishlist || item.href !== "/account/favorites")
        .map((item) =>
          item.href === "/account/favorites" &&
          typeof general?.wishlist_page_slug === "string" &&
          general.wishlist_page_slug
            ? {
                ...item,
                href: `/pages/${encodeURIComponent(general.wishlist_page_slug)}`,
              }
            : item,
        ),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    await logout();
    router.replace(`${basePath}/account`);
  };

  return (
    <MarketplacePage className="max-w-[1600px] bg-transparent py-6 lg:py-10">
      <div className="mb-6 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <AccountIdentity user={user} fallback={t("myAccount")} compact />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="shrink-0 gap-1.5 rounded-full px-2.5 text-xs text-marketplace-muted-foreground hover:text-marketplace-foreground"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            {t("signOut")}
          </Button>
        </div>
        <AccountMobileNavigation
          groups={navGroups}
          basePath={basePath}
          pathname={pathname}
          className="mt-3"
        />
      </div>

      <div className="flex gap-8 xl:gap-12">
        <aside className="hidden w-64 shrink-0 lg:block xl:w-72">
          <div className="sticky top-6">
            <AccountIdentity user={user} fallback={t("myAccount")} />
            <AccountNavigation
              groups={navGroups}
              basePath={basePath}
              pathname={pathname}
              className="mt-5"
              compact
            />
            <div className="mt-5 border-t border-marketplace-border-subtle pt-3">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-marketplace-muted-foreground hover:text-marketplace-foreground"
              >
                <LogOut className="size-4" />
                {t("signOut")}
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {isCommunicationPath(pathname, basePath) ? (
            <CommunicationNavigation
              pathname={pathname}
              basePath={basePath}
              labels={{
                messages: t("messages"),
                offers: t("offers"),
                customOrders: t("customOrders"),
                navigation: t("communicationGroup"),
              }}
            />
          ) : null}
          {children}
        </main>
      </div>
    </MarketplacePage>
  );
}

function AccountMobileNavigation({
  groups,
  basePath,
  pathname,
  className,
}: {
  groups: AccountNavGroup[];
  basePath: string;
  pathname: string;
  className?: string;
}) {
  const items = groups
    .flatMap((group) => group.items)
    .filter((item) => item.primary);

  return (
    <nav aria-label="Account" className={className}>
      <ul className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive =
            pathname === href ||
            (item.href !== "/account" && pathname.startsWith(`${href}/`)) ||
            (item.href === "/account/messages" &&
              isCommunicationPath(pathname, basePath)) ||
            (item.href.startsWith("/account/settings") &&
              pathname.startsWith(`${basePath}/account/settings`));

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                data-account-nav-link="true"
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-full border border-marketplace-border/70 bg-marketplace-surface/80 px-3 text-sm font-medium text-marketplace-muted-foreground transition-colors",
                  isActive &&
                    "border-marketplace-brand/20 bg-marketplace-curator text-marketplace-brand",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge === "messages" ? <MessagesNavBadge /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AccountNavigation({
  groups,
  basePath,
  pathname,
  className,
  compact = false,
}: {
  groups: AccountNavGroup[];
  basePath: string;
  pathname: string;
  className?: string;
  compact?: boolean;
}) {
  const primaryItems = groups
    .flatMap((group) => group.items)
    .filter((item) => item.primary);
  const additionalGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.primary),
    }))
    .filter((group) => group.items.length > 0);
  const renderItem = (item: AccountNavItem): React.ReactNode => {
    const href = `${basePath}${item.href}`;
    const isActive =
      pathname === href ||
      (item.href !== "/account" && pathname.startsWith(`${href}/`)) ||
      (item.href === "/account/messages" &&
        isCommunicationPath(pathname, basePath)) ||
      (item.href.startsWith("/account/settings") &&
        pathname.startsWith(`${basePath}/account/settings`));

    return (
      <li key={item.href}>
        <Link
          href={href}
          aria-current={isActive ? "page" : undefined}
          data-account-nav-link="true"
          className={cn(
            "flex min-h-10 items-center gap-3 rounded-[var(--marketplace-radius-sm)] px-3 py-2 text-sm font-medium text-marketplace-muted-foreground",
            isActive && "font-semibold text-marketplace-foreground",
          )}
        >
          <item.icon className="size-4" aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          {item.badge === "messages" ? <MessagesNavBadge /> : null}
        </Link>
      </li>
    );
  };

  const renderGroups = (itemsByGroup: AccountNavGroup[]) => (
    <div className="space-y-1">
      {itemsByGroup.map((group) => {
        const groupIsActive = group.items.some((item) => {
          const href = `${basePath}${item.href}`;
          return pathname === href || pathname.startsWith(href);
        });

        return (
          <details
            key={group.label}
            open={groupIsActive || undefined}
            className="group/navgroup"
          >
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--marketplace-radius-sm)] px-3 py-2 text-sm font-medium text-marketplace-muted-foreground transition-colors hover:bg-marketplace-surface-warm hover:text-marketplace-foreground [&::-webkit-details-marker]:hidden">
              <span>{group.label}</span>
              <ChevronDown
                className="size-4 shrink-0 transition-transform group-open/navgroup:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <ul className="mt-0.5 space-y-0.5 pl-2">
              {group.items.map(renderItem)}
            </ul>
          </details>
        );
      })}
    </div>
  );

  const renderFlatGroups = (itemsByGroup: AccountNavGroup[]) => (
    <div className="mt-4 space-y-5 border-t border-marketplace-border-subtle pt-5">
      {itemsByGroup.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h2 className="px-3 pb-1.5 text-xs font-semibold uppercase text-marketplace-muted-foreground">
            {group.label}
          </h2>
          <ul className="space-y-0.5">{group.items.map(renderItem)}</ul>
        </section>
      ))}
    </div>
  );

  return (
    <nav aria-label="Account" className={className}>
      {compact ? (
        <>
          <ul className="space-y-0.5">{primaryItems.map(renderItem)}</ul>
          {additionalGroups.length > 0
            ? renderFlatGroups(additionalGroups)
            : null}
        </>
      ) : (
        renderGroups(groups)
      )}
    </nav>
  );
}

function isCommunicationPath(pathname: string, basePath: string) {
  return [
    "/account/messages",
    "/account/offers",
    "/account/custom-orders",
  ].some((path) => {
    const href = `${basePath}${path}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}

function CommunicationNavigation({
  pathname,
  basePath,
  labels,
}: {
  pathname: string;
  basePath: string;
  labels: {
    messages: string;
    offers: string;
    customOrders: string;
    navigation: string;
  };
}) {
  const tabs = [
    { href: "/account/messages", label: labels.messages },
    { href: "/account/offers", label: labels.offers },
    { href: "/account/custom-orders", label: labels.customOrders },
  ];

  return (
    <AccountUnderlineTabs
      aria-label={labels.navigation}
      className="mb-5"
      tabs={tabs.map((tab) => {
        const href = `${basePath}${tab.href}`;
        return {
          href,
          label: tab.label,
          endAdornment:
            tab.href === "/account/messages" ? <MessagesNavBadge /> : undefined,
          isActive: pathname === href || pathname.startsWith(`${href}/`),
        };
      })}
    />
  );
}

function AccountIdentity({
  user,
  fallback,
  compact = false,
}: {
  user:
    | {
        first_name?: string | null;
        last_name?: string | null;
        email?: string;
        avatar_url?: string | null;
      }
    | null
    | undefined;
  fallback: string;
  compact?: boolean;
}) {
  const displayName = getDisplayName(user, fallback);
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        compact ? "pb-1" : "border-b border-marketplace-border-subtle pb-5",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-marketplace-surface-warm font-semibold text-marketplace-brand",
          compact ? "size-11 text-sm" : "size-12 text-base",
        )}
      >
        {user?.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="size-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-semibold text-marketplace-foreground",
            compact ? "text-sm" : "font-display text-base",
          )}
        >
          {displayName}
        </span>
        {user?.email ? (
          <span className="mt-0.5 block truncate text-xs text-marketplace-muted-foreground">
            {user.email}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function getDisplayName(
  user:
    | { first_name?: string | null; last_name?: string | null }
    | null
    | undefined,
  fallback: string,
) {
  return user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : fallback;
}
