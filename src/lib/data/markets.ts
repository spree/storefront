"use server";

import {
  listMarketCountries as _listMarketCountries,
  listMarkets as _listMarkets,
  resolveMarket as _resolveMarket,
} from "@spree/next";

export async function getMarkets() {
  return _listMarkets();
}

export async function resolveMarket(country: string) {
  return _resolveMarket(country);
}

export async function getMarketCountries(marketId: string) {
  return _listMarketCountries(marketId);
}
