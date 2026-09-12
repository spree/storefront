"use client";

import type { Address, AddressParams, Country } from "@spree/sdk";
import { useTranslations } from "next-intl";
import { AddressManagement } from "@/components/addresses/AddressManagement";
import {
  createCompanyAddress,
  deleteCompanyAddress,
  updateCompanyAddress,
} from "@/lib/data/companies";

/**
 * The node's sites — and the ones it inherits from the nodes above it, which
 * is the same set checkout will let a buyer ship to.
 *
 * The book itself is the shopper's address book component: a company keeps
 * addresses the same way a person does, and only where the rows live differs.
 */
export function CompanyAddressBook({
  companyId,
  addresses,
  countries,
}: {
  companyId: string;
  addresses: Address[];
  countries: Country[];
}) {
  const t = useTranslations("companies");

  return (
    <section className="rounded-lg border">
      <header className="border-b p-4">
        <h2 className="font-medium">{t("addresses")}</h2>
        <p className="text-muted-foreground text-sm">{t("addressesHelp")}</p>
      </header>

      <div className="p-4">
        <AddressManagement
          initialAddresses={addresses}
          countries={countries}
          showAddButton
          emptyState={false}
          actions={{
            create: (data: AddressParams) =>
              createCompanyAddress(companyId, data),
            update: (id: string, data: AddressParams) =>
              updateCompanyAddress(companyId, id, data),
            remove: (id: string) => deleteCompanyAddress(companyId, id),
          }}
        />
      </div>
    </section>
  );
}
