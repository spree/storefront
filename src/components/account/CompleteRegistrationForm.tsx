"use client";

import { CircleAlert } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PolicyConsent } from "@/components/policy/PolicyConsent";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { completeSocialRegistration } from "@/lib/data/customer";
import { resolveAccountRedirect } from "@/lib/utils/account-redirect";
import { extractBasePath } from "@/lib/utils/path";
import { socialAuthMessageKey } from "@/lib/utils/social-auth";

/**
 * The one screen a social sign-in needs when the provider returned no email:
 * the address is what turns the verified identity into an account. The account
 * gets no password — the shopper claims one later through the reset flow, the
 * same as an account created at checkout.
 */
export function CompleteRegistrationForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const t = useTranslations("account");

  // Where the sign-in started, carried through the callback's redirect.
  const redirectUrl = resolveAccountRedirect(
    searchParams.get("redirect"),
    basePath,
  );

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [policyConsent, setPolicyConsent] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!policyConsent) {
      setPolicyError(true);
      setError(t("policyConsentRequired"));
      return;
    }

    setSubmitting(true);

    const result = await completeSocialRegistration({
      email,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      terms_of_service: true,
    });

    if (result.success) {
      router.push(redirectUrl ?? `${basePath}/account`);
      return;
    }

    setSubmitting(false);
    setError(t(socialAuthMessageKey(result.error)));
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t("completeRegistrationTitle")}</CardTitle>
        <CardDescription>
          {t("completeRegistrationDescription")}
        </CardDescription>
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
              <FieldLabel htmlFor="first-name">{t("firstName")}</FieldLabel>
              <Input
                id="first-name"
                name="given-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="last-name">{t("lastName")}</FieldLabel>
              <Input
                id="last-name"
                name="family-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <Input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="you@example.com"
            />
          </Field>

          <PolicyConsent
            checked={policyConsent}
            onCheckedChange={(checked) => {
              setPolicyConsent(checked);
              if (checked) setPolicyError(false);
            }}
            error={policyError}
          />

          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="w-full"
          >
            {submitting
              ? t("completingRegistration")
              : t("completeRegistration")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
