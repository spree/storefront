import { Building2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { getMyCompanies } from "@/lib/data/companies";

interface CompaniesPageProps {
  params: Promise<{ country: string; locale: string }>;
}

/**
 * The buyer's standing — every company node they may act for. A buyer with one
 * membership is sent straight to it: a list of one is a page they would only
 * ever click through.
 */
export default async function CompaniesPage({ params }: CompaniesPageProps) {
  await connection();
  const { country, locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "companies",
  });

  const { data: memberships } = await getMyCompanies();
  const basePath = `/${country}/${locale}`;

  if (memberships.length === 1) {
    redirect(`${basePath}/account/companies/${memberships[0].company.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Building2 className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {memberships.map((membership) => (
            <li key={membership.id}>
              <Link
                href={`${basePath}/account/companies/${membership.company.id}`}
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <Building2 className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {membership.company.name}
                  </span>
                  {/* The path to the root, so two nodes with the same name in
                      different parts of the tree are told apart. */}
                  {membership.company.ancestors.length > 0 && (
                    <span className="block truncate text-muted-foreground text-sm">
                      {membership.company.ancestors
                        .map((node) => node.name)
                        .join(" / ")}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
