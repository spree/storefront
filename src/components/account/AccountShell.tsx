"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CreditCard,
  Gift,
  Home,
  LogOut,
  MapPin,
  ShoppingBag,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { extractBasePath } from "@/lib/utils/path";

function getNavItems(
  t: ReturnType<typeof useTranslations<"account">>,
  hasCompanies: boolean,
): {
  href: string;
  label: string;
  icon: LucideIcon;
}[] {
  return [
    { href: "/account", label: t("overview"), icon: Home },
    { href: "/account/orders", label: t("orders"), icon: ShoppingBag },
    // Only for buyers who actually act for one — an ordinary shopper never
    // sees that companies exist.
    ...(hasCompanies
      ? [
          {
            href: "/account/companies",
            label: t("companies"),
            icon: Building2,
          },
        ]
      : []),
    { href: "/account/addresses", label: t("addresses"), icon: MapPin },
    {
      href: "/account/credit-cards",
      label: t("paymentMethods"),
      icon: CreditCard,
    },
    { href: "/account/gift-cards", label: t("giftCards"), icon: Gift },
    { href: "/account/profile", label: t("profile"), icon: User },
  ];
}

export function AccountShell({
  children,
  hasCompanies = false,
}: {
  children: React.ReactNode;
  hasCompanies?: boolean;
}) {
  const t = useTranslations("account");
  const pathname = usePathname();
  const router = useRouter();
  const basePath = extractBasePath(pathname);
  const { user, logout } = useAuth();
  const navItems = getNavItems(t, hasCompanies);

  const handleLogout = async () => {
    await logout();
    router.replace(`${basePath}/account`);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8  py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* User Info */}
            <div className="p-4 border-b border-gray-200">
              <p className="font-medium text-gray-900">
                {user?.first_name
                  ? `${user.first_name} ${user.last_name || ""}`.trim()
                  : t("myAccount")}
              </p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>

            {/* Navigation */}
            <nav className="p-2">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const href = `${basePath}${item.href}`;
                  const isActive =
                    pathname === href ||
                    (item.href !== "/account" && pathname.startsWith(href));

                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-gray-50 text-primary"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Logout */}
            <div className="p-2 border-t border-gray-200">
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
                {t("signOut")}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
