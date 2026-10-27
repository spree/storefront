"use client";

import {
  Building2,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
} from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { registerCompany } from "@/lib/data/companies";
import { extractBasePath } from "@/lib/utils/path";
import { wholesaleSignInHref } from "@/lib/wholesale";

/**
 * Wholesale registration. Creates the account when the visitor has none, then
 * founds their company through the Store API — two calls so one form reads as
 * one step, which is what the API expects a storefront to do.
 *
 * Whether the new company may trade immediately is the store's activation
 * policy's answer, so this page does not promise either outcome: it hands the
 * buyer to the portal, where the posture decides what they see. A merchant
 * running an approval process gets the awaiting-review screen there, and a
 * store with the default policy gets prices straight away.
 */
export default function WholesaleApplyPage() {
  const t = useTranslations("wholesale");
  const ta = useTranslations("account");
  const tr = useTranslations("register");
  const pathname = usePathname();
  const storeBase = extractBasePath(pathname);
  const wholesaleBase = `${storeBase}/wholesale`;
  const { register } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(tr("passwordTooShort"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await register({
        email,
        password,
        password_confirmation: password,
        ...(firstName && { first_name: firstName }),
        ...(lastName && { last_name: lastName }),
        ...(phone && { phone }),
      });
      if (!result.success) {
        setError(result.error ?? tr("registrationFailed"));
        return;
      }

      // The account exists and is signed in, so the company can be founded on
      // the buyer's own credential. A refusal here leaves them with a usable
      // account, which is why the message is shown rather than swallowed —
      // they can reach the portal and try again from the register prompt.
      const companyResult = await registerCompany({
        name: company.trim(),
        ...(phone.trim() && { registration: { phone: phone.trim() } }),
      });
      if (!companyResult.success) {
        setError(companyResult.error ?? t("apply.companyFailed"));
        return;
      }

      setSubmitted(true);
    } catch {
      setError(tr("unexpectedError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-700" />
            </div>
            <CardTitle>{t("apply.receivedTitle")}</CardTitle>
            <CardDescription>{t("apply.receivedDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="bg-slate-900 hover:bg-slate-800">
              <Link href={wholesaleBase}>{t("apply.goToPortal")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Building2 className="h-6 w-6 text-slate-700" />
          </div>
          <CardTitle>{t("apply.title")}</CardTitle>
          <CardDescription>{t("apply.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="apply-first">{tr("firstName")}</FieldLabel>
                <Input
                  id="apply-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder={tr("firstNamePlaceholder")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="apply-last">{tr("lastName")}</FieldLabel>
                <Input
                  id="apply-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder={tr("lastNamePlaceholder")}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="apply-company">
                {t("apply.companyLabel")}
              </FieldLabel>
              <Input
                id="apply-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                placeholder={t("apply.companyPlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="apply-phone">
                {t("apply.phoneLabel")}
              </FieldLabel>
              <Input
                id="apply-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("apply.phonePlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="apply-email">{ta("email")}</FieldLabel>
              <Input
                id="apply-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="apply-password">{ta("password")}</FieldLabel>
              <div className="relative">
                <Input
                  id="apply-password"
                  type={showPassword ? "text" : "password"}
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
              disabled={submitting}
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800"
            >
              {submitting ? tr("creatingAccount") : t("apply.submit")}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t("apply.alreadyMember")}{" "}
            <Link
              href={wholesaleSignInHref(storeBase)}
              className="font-medium text-slate-900 hover:underline"
            >
              {t("signInWall.submit")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
