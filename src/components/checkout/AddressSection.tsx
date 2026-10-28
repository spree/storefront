"use client";

import type {
  Address,
  AddressCreateParams,
  AddressUpdateParams,
  Cart,
  CartAddressParams,
  Country,
  State,
} from "@spree/sdk";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddressEditModal } from "@/components/checkout/AddressEditModal";
import { AddressFormFields } from "@/components/checkout/AddressFormFields";
import {
  AddressSelector,
  groupByBook,
} from "@/components/checkout/AddressSelector";
import { Input } from "@/components/ui/input";
import type { User } from "@/contexts/AuthContext";
import { useCountryStates } from "@/hooks/useCountryStates";
import {
  type AddressFormData,
  addressToFormData,
  formDataToAddress,
  updateAddressField,
} from "@/lib/utils/address";

interface AddressSectionProps {
  cart: Cart;
  countries: Country[];
  /** Everything the cart accepts, each entry naming the book it came out of.
   * Empty for a guest, who keeps no book. */
  selectableAddresses: Address[];
  isAuthenticated: boolean;
  signInUrl: string;
  fetchStates: (countryIso: string) => Promise<State[]>;
  onEmailBlur: (email: string) => Promise<void>;
  onAutoSave: (data: {
    email: string;
    shipping_address?: CartAddressParams;
    shipping_address_id?: string;
  }) => Promise<void>;
  onUpdateSavedAddress?: (
    id: string,
    data: AddressUpdateParams,
  ) => Promise<Address | null>;
  errors?: string[];
  saving?: boolean;
  processing?: boolean;
  user?: User | null;
}

const REQUIRED_ADDRESS_FIELDS: (keyof AddressFormData)[] = [
  "last_name",
  "address1",
  "city",
  "postal_code",
  "country_code",
];

function isAddressComplete(address: AddressFormData): boolean {
  return REQUIRED_ADDRESS_FIELDS.every((field) => address[field].trim() !== "");
}

function buildAutoSaveHash(
  email: string,
  address: AddressFormData,
  savedAddressId?: string,
): string {
  if (savedAddressId) {
    return JSON.stringify({ email, shipping_address_id: savedAddressId });
  }
  return JSON.stringify({
    email,
    shipping_address: formDataToAddress(address),
  });
}

