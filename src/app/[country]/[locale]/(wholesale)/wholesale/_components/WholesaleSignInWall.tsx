"use client";

import { Building2, CircleAlert, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { safeRedirectPath } from "@/lib/utils/path";

interface WholesaleSignInWallProps {
  basePath: string;
  storefrontAccess?: string;
}

/**
 * Landing shown to guests hitting the gated portal. Signs the buyer in through
 * the shared login flow; on success the server layout re-renders and the gate
 * re-evaluates. `?redirect=` returns the buyer to the page they were heading
 * for (defaults to the portal home).
 */
export function WholesaleSignInWall({
  basePath,
  storefrontAccess,
}: WholesaleSignInWallProps) {
  const t = useTranslations("wholesale");
  const ta = useTranslations("account");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const wholesaleBase = `${basePath}/wholesale`;
  const redirectUrl = safeRedirectPath(
    searchParams.get("redirect"),
    wholesaleBase,
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
      router.push(redirectUrl);
      router.refresh();
    } else {
      setError(result.error ?? ta("invalidCredentials"));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="flex flex-col justify-center">
        <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
          <Building2 className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="text-3xl font-bold text-slate-900">
          {t("signInWall.title")}
        </h1>
        <p className="mt-4 text-slate-600">{t("signInWall.description")}</p>
        {storefrontAccess === "login_required" && (
          <p className="mt-4 text-sm text-slate-500">
            {t("signInWall.gatedNotice")}
          </p>
        )}
        <div className="mt-8">
          <p className="text-sm text-slate-600">
            {t("signInWall.noAccount")}{" "}
            <Link
              href={`${wholesaleBase}/apply`}
              className="font-medium text-slate-900 underline underline-offset-4"
            >
              {t("signInWall.applyLink")}
            </Link>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("signInWall.formTitle")}</CardTitle>
          <CardDescription>{t("signInWall.formDescription")}</CardDescription>
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
              <FieldLabel htmlFor="wholesale-email">{ta("email")}</FieldLabel>
              <Input
                type="email"
                spellCheck={false}
                id="wholesale-email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="wholesale-password">
                {ta("password")}
              </FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="wholesale-password"
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
                      showPassword ? ta("hidePassword") : ta("showPassword")
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </Field>

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800"
            >
              {loading ? ta("signingIn") : t("signInWall.submit")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            <Link
              href={`${basePath}/account/forgot-password`}
              className="font-medium text-slate-900 hover:underline"
            >
              {ta("forgotPassword")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
