import { Building2 } from "lucide-react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { CompanyInvitationAcceptance } from "@/components/companies/CompanyInvitationAcceptance";
import { lookupCompanyInvitation } from "@/lib/data/companies";
import { getCustomer } from "@/lib/data/customer";

interface InvitationPageProps {
  params: Promise<{ country: string; locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

/**
 * Where the invite email lands. Deliberately outside the authenticated shell:
 * the invitee usually has no account yet, and the token from the email is the
 * only credential the flow needs.
 */
export default async function CompanyInvitationPage({
  params,
  searchParams,
}: InvitationPageProps) {
  await connection();
  const { country, locale } = await params;
  const { token } = await searchParams;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "companies",
  });

  const basePath = `/${country}/${locale}`;

  if (!token) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-muted-foreground">{t("invitationMissingToken")}</p>
      </div>
    );
  }

  // A spent, revoked or expired token resolves to nothing — the server keeps
  // those out of the pending scope, so there is no invitation to show.
  const [invitation, customer] = await Promise.all([
    lookupCompanyInvitation(token),
    getCustomer().catch(() => null),
  ]);

  if (!invitation) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <Building2 className="mx-auto mb-3 size-8 text-muted-foreground" />
        <h1 className="mb-2 font-semibold text-xl">
          {t("invitationInvalidTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("invitationInvalidBody")}
        </p>
      </div>
    );
  }

  return (
    <CompanyInvitationAcceptance
      token={token}
      invitation={invitation}
      basePath={basePath}
      signedInEmail={customer?.email ?? null}
    />
  );
}