export function AddressSection({
  cart,
  countries,
  selectableAddresses,
  isAuthenticated,
  signInUrl,
  fetchStates,
  onEmailBlur,
  onAutoSave,
  onUpdateSavedAddress,
  errors,
  saving,
  processing,
  user,
}: AddressSectionProps) {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const ta = useTranslations("address");

  // Both books are selectable; the company's sites come first because a
  // purchase for the organization usually goes to one of them.
  const offeredAddresses = [
    ...selectableAddresses.filter(
      (address) => address.owner?.type === "company",
    ),
    ...selectableAddresses.filter(
      (address) => address.owner?.type !== "company",
    ),
  ];

  // Determine initial saved address: use the first saved address when the
  // cart doesn't have a shipping address yet (authenticated users). A company
  // nominates where its deliveries go by default, so that site wins over
  // whichever entry happens to come back first.
  const initialSavedAddress =
    !cart.shipping_address && isAuthenticated && offeredAddresses.length > 0
      ? (offeredAddresses.find((address) => address.is_default_shipping) ??
        offeredAddresses[0])
      : undefined;

  const [email, setEmail] = useState(cart.email || user?.email || "");
  // Lock the email field only once the account email is actually loaded. The
  // server-derived `isAuthenticated` can be true while the AuthContext `user` is
  // still null — during hydration, or after a transient sync is preserved as
  // `stale` — so keying off `isAuthenticated` alone would leave the field
  // disabled and blank, blocking checkout. Gate on the account email instead.
  const hasAccountEmail = isAuthenticated && !!user?.email;
  const defaultCountryIso = countries[0]?.iso ?? "";

  const [shipAddress, setShipAddress] = useState<AddressFormData>(() => {
    if (initialSavedAddress) return addressToFormData(initialSavedAddress);
    const formData = addressToFormData(cart.shipping_address);
    // Pre-fill country from the market's first country when empty
    if (!formData.country_code && defaultCountryIso) {
      formData.country_code = defaultCountryIso;
    }
    // Pre-fill name from user profile when address has no name yet
    if (!formData.first_name && user?.first_name) {
      formData.first_name = user.first_name;
    }
    if (!formData.last_name && user?.last_name) {
      formData.last_name = user.last_name;
    }
    return formData;
  });
  // Held locally so an edit lands in the list without another round-trip.
  const [addresses, setAddresses] = useState(selectableAddresses);
  const addressGroups = groupByBook(addresses, ta("yourAddresses"));
  const addressGroupsHaveEntries = addresses.length > 0;
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<
    string | undefined
  >(initialSavedAddress?.id);

  const [shipStates, isPendingShip] = useCountryStates(
    shipAddress.country_code,
    fetchStates,
  );

  const lastSavedRef = useRef<string>("");
  const mountAutoSaveFiredRef = useRef(false);
  const processingRef = useRef(processing);
  processingRef.current = processing;

  const tryAutoSave = useCallback(
    async (
      currentEmail: string,
      currentAddress: AddressFormData,
      savedAddrId?: string,
    ) => {
      if (!currentEmail.trim()) return;
      if (processingRef.current) return;

      if (savedAddrId) {
        const hash = buildAutoSaveHash(
          currentEmail,
          currentAddress,
          savedAddrId,
        );
        if (hash === lastSavedRef.current) return;
        try {
          await onAutoSave({
            email: currentEmail,
            shipping_address_id: savedAddrId,
          });
          lastSavedRef.current = hash;
        } catch {
          // Allow retry on next blur
        }
        return;
      }

      if (!isAddressComplete(currentAddress)) return;

      const hash = buildAutoSaveHash(currentEmail, currentAddress);
      if (hash === lastSavedRef.current) return;
      try {
        await onAutoSave({
          email: currentEmail,
          shipping_address: formDataToAddress(currentAddress),
        });
        lastSavedRef.current = hash;
      } catch {
        // Allow retry on next blur
      }
    },
    [onAutoSave],
  );

  // Auto-save the pre-selected saved address on mount
  useEffect(() => {
    if (mountAutoSaveFiredRef.current) return;
    if (!initialSavedAddress || !email.trim()) return;

    mountAutoSaveFiredRef.current = true;
    tryAutoSave(
      email,
      addressToFormData(initialSavedAddress),
      initialSavedAddress.id,
    );
  }, [initialSavedAddress, email, tryAutoSave]);

  const updateShipAddress = (field: keyof AddressFormData, value: string) => {
    setShipAddress((prev) => updateAddressField(prev, field, value));
    if (selectedSavedAddressId) {
      setSelectedSavedAddressId(undefined);
    }
  };

  const handleFieldBlur = () => {
    tryAutoSave(email, shipAddress, selectedSavedAddressId);
  };

  // Only fire auto-save when focus leaves the entire form container,
  // not when moving between internal fields.
  const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
    handleFieldBlur();
  };

  const handleEmailBlur = () => {
    // If address is complete, tryAutoSave sends email + address in one call.
    // Only call onEmailBlur (email-only save) when address is incomplete.
    if (isAddressComplete(shipAddress) || selectedSavedAddressId) {
      tryAutoSave(email, shipAddress, selectedSavedAddressId);
    } else {
      onEmailBlur(email);
    }
  };

  const handleSelectSavedAddress = (address: Address) => {
    setShipAddress(addressToFormData(address));
    setSelectedSavedAddressId(address.id);
    // Saved address has all fields filled, trigger auto-save immediately
    tryAutoSave(email, addressToFormData(address), address.id);
  };

  const handleSaveEditedAddress = async (
    data: AddressCreateParams,
    id?: string,
  ) => {
    if (!id || !onUpdateSavedAddress) {
      throw new Error("Cannot update address");
    }

    const updatedAddress = await onUpdateSavedAddress(id, data);
    if (!updatedAddress) {
      throw new Error("Failed to update address");
    }

    // Spread onto the existing entry rather than replacing it: the write
    // answers with a plain address, which does not say which book it is in.
    setAddresses((prev) =>
      prev.map((addr) =>
        addr.id === id ? { ...addr, ...updatedAddress } : addr,
      ),
    );
    handleSelectSavedAddress(updatedAddress);
  };

  return (
    <>
      {/* Errors */}
      {errors && errors.length > 0 && (
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 mb-4">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-700">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Contact section */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">
            {t("contactInformation")}
          </h2>
          {!isAuthenticated && (
            <Link
              href={signInUrl}
              className="text-[13px] text-gray-700 underline underline-offset-2 hover:text-black"
            >
              {t("signIn")}
            </Link>
          )}
        </div>
        <Input
          type="email"
          id="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={handleEmailBlur}
          disabled={hasAccountEmail}
          placeholder={t("emailAddress")}
        />
        {hasAccountEmail && (
          <p className="text-xs text-gray-500 mt-1.5">
            {t("usingAccountEmail")}
          </p>
        )}
      </div>

      {/* Delivery section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">
            {t("shippingAddress")}
          </h2>
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              {tc("saving")}
            </span>
          )}
        </div>
        {isAuthenticated && addressGroupsHaveEntries ? (
          <AddressSelector
            groups={addressGroups}
            currentAddress={shipAddress}
            countries={countries}
            states={shipStates}
            loadingStates={isPendingShip}
            onChange={updateShipAddress}
            onSelectSavedAddress={handleSelectSavedAddress}
            onEditAddress={
              onUpdateSavedAddress
                ? (address) => setEditingAddress(address)
                : undefined
            }
            onFieldBlur={handleFieldBlur}
            idPrefix="ship"
            user={user}
          />
        ) : (
          <div onBlur={handleContainerBlur}>
            <AddressFormFields
              address={shipAddress}
              countries={countries}
              states={shipStates}
              loadingStates={isPendingShip}
              onChange={updateShipAddress}
              idPrefix="ship"
            />
          </div>
        )}
      </div>

      {/* Edit Address Modal */}
      {editingAddress && (
        <AddressEditModal
          address={editingAddress}
          countries={countries}
          fetchStates={fetchStates}
          onSave={handleSaveEditedAddress}
          onClose={() => setEditingAddress(null)}
          title={ta("editAddress")}
        />
      )}
    </>
  );
}
