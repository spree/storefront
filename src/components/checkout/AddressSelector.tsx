"use client";

import type { Address, Country, State } from "@spree/sdk";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { AddressFormFields } from "@/components/checkout/AddressFormFields";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { User } from "@/contexts/AuthContext";
import type { AddressFormData } from "@/lib/utils/address";

interface AddressSelectorProps {
  savedAddresses: Address[];
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
  savedAddresses,
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
          {savedAddresses.map((address, index) => (
            <label
              key={address.id}
              className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                selectedAddressId === address.id
                  ? "bg-blue-50"
                  : "bg-white hover:bg-gray-50"
              } ${index > 0 ? "border-t" : ""}`}
            >
              <RadioGroupItem value={address.id} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-900">
                  {address.full_name}
                  {address.company && (
                    <span className="text-gray-500">, {address.company}</span>
                  )}
                </span>
                <p className="text-sm text-gray-500">
                  {address.address1}
                  {address.address2 && `, ${address.address2}`}, {address.city},{" "}
                  {address.state_text || address.state_name}{" "}
                  {address.postal_code}, {address.country_name}
                </p>
              </div>
              {onEditAddress && (
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
