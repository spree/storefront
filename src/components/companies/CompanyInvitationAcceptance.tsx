"use client";

import type { CompanyInvitation } from "@spree/sdk";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { acceptCompanyInvitation } from "@/lib/data/companies";

/**
 * Accepting an invitation, for the two people who can arrive here.
 *
 * Someone with no account registers: the account is created with the invited
 * address, which is why the email field is fixed. Someone already signed in
 * simply binds their account — but only if it is the invited address, since
 * the token names one person and the server refuses anyone else.
 */
export function CompanyInvitationAcceptance({
  token,
  invitation,
  basePath,
  signedInEmail,
}: {
  token: string;
  invitation: CompanyInvitation & { company_name: string; store_name: string };
  basePath: string;
  signedInEmail: string | null;
}) {
  const t = useTranslations("companies");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const wrongAccount =
    signedInEmail !== null &&
    signedInEmail.toLowerCase() !== invitation.email.toLowerCase();

  const accept = (registration?: {
    first_name: string;
    last_name: string;
    password: string;
    password_confirmation: string;
  }) => {
    startTransition(async () => {
      const result = await acceptCompanyInvitation(token, registration);
      if (result.success) {
        router.push(`${basePath}/account/companies`);
      } else {
        setError(result.error ?? t("invitationAcceptFailed"));
      }
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <div className="text-center">
        <Building2 className="mx-auto mb-3 size-8 text-muted-foreground" />
        <h1 className="font-semibold text-xl">
          {t("invitationTitle", { company: invitation.company_name })}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("invitationBody", {
            store: invitation.store_name,
            email: invitation.email,
          })}
        </p>
      </div>

      {wrongAccount ? (
        // The token names one person. Saying so plainly beats letting them
        // submit and reading a refusal from the server.
        <p className="rounded-md border border-destructive/50 p-4 text-destructive text-sm">
          {t("invitationWrongAccount", {
            invited: invitation.email,
            current: signedInEmail,
          })}
        </p>
      ) : signedInEmail ? (
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={() => accept()}
        >
          {pending ? t("accepting") : t("acceptAsSignedIn")}
        </Button>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            accept({
              first_name: firstName,
              last_name: lastName,
              password,
              password_confirmation: password,
            });
          }}
        >
          <Field>
            <FieldLabel htmlFor="invitation-first-name">
              {t("firstName")}
            </FieldLabel>
            <Input
              id="invitation-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="invitation-last-name">
              {t("lastName")}
            </FieldLabel>
            <Input
              id="invitation-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="invitation-password">
              {t("password")}
            </FieldLabel>
            <Input
              id="invitation-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("accepting") : t("acceptAndRegister")}
          </Button>
        </form>
      )}

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
