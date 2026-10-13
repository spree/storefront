import type { AddressCreateParams, CountryCode } from "@spree/sdk";

export interface AddressFormData {
  first_name: string;
  last_name: string;
  address1: string;
  address2: string;
  city: string;
  postal_code: string;
  phone: string;
  company: string;
  country_code: string;
  state_code: string;
  state_name: string;
}

export const emptyAddress: AddressFormData = {
  first_name: "",
  last_name: "",
  address1: "",
  address2: "",
  city: "",
  postal_code: "",
  phone: "",
  company: "",
  country_code: "",
  state_code: "",
  state_name: "",
};

export function addressToFormData(
  address?: {
    first_name: string | null;
    last_name: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    postal_code: string | null;
    phone: string | null;
    company: string | null;
    country_code: string;
    state_code: string | null;
    state_name: string | null;
  } | null,
): AddressFormData {
  if (!address) return { ...emptyAddress };
  return {
    first_name: address.first_name || "",
    last_name: address.last_name || "",
    address1: address.address1 || "",
    address2: address.address2 || "",
    city: address.city || "",
    postal_code: address.postal_code || "",
    phone: address.phone || "",
    company: address.company || "",
    country_code: address.country_code || "",
    state_code: address.state_code || "",
    state_name: address.state_name || "",
  };
}

export function formDataToAddress(data: AddressFormData): AddressCreateParams {
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    address1: data.address1,
    address2: data.address2 || undefined,
    city: data.city,
    postal_code: data.postal_code,
    phone: data.phone || undefined,
    company: data.company || undefined,
    // The country select only offers the store's own countries.
    country_code: data.country_code as CountryCode,
    state_code: data.state_code || undefined,
    state_name: data.state_name || undefined,
  };
}

/**
 * Returns an updated address with the given field changed.
 * Clears state fields when country changes.
 */
export function updateAddressField(
  address: AddressFormData,
  field: keyof AddressFormData,
  value: string,
): AddressFormData {
  const updated = { ...address, [field]: value };
  if (field === "country_code") {
    updated.state_code = "";
    updated.state_name = "";
  }
  return updated;
}
