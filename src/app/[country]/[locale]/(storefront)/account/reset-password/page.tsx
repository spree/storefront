"use client";

import { CircleAlert, CircleCheck, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
import { resetPassword } from "@/lib/data/customer";
import { extractBasePath } from "@/lib/utils/path";

export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword");
  const ta = useTranslations("account");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // No token = invalid link
  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("invalidLink")}</CardTitle>
            <CardDescription>{t("invalidLinkDescription")}</CardDescription>
          </CardHeader>

          <CardFooter className="justify-center">
            <Link
              href={`${basePath}/account/forgot-password`}
              className="text-sm text-primary hover:text-primary/70 font-medium"
            >
              {t("requestNewLink")}
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      setError(t("passwordsDontMatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setSubmitting(true);

    try {
      const result = await resetPassword(token, password, passwordConfirmation);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || t("linkExpired"));
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CircleCheck className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>{t("success")}</CardTitle>
            <CardDescription>{t("successDescription")}</CardDescription>
          </CardHeader>

          <CardContent>
            <Button size="lg" className="w-full" asChild>
              <Link href={`${basePath}/account`}>{t("signIn")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
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
              <FieldLabel htmlFor="password">{t("newPassword")}</FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="passwordConfirmation">
                {t("confirmPassword")}
              </FieldLabel>
              <div className="relative">
                <Input
                  type={showPasswordConfirmation ? "text" : "password"}
                  id="passwordConfirmation"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setShowPasswordConfirmation(!showPasswordConfirmation)
                    }
                    aria-label={
                      showPasswordConfirmation
                        ? ta("hidePassword")
                        : ta("showPassword")
                    }
                  >
                    {showPasswordConfirmation ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </Field>

            <div className="w-full">
              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full"
              >
                {submitting ? t("resetting") : t("resetPassword")}
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            href={`${basePath}/account`}
            className="text-sm text-primary hover:text-primary/70 font-medium"
          >
            {t("backToSignIn")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
