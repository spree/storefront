"use client";

import type { StoreAddress, StoreCountry, StoreState } from "@spree/sdk";
import { useMemo } from "react";
import type { AddressFormData } from "@/lib/utils/address";
import { AddressFormFields } from "./AddressFormFields";

interface AddressSelectorProps {
  savedAddresses: StoreAddress[];
  currentAddress: AddressFormData;
  countries: StoreCountry[];
  states: StoreState[];
  loadingStates: boolean;
  onChange: (field: keyof AddressFormData, value: string) => void;
  onSelectSavedAddress: (address: StoreAddress) => void;
  onEditAddress?: (address: StoreAddress) => void;
  idPrefix: string;
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
  idPrefix,
}: AddressSelectorProps) {
  // Derive selected address from current form data — no useEffect needed
  const selectedAddressId = useMemo((): string => {
    if (savedAddresses.length === 0) return "new";
    const match = savedAddresses.find(
      (addr) =>
        addr.address1 === currentAddress.address1 &&
        addr.city === currentAddress.city &&
        addr.zipcode === currentAddress.zipcode &&
        addr.country_iso === currentAddress.country_iso,
    );
    if (match) return match.id;
    return "new";
  }, [
    savedAddresses,
    currentAddress.address1,
    currentAddress.city,
    currentAddress.zipcode,
    currentAddress.country_iso,
  ]);

  const handleSelectAddress = (addressId: string) => {
    if (addressId === "new") {
      // Clear form for new address
      onChange("firstname", "");
      onChange("lastname", "");
      onChange("address1", "");
      onChange("address2", "");
      onChange("city", "");
      onChange("zipcode", "");
      onChange("phone", "");
      onChange("company", "");
      onChange("country_iso", "");
      onChange("state_abbr", "");
      onChange("state_name", "");
    } else {
      const selectedAddress = savedAddresses.find((a) => a.id === addressId);
      if (selectedAddress) {
        onSelectSavedAddress(selectedAddress);
      }
    }
  };

  const showForm = selectedAddressId === "new" || savedAddresses.length === 0;

  return (
    <div className="space-y-4">
      {/* Saved addresses selection */}
      {savedAddresses.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Select an address</p>
          <div className="grid gap-3">
            {savedAddresses.map((address) => (
              <div
                key={address.id}
                className={`flex items-start p-4 border rounded-xl transition-colors ${
                  selectedAddressId === address.id
                    ? "border-primary-600 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <label className="flex items-start flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`${idPrefix}-address-selection`}
                    value={address.id}
                    checked={selectedAddressId === address.id}
                    onChange={() => handleSelectAddress(address.id)}
                    className="mt-1 h-4 w-4 text-primary-500 border-gray-300 focus:ring-primary-500"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {address.full_name}
                    </p>
                    {address.company && (
                      <p className="text-sm text-gray-500">{address.company}</p>
                    )}
                    <p className="text-sm text-gray-500">{address.address1}</p>
                    {address.address2 && (
                      <p className="text-sm text-gray-500">
                        {address.address2}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {address.city}, {address.state_text || address.state_name}{" "}
                      {address.zipcode}
                    </p>
                    <p className="text-sm text-gray-500">
                      {address.country_name}
                    </p>
                  </div>
                </label>
                {onEditAddress && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onEditAddress(address);
                    }}
                    className="ml-2 text-sm text-primary-500 hover:text-primary-700 font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
            ))}
            <label
              className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${
                selectedAddressId === "new"
                  ? "border-primary-600 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name={`${idPrefix}-address-selection`}
                value="new"
                checked={selectedAddressId === "new"}
                onChange={() => handleSelectAddress("new")}
                className="h-4 w-4 text-primary-500 border-gray-300 focus:ring-primary-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-900">
                Use a different address
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Address form (shown when "new" is selected or no saved addresses) */}
      {showForm && (
        <div
          className={
            savedAddresses.length > 0
              ? "pt-4 border-t border-gray-200"
              : undefined
          }
        >
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
