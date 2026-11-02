"use client";

import { CircleAlert, CircleCheck, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { requestPasswordReset } from "@/lib/data/customer";
import { extractBasePath } from "@/lib/utils/path";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgotPassword");
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const origin = window.location.origin;
      const redirectUrl = `${origin}${basePath}/account/reset-password`;
      const result = await requestPasswordReset(email, redirectUrl);
      if (result?.message) {
        setSubmitted(true);
      } else {
        setError(t("genericError"));
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CircleCheck className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>{t("checkYourEmail")}</CardTitle>
            <CardDescription>
              {t.rich("resetEmailSent", {
                email,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 text-sm text-gray-600">
              <Mail className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" />
              <p>{t("linkExpiry")}</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
            >
              {t("tryDifferentEmail")}
            </Button>
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
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input
                type="email"
                spellCheck={false}
                id="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </Field>

            <div className="w-full">
              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full"
              >
                {submitting ? t("sending") : t("sendResetLink")}
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
