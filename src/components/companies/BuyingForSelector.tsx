"use client";

import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { setCartCompany } from "@/lib/data/cart";
import {
  type CompanyMembershipWithCompany,
  getMyCompanies,
} from "@/lib/data/companies";

/**
 * Who this basket is for. It sits on the cart as well as checkout because
 * pricing reads the cart's company: chosen late, the buyer reviews a basket
 * priced for the wrong audience and watches the totals move at the last step.
 *
 * A buyer with one standing sees a statement rather than a choice — the server
 * resolves that case on its own, and a select with one option is a decision
 * nobody has to make. Buying personally stays possible: clearing the company
 * clears its catalog, prices and tax anchoring with it.
 */
export function BuyingForSelector({
  cartId,
  selectedCompanyId,
  memberships: providedMemberships,
}: {
  cartId: string;
  selectedCompanyId: string | null;
  /** Pass them where the page already fetched them; otherwise loaded here. */
  memberships?: CompanyMembershipWithCompany[];
}) {
  const t = useTranslations("companies");
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState<CompanyMembershipWithCompany[] | null>(
    providedMemberships ?? null,
  );

  // Standing is a property of the signed-in buyer, not of the cart, so it is
  // fetched rather than derived — and only when the caller had no reason to
  // have it already.
  useEffect(() => {
    if (providedMemberships) return;
    let active = true;
    getMyCompanies().then((result) => {
      if (active) setLoaded(result.data);
    });
    return () => {
      active = false;
    };
  }, [providedMemberships]);

  const memberships = loaded ?? [];
  if (memberships.length === 0) return null;

  const handleChange = (value: string) => {
    startTransition(async () => {
      await setCartCompany(cartId, value === "" ? null : value);
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
      <Building2 className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{t("buyingFor")}</span>

      {memberships.length === 1 && selectedCompanyId ? (
        <span className="font-medium">{memberships[0].company.name}</span>
      ) : (
        <select
          className="min-w-0 flex-1 bg-transparent font-medium outline-none"
          value={selectedCompanyId ?? ""}
          disabled={pending}
          onChange={(event) => handleChange(event.target.value)}
          aria-label={t("buyingFor")}
        >
          <option value="">{t("buyPersonally")}</option>
          {memberships.map((membership) => (
            <option key={membership.id} value={membership.company.id}>
              {membership.company.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
