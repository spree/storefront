import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { CompanyAddressBook } from "@/components/companies/CompanyAddressBook";
import { CompanyMembers } from "@/components/companies/CompanyMembers";
import {
  getCompany,
  getCompanyAddresses,
  getCompanyInvitations,
  getCompanyMembers,
} from "@/lib/data/companies";
import { getMarketCountries, resolveMarket } from "@/lib/data/markets";

interface CompanyPageProps {
  params: Promise<{ country: string; locale: string; id: string }>;
}

/**
 * One company node: who may buy for it, and where it takes delivery.
 *
 * Everything here is reached through standing — the server refuses a node the
 * signed-in buyer has no membership over, which is why this page carries no
 * permission checks of its own.
 */
export default async function CompanyPage({ params }: CompanyPageProps) {
  await connection();
  const { country, locale, id } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "companies",
  });

  const [company, members, invitations, addresses, market] = await Promise.all([
    getCompany(id),
    getCompanyMembers(id),
    getCompanyInvitations(id),
    getCompanyAddresses(id),
    resolveMarket(country).catch(() => null),
  ]);

  if (!company) notFound();

  const countriesResponse = market
    ? await getMarketCountries(market.id).catch(() => ({ data: [] }))
    : { data: [] };

  const basePath = `/${country}/${locale}`;

  return (
    <div className="space-y-6">
      <div>
        {company.ancestors.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {company.ancestors.map((node) => node.name).join(" / ")}
          </p>
        )}
        <h1 className="font-semibold text-2xl">{company.name}</h1>
        <Link
          href={`${basePath}/account/companies/${id}/orders`}
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          {t("viewOrders")}
        </Link>
      </div>

      <CompanyMembers
        companyId={id}
        members={members.data}
        invitations={invitations.data}
      />

      <CompanyAddressBook
        companyId={id}
        addresses={addresses.data}
        countries={countriesResponse.data}
      />
    </div>
  );
}
