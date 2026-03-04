"use server";

import {
  getCountry as _getCountry,
  listCountries as _listCountries,
} from "@spree/next";

export async function getCountries() {
  return _listCountries();
}

export async function getCountry(iso: string) {
  return _getCountry(iso, { expand: "states" });
}
