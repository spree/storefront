"use client";

import {
  CircleAlert,
  CreditCard,
  Eye,
  EyeOff,
  Heart,
  MapPin,
  ShoppingBag,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
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
import { resolveAccountRedirect } from "@/lib/utils/account-redirect";
import { extractBasePath } from "@/lib/utils/path";

export default function AccountPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const t = useTranslations("account");
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  // Get redirect URL from query params (e.g., from checkout)
  const redirectUrl = resolveAccountRedirect(
    searchParams.get("redirect"),
    basePath,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      // Redirect to the specified URL or stay on account page
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    } else {
      setError(result.error || t("invalidCredentials"));
    }
    setLoading(false);
  };

  // Show loading state while auth is initializing
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

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("myAccount")}</CardTitle>
            <CardDescription>{t("signInDescription")}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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

  // Show account dashboard if authenticated
  return (
    <AccountShell>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("accountOverview")}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href={`${basePath}/account/orders`}>
            <Card className="hover:border-gray-300 transition-colors h-full">
              <CardContent className="flex items-center gap-4 py-0">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {t("orderHistory")}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("orderHistoryDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={`${basePath}/account/wishlist`}>
            <Card className="hover:border-gray-300 transition-colors h-full">
              <CardContent className="flex items-center gap-4 py-0">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {t("wishlist")}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("wishlistDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={`${basePath}/account/addresses`}>
            <Card className="hover:border-gray-300 transition-colors h-full">
              <CardContent className="flex items-center gap-4 py-0">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {t("addresses")}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("addressesDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={`${basePath}/account/credit-cards`}>
            <Card className="hover:border-gray-300 transition-colors h-full">
              <CardContent className="flex items-center gap-4 py-0">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {t("paymentMethods")}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("paymentMethodsDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={`${basePath}/account/profile`}>
            <Card className="hover:border-gray-300 transition-colors h-full">
              <CardContent className="flex items-center gap-4 py-0">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {t("profile")}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("profileDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AccountShell>
  );
}
