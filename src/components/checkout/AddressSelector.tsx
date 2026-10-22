"use client";

import type { Address, Country, State } from "@spree/sdk";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { AddressFormFields } from "@/components/checkout/AddressFormFields";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { User } from "@/contexts/AuthContext";
import type { AddressFormData } from "@/lib/utils/address";

/**
 * A set of saved addresses under the name of the book they came from. A B2B
 * checkout offers the company's sites beside the buyer's own, and the heading
 * is what keeps a warehouse and someone's flat tellable apart in one list.
 */
export interface AddressGroup {
  key: string;
  /** Omitted when there is only one book, which needs no label. */
  heading?: string;
  addresses: Address[];
  /** Company sites belong to the organization's book — correcting one is the
   * account area's job, and the customer endpoint would refuse it. */
  editable: boolean;
}

/**
 * Splits what the cart accepts into the books it came from: the company's
 * sites first, then the buyer's own.
 *
 * Grouped by owner rather than by "company vs mine", so a division's own
 * docks and the headquarters sites it inherits appear under the name of the
 * node that actually holds them. Filing an inherited site under the division
 * tells the buyer it is somewhere it is not.
 *
 * @param personalLabel what to call the buyer's own book, in their language
 */
export function groupByBook(
  addresses: Address[],
  personalLabel: string,
): AddressGroup[] {
  const companyGroups = new Map<string, AddressGroup>();
  const personal: Address[] = [];

  for (const address of addresses) {
    // An address filed in no book at all is nobody's site, so it sits with
    // the buyer's own rather than inventing a group for it.
    const owner = address.owner;
    if (owner?.type !== "company") {
      personal.push(address);
      continue;
    }

    const group = companyGroups.get(owner.id) ?? {
      key: owner.id,
      heading: owner.name ?? undefined,
      addresses: [],
      // The organization's book; the account area curates it, and the
      // customer address endpoint would refuse the write.
      editable: false,
    };
    group.addresses.push(address);
    companyGroups.set(owner.id, group);
  }

  return [
    ...companyGroups.values(),
    {
      key: "personal",
      heading: personalLabel,
      addresses: personal,
      editable: true,
    },
  ];
}

interface AddressSelectorProps {
  groups: AddressGroup[];
  currentAddress: AddressFormData;
  countries: Country[];
  states: State[];
  loadingStates: boolean;
  onChange: (field: keyof AddressFormData, value: string) => void;
  onSelectSavedAddress: (address: Address) => void;
  onEditAddress?: (address: Address) => void;
  onFieldBlur?: () => void;
  idPrefix: string;
  user?: User | null;
}

