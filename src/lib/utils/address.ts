import type { AddressParams } from "@spree/sdk";

export interface AddressFormData {
  first_name: string;
  last_name: string;
  address1: string;
  address2: string;
  city: string;
  postal_code: string;
  phone: string;
  company: string;
  country_iso: string;
  state_abbr: string;
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
  country_iso: "",
  state_abbr: "",
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
    country_iso: string;
    state_abbr: string | null;
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
    country_iso: address.country_iso || "",
    state_abbr: address.state_abbr || "",
    state_name: address.state_name || "",
  };
}

export function formDataToAddress(data: AddressFormData): AddressParams {
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    address1: data.address1,
    address2: data.address2 || undefined,
    city: data.city,
    postal_code: data.postal_code,
    phone: data.phone || undefined,
    company: data.company || undefined,
    // The form keeps the names the storefront has always used; the API took
    // the ISO-code rename, so the conversion happens here at the boundary
    // rather than through every field in the checkout flow.
    country_code: data.country_iso,
    state_abbr: data.state_abbr || undefined,
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
  if (field === "country_iso") {
    updated.state_abbr = "";
    updated.state_name = "";
  }
  return updated;
}
