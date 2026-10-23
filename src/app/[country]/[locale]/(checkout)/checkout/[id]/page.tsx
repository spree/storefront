import type { Address, Cart, Country } from "@spree/sdk";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCheckoutOrder } from "@/lib/data/checkout";
import {
  adoptSoleStandingCompany,
  getCartAddresses,
} from "@/lib/data/companies";
import { isAuthenticated as checkAuth } from "@/lib/data/cookies";
import { getCountry } from "@/lib/data/countries";
import { getMarketCountries, resolveMarket } from "@/lib/data/markets";

import { CheckoutPageContent } from "./CheckoutPageContent";

export interface CheckoutInitialData {
  cart: Cart;
  countries: Country[];
  isAuthenticated: boolean;
  /** Everything the cart accepts — the buyer's own book plus the sites of the
   * company the purchase is for, each naming the book it came out of. */
  selectableAddresses: Address[];
}

interface CheckoutPageProps {
  params: Promise<{
    id: string;
    country: string;
    locale: string;
  }>;
}

async function CheckoutDataLoader({ params }: CheckoutPageProps) {
  await connection();

  const { id: cartId, country: urlCountry } = await params;

  // Check auth first so we can skip address fetch for guests
  const authStatus = await checkAuth();

  // Fetch initial data in parallel during SSR
  const [loadedCart, market] = await Promise.all([
    getCheckoutOrder(cartId),
    resolveMarket(urlCountry).catch(() => null),
  ]);

  // Redirect to order-placed if already complete
  if (loadedCart?.current_step === "complete") {
    const basePath = `/${urlCountry}/en`;
    redirect(`${basePath}/order-placed/${cartId}`);
  }

  // Before the addresses are read, since the company decides which sites are
  // on offer — and before the totals are rendered, since it also decides the
  // catalog and the prices.
  const cartData =
    authStatus && loadedCart
      ? ((await adoptSoleStandingCompany(loadedCart)) ?? loadedCart)
      : loadedCart;

  // Which addresses checkout may offer depends on who the purchase is for, so
  // the cart is asked rather than the books fetched beside it. Guests keep no
  // book and the call needs an account, so skip it for them.
  const selectableAddresses =
    authStatus && cartData ? await getCartAddresses(cartData.id) : [];

  const countriesData = market
    ? await getMarketCountries(market.id).catch(() => ({
        data: [] as Country[],
      }))
    : { data: [] as Country[] };

  // Prefetch states for the default country (warms the server cache)
  const defaultIso =
    cartData?.shipping_address?.country_code ?? countriesData.data[0]?.iso;
  if (defaultIso) {
    getCountry(defaultIso).catch(() => {});
  }

  const initialData: CheckoutInitialData | null = cartData
    ? {
        cart: cartData,
        countries: countriesData.data,
        isAuthenticated: authStatus,
        selectableAddresses,
      }
    : null;

  return (
    <CheckoutPageContent
      cartId={cartId}
      urlCountry={urlCountry}
      initialData={initialData}
    />
  );
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  return (
    <Suspense>
      <CheckoutDataLoader params={params} />
    </Suspense>
  );
}