export function AddressSelector({
  groups,
  currentAddress,
  countries,
  states,
  loadingStates,
  onChange,
  onSelectSavedAddress,
  onEditAddress,
  onFieldBlur,
  idPrefix,
  user,
}: AddressSelectorProps) {
  const t = useTranslations("address");
  const tc = useTranslations("common");

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.addresses.length > 0),
    [groups],
  );
  const savedAddresses = useMemo(
    () => visibleGroups.flatMap((group) => group.addresses),
    [visibleGroups],
  );

  // Derive selected address from current form data — no useEffect needed
  const selectedAddressId = useMemo((): string => {
    if (savedAddresses.length === 0) return "new";
    const match = savedAddresses.find(
      (addr) =>
        addr.address1 === currentAddress.address1 &&
        addr.city === currentAddress.city &&
        addr.postal_code === currentAddress.postal_code &&
        addr.country_code === currentAddress.country_code,
    );
    if (match) return match.id;
    return "new";
  }, [
    savedAddresses,
    currentAddress.address1,
    currentAddress.city,
    currentAddress.postal_code,
    currentAddress.country_code,
  ]);

  const handleSelectAddress = (addressId: string) => {
    if (addressId === "new") {
      // Clear form for new address, pre-fill name from user profile
      onChange("first_name", user?.first_name || "");
      onChange("last_name", user?.last_name || "");
      onChange("address1", "");
      onChange("address2", "");
      onChange("city", "");
      onChange("postal_code", "");
      onChange("phone", "");
      onChange("company", "");
      onChange("country_code", "");
      onChange("state_code", "");
      onChange("state_name", "");
    } else {
      const selectedAddress = savedAddresses.find((a) => a.id === addressId);
      if (selectedAddress) {
        onSelectSavedAddress(selectedAddress);
      }
    }
  };

  // Only fire onFieldBlur when focus leaves the entire selector,
  // not when moving between internal elements (e.g. form → saved address radio).
  const handleContainerBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (!onFieldBlur) return;
      if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
      onFieldBlur();
    },
    [onFieldBlur],
  );

  const showForm = selectedAddressId === "new" || savedAddresses.length === 0;

  return (
    <div onBlur={handleContainerBlur}>
      {/* Saved addresses — bordered container matching Shipping/Payment style */}
      {savedAddresses.length > 0 && (
        <RadioGroup
          value={selectedAddressId}
          onValueChange={handleSelectAddress}
          className="rounded-sm border overflow-hidden gap-0"
        >
          {visibleGroups.map((group, groupIndex) => {
            // Labelled only when there is a second book to tell it from.
            const showHeading = !!group.heading && visibleGroups.length > 1;

            return (
              <div key={group.key}>
                {showHeading && (
                  <p
                    className={`px-4 py-2 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                      groupIndex > 0 ? "border-t" : ""
                    }`}
                  >
                    {group.heading}
                  </p>
                )}
                {group.addresses.map((address, index) => {
                  // A company's own sites all carry its name, which the heading
                  // above already says — so printing it on every row repeats it.
                  // Kept when it differs from the heading, or when there is no
                  // heading to have said it.
                  const company =
                    showHeading && address.company === group.heading
                      ? null
                      : address.company;

                  return (
                    <label
                      key={address.id}
                      className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                        selectedAddressId === address.id
                          ? "bg-blue-50"
                          : "bg-white hover:bg-gray-50"
                      } ${groupIndex > 0 || index > 0 ? "border-t" : ""}`}
                    >
                      <RadioGroupItem
                        value={address.id}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        {/* What the site is called in the book it came from —
                        "Dock B", "Home". A company address names no person
                        and carries the company's name, which is already the
                        heading above, so without this two warehouses differ
                        only by their street. */}
                        {address.label && (
                          <p className="text-sm font-medium text-gray-900">
                            {address.label}
                          </p>
                        )}
                        {(address.full_name || company) && (
                          <span className="text-sm text-gray-900">
                            {address.full_name}
                            {company && (
                              <span className="text-gray-500">
                                {address.full_name ? ", " : ""}
                                {company}
                              </span>
                            )}
                          </span>
                        )}
                        {/* Joined from the parts that are actually present: a
                        company site names no person, and plenty of countries
                        have no subdivision, so interleaving separators by hand
                        leaves stray commas and double spaces. */}
                        <p className="text-sm text-gray-500">
                          {[
                            address.address1,
                            address.address2,
                            address.city,
                            [
                              address.state_text || address.state_name,
                              address.postal_code,
                            ]
                              .filter(Boolean)
                              .join(" "),
                            address.country_name,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      {onEditAddress && group.editable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            onEditAddress(address);
                          }}
                          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 flex-shrink-0"
                        >
                          {tc("edit")}
                        </button>
                      )}
                    </label>
                  );
                })}
              </div>
            );
          })}

          {/* Use a different address option */}
          <label
            className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer border-t transition-colors ${
              selectedAddressId === "new"
                ? "bg-blue-50"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            <RadioGroupItem value="new" />
            <MapPin className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <span className="text-sm text-gray-900">
              {t("useDifferentAddress")}
            </span>
          </label>
        </RadioGroup>
      )}

      {/* Address form (shown when "new" is selected or no saved addresses) */}
      {showForm && (
        <div className={savedAddresses.length > 0 ? "mt-4" : undefined}>
          <AddressFormFields
            address={currentAddress}
            countries={countries}
            states={states}
            loadingStates={loadingStates}
            onChange={onChange}
            idPrefix={idPrefix}
          />
        </div>
      )}
    </div>
  );
}
