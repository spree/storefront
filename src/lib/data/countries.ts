"use server";

import {
  getCountry as _getCountry,
  listCountries as _listCountries,
} from "@spree/next";

export async function getCountries(options?: {
  locale?: string;
  currency?: string;
}) {
  return _listCountries(options);
}

export async function getCountry(
  iso: string,
  options?: { locale?: string; currency?: string },
) {
  return _getCountry(iso, { include: "states" }, options);
}
