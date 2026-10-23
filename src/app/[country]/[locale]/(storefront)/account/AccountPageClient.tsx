"use client";

import type { AuthProvider, Order } from "@spree/sdk";
import {
  ArrowUpRight,
  CircleAlert,
  Eye,
  EyeOff,
  Gift,
  MessageCircle,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import { SocialLoginButtons } from "@/components/account/SocialLoginButtons";
import { AuthTurnstile } from "@/components/security/AuthTurnstile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useTurnstileConfig } from "@/hooks/use-turnstile-config";
import { listAuthProviders } from "@/lib/data/customer";
import { getUnreadMessageCount } from "@/lib/data/messages";
import { getOrders } from "@/lib/data/orders";
import { resolveAccountRedirect } from "@/lib/utils/account-redirect";
import { formatDate } from "@/lib/utils/format";
import { extractBasePath } from "@/lib/utils/path";

export function AccountPageClient({ discovery }: { discovery?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const t = useTranslations("account");
  const orderT = useTranslations("orders");
  const {
    login,
    completeMfaLogin,
    isAuthenticated,
    loading: authLoading,
    user,
  } = useAuth();

  const redirectUrl = resolveAccountRedirect(
    searchParams.get("redirect"),
    basePath,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [authProviders, setAuthProviders] = useState<AuthProvider[]>([]);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { required: turnstileRequired } = useTurnstileConfig("login");

  useEffect(() => {
    if (isAuthenticated) return;
    void listAuthProviders().then((result) => {
      if (result.success) {
        setAuthProviders(result.providers ?? []);
      }
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    setOrdersLoading(true);

    void getOrders({ limit: 4 })
      .then((response) => {
        if (active) {
          setRecentOrders(
            (Array.isArray(response?.data) ? response.data : [])
              .filter((order) => order.completed_at !== null)
              .slice(0, 4),
          );
        }
      })
      .catch((loadError) => {
        console.error("Failed to load account orders", loadError);
        if (active) setRecentOrders([]);
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    void getUnreadMessageCount()
      .then((count) => {
        if (active) setUnreadMessages(count);
      })
      .catch(() => {
        if (active) setUnreadMessages(0);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mfaToken) {
      const result = await completeMfaLogin(mfaToken, mfaCode);
      if (result.success) {
        setMfaToken(null);
        setMfaCode("");
        if (redirectUrl) {
          router.push(redirectUrl);
        }
      } else {
        setError(result.error || t("invalidCredentials"));
      }
      setLoading(false);
      return;
    }

    if (turnstileRequired && !turnstileToken) {
      setError(t("turnstileRequired"));
      setLoading(false);
      return;
    }

    const result = await login(email, password, turnstileToken ?? undefined);
    if (result.success) {
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    } else if (result.mfaRequired && result.mfaToken) {
      setMfaToken(result.mfaToken);
      setError(null);
    } else {
      setError(result.error || t("invalidCredentials"));
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("myAccount")}</CardTitle>
            <CardDescription>{t("signInDescription")}</CardDescription>
          </CardHeader>

          <CardContent>
            <SocialLoginButtons
              providers={authProviders}
              returnTo={redirectUrl || `${basePath}/account`}
              disabled={loading}
            />
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {mfaToken ? (
                <Field>
                  <FieldLabel htmlFor="mfa-code">
                    {t("authenticatorCode")}
                  </FieldLabel>
                  <Input
                    type="text"
                    id="mfa-code"
                    name="one-time-code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required
                    placeholder="123456"
                  />
                </Field>
              ) : null}

              {!mfaToken ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="current-password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? t("hidePassword") : t("showPassword")
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Field>

                  <div className="flex justify-end">
                    <Link
                      href={`${basePath}/account/forgot-password`}
                      className="text-sm text-primary hover:text-primary/70 font-medium"
                    >
                      {t("forgotPassword")}
                    </Link>
                  </div>
                </>
              ) : null}

              {!mfaToken ? (
                <AuthTurnstile
                  action="login"
                  onTokenChange={setTurnstileToken}
                />
              ) : null}

              <div className="w-full">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  {loading ? t("signingIn") : t("signIn")}
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              {t("dontHaveAccount")}{" "}
              <Link
                href={`${basePath}/account/register`}
                className="text-primary hover:text-primary/70 font-medium"
              >
                {t("signUp")}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : t("myAccount");

  return (
    <AccountShell>
      <div className="space-y-8">
        <header className="space-y-4 border-b border-marketplace-border-subtle pb-6">
          <div>
            <p className="text-sm text-marketplace-muted-foreground">
              {t("welcomeBack", { name: displayName })}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight text-marketplace-brand md:text-4xl">
              {t("accountOverview")}
            </h1>
            {user?.email ? (
              <p className="mt-2 text-sm text-marketplace-muted-foreground">
                {user.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {unreadMessages > 0 ? (
              <Link
                href={`${basePath}/account/messages`}
                className="inline-flex items-center gap-2 rounded-full bg-marketplace-surface-warm px-3 py-1.5 text-sm font-medium text-marketplace-brand transition-[transform,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                {t("unreadMessagesAction", { count: unreadMessages })}
              </Link>
            ) : null}
            <Button variant="link" size="sm" asChild className="h-auto px-0">
              <Link href={`${basePath}/account/orders`}>
                {t("viewAllOrders")}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            {!ordersLoading && recentOrders.length === 0 ? (
              <Button variant="link" size="sm" asChild className="h-auto px-0">
                <Link href={`${basePath}/products`}>
                  {orderT("startShopping")}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </div>
        </header>

        <section aria-labelledby="recent-orders-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck
                  className="size-5 text-marketplace-brand"
                  aria-hidden="true"
                />
                <h2
                  id="recent-orders-heading"
                  className="font-display text-xl font-semibold tracking-tight text-marketplace-foreground"
                >
                  {t("orderHistory")}
                </h2>
              </div>
              <p className="mt-1 text-sm text-marketplace-muted-foreground">
                {t("recentOrdersDescription")}
              </p>
            </div>
            <Button variant="link" size="sm" asChild className="h-auto px-0">
              <Link href={`${basePath}/account/orders`}>
                {t("orders")}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {ordersLoading ? (
            <div
              className="space-y-3 rounded-[var(--marketplace-radius-md)] bg-marketplace-surface-warm/70 p-2"
              role="status"
              aria-live="polite"
              aria-label={t("loading")}
            >
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-16 animate-pulse rounded-[var(--marketplace-radius-sm)] bg-marketplace-surface"
                />
              ))}
            </div>
          ) : recentOrders.length > 0 ? (
            <ul className="space-y-2">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`${basePath}/account/orders/${order.id}`}
                    className="group flex flex-wrap items-center justify-between gap-x-5 gap-y-2 rounded-[var(--marketplace-radius-md)] bg-marketplace-surface-warm/80 px-4 py-4 transition-[transform,background-color] duration-150 ease-out hover:bg-marketplace-surface-warm hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand sm:px-5"
                  >
                    <span className="flex min-w-0 items-center gap-3.5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--marketplace-radius-sm)] bg-marketplace-surface text-marketplace-brand">
                        <ShoppingBag className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-marketplace-foreground">
                          #{order.number}
                          {order.seller_name ? (
                            <span className="font-normal text-marketplace-muted-foreground">
                              {" "}
                              · {order.seller_name}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-marketplace-muted-foreground">
                          {formatDate(order.completed_at, "-")}
                        </span>
                      </span>
                    </span>
                    <span className="ml-14 flex shrink-0 items-center gap-2 text-sm font-semibold tabular-nums text-marketplace-foreground sm:ml-0">
                      {order.display_total}
                      <ArrowUpRight
                        className="size-4 text-marketplace-muted-foreground transition-transform duration-150 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--marketplace-radius-md)] bg-marketplace-surface-warm/80 px-4 py-5 sm:px-5">
              <div>
                <p className="text-sm font-medium text-marketplace-foreground">
                  {orderT("noOrders")}
                </p>
                <p className="mt-1 text-sm text-marketplace-muted-foreground">
                  {orderT("noOrdersDescription")}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${basePath}/products`}>
                  {orderT("startShopping")}
                </Link>
              </Button>
            </div>
          )}
        </section>

        <section
          aria-labelledby="gift-cards-heading"
          className="space-y-3 border-t border-marketplace-border-subtle pt-6"
        >
          <h2
            id="gift-cards-heading"
            className="text-xs font-semibold uppercase tracking-wider text-marketplace-muted-foreground"
          >
            {t("overviewMenu")}
          </h2>
          <Link
            href={`${basePath}/account/gift-cards`}
            className="group flex items-start gap-4 rounded-[var(--marketplace-radius-md)] bg-marketplace-surface-warm/80 px-4 py-4 transition-colors duration-200 hover:bg-marketplace-surface-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand sm:px-5"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--marketplace-radius-sm)] bg-marketplace-surface text-marketplace-brand">
              <Gift className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-marketplace-foreground">
                  {t("giftCards")}
                </span>
                <ArrowUpRight
                  className="size-4 shrink-0 text-marketplace-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-1 block text-xs leading-5 text-marketplace-muted-foreground">
                {t("giftCardsDescription")}
              </span>
            </span>
          </Link>
        </section>

        {discovery}
      </div>
    </AccountShell>
  );
}
