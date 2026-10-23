"use client";

import type { Country, State } from "@spree/sdk";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { AddressFormData } from "@/lib/utils/address";
import { countryName, sortByCountryName } from "@/lib/utils/format";

interface AddressFormFieldsProps {
  address: AddressFormData;
  countries: Country[];
  states: State[];
  loadingStates: boolean;
  onChange: (field: keyof AddressFormData, value: string) => void;
  idPrefix: string;
}

export function AddressFormFields({
  address,
  countries,
  states,
  loadingStates,
  onChange,
  idPrefix,
}: AddressFormFieldsProps) {
  const t = useTranslations("address");
  const locale = useLocale();
  const sortedCountries = useMemo(
    () => sortByCountryName(countries, locale),
    [countries, locale],
  );
  const tc = useTranslations("common");
  const hasStates = states.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Country — full width, floating label style */}
      <div className="relative">
        <NativeSelect
          id={`${idPrefix}-country`}
          aria-label={t("country")}
          className="w-full"
          value={address.country_code}
          onChange={(e) => onChange("country_code", e.target.value)}
          required
        >
          <NativeSelectOption value="" disabled>
            {t("selectCountry")}
          </NativeSelectOption>
          {sortedCountries.map((country) => (
            <NativeSelectOption key={country.iso} value={country.iso}>
              {countryName(country.iso, locale)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {/* First name / Last name */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="text"
          id={`${idPrefix}-first_name`}
          aria-label={t("firstName")}
          value={address.first_name}
          onChange={(e) => onChange("first_name", e.target.value)}
          placeholder={t("firstName")}
        />
        <Input
          type="text"
          id={`${idPrefix}-last_name`}
          aria-label={t("lastName")}
          required
          value={address.last_name}
          onChange={(e) => onChange("last_name", e.target.value)}
          placeholder={t("lastName")}
        />
      </div>

      {/* Company */}
      <Input
        type="text"
        id={`${idPrefix}-company`}
        aria-label={t("company")}
        value={address.company}
        onChange={(e) => onChange("company", e.target.value)}
        placeholder={t("company")}
      />

      {/* Address */}
      <Input
        type="text"
        id={`${idPrefix}-address1`}
        aria-label={t("address")}
        required
        value={address.address1}
        onChange={(e) => onChange("address1", e.target.value)}
        placeholder={t("address")}
      />

      {/* Apartment */}
      <Input
        type="text"
        id={`${idPrefix}-address2`}
        aria-label={t("apartment")}
        value={address.address2}
        onChange={(e) => onChange("address2", e.target.value)}
        placeholder={t("apartment")}
      />

      {/* City / State / ZIP — 3 columns */}
      <div className="grid grid-cols-3 gap-3">
        <Input
          type="text"
          id={`${idPrefix}-city`}
          aria-label={t("city")}
          required
          value={address.city}
          onChange={(e) => onChange("city", e.target.value)}
          placeholder={t("city")}
        />
        {loadingStates ? (
          <NativeSelect
            id={`${idPrefix}-state`}
            aria-label={t("stateProvince")}
            className="w-full"
            disabled
          >
            <NativeSelectOption value="">{tc("loading")}</NativeSelectOption>
          </NativeSelect>
        ) : hasStates ? (
          <NativeSelect
            id={`${idPrefix}-state`}
            aria-label={t("stateProvince")}
            className="w-full"
            value={address.state_code}
            onChange={(e) => onChange("state_code", e.target.value)}
            required
          >
            <NativeSelectOption value="" disabled>
              {t("selectState")}
            </NativeSelectOption>
            {states.map((state) => (
              <NativeSelectOption key={state.abbr} value={state.abbr}>
                {state.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : (
          <Input
            type="text"
            id={`${idPrefix}-state`}
            aria-label={t("stateProvince")}
            value={address.state_name}
            onChange={(e) => onChange("state_name", e.target.value)}
            placeholder={t("stateProvince")}
          />
        )}
        <Input
          type="text"
          id={`${idPrefix}-postal_code`}
          aria-label={t("zipCode")}
          required
          value={address.postal_code}
          onChange={(e) => onChange("postal_code", e.target.value)}
          placeholder={t("zipCode")}
        />
      </div>

      {/* Phone */}
      <Input
        type="tel"
        id={`${idPrefix}-phone`}
        aria-label={t("phone")}
        value={address.phone}
        onChange={(e) => onChange("phone", e.target.value)}
        placeholder={t("phone")}
      />
    </div>
  );
}
