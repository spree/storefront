import { getProduct, getStore, getTaxon } from "@spree/next";
import { cache } from "react";

export const getCachedProduct = cache(
  (slugOrId: string, expand: string[], locale: string) =>
    getProduct(slugOrId, { expand }, { locale }),
);

export const getCachedTaxon = cache(
  (idOrPermalink: string, expand: string[], locale: string) =>
    getTaxon(idOrPermalink, { expand }, { locale }),
);

export const getCachedStore = cache((locale: string) => getStore({ locale }));
