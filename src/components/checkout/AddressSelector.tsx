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
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.key}>
              {/* Labelled only when there is a second book to tell it from. */}
              {group.heading && visibleGroups.length > 1 && (
                <p
                  className={`px-4 py-2 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                    groupIndex > 0 ? "border-t" : ""
                  }`}
                >
                  {group.heading}
                </p>
              )}
              {group.addresses.map((address, index) => (
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
                    <span className="text-sm text-gray-900">
                      {address.full_name}
                      {address.company && (
                        <span className="text-gray-500">
                          , {address.company}
                        </span>
                      )}
                    </span>
                    <p className="text-sm text-gray-500">
                      {address.address1}
                      {address.address2 && `, ${address.address2}`},{" "}
                      {address.city}, {address.state_text || address.state_name}{" "}
                      {address.postal_code}, {address.country_name}
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
              ))}
            </div>
          ))}

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
