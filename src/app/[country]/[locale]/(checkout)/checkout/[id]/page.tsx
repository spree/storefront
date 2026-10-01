import type { Address, Cart, Country } from "@spree/sdk";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getAddresses } from "@/lib/data/addresses";
import { getCheckoutOrder } from "@/lib/data/checkout";
import { isAuthenticated as checkAuth } from "@/lib/data/cookies";
import { getCountry } from "@/lib/data/countries";
import { getMarketCountries, resolveMarket } from "@/lib/data/markets";
import {
  getStoreCreditBalance,
  type StoreCreditBalance,
} from "@/lib/data/store-credits";

import { CheckoutPageContent } from "./CheckoutPageContent";

export interface CheckoutInitialData {
  cart: Cart;
  countries: Country[];
  savedAddresses: Address[];
  isAuthenticated: boolean;
  /** null for guests and whenever the balance can't be read. */
  storeCreditBalance: StoreCreditBalance | null;
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
  const [cartData, market, addressesData, storeCreditBalance] =
    await Promise.all([
      getCheckoutOrder(cartId),
      resolveMarket(urlCountry).catch(() => null),
      authStatus ? getAddresses() : Promise.resolve({ data: [] as Address[] }),
      authStatus
        ? getStoreCreditBalance().catch(() => null)
        : Promise.resolve(null),
    ]);

  // Redirect to order-placed if already complete
  if (cartData?.current_step === "complete") {
    const basePath = `/${urlCountry}/en`;
    redirect(`${basePath}/order-placed/${cartId}`);
  }

  const countriesData = market
    ? await getMarketCountries(market.id).catch(() => ({
        data: [] as Country[],
      }))
    : { data: [] as Country[] };

  // Prefetch states for the default country (warms the server cache)
  const defaultIso =
    cartData?.shipping_address?.country_iso ?? countriesData.data[0]?.iso;
  if (defaultIso) {
    getCountry(defaultIso).catch(() => {});
  }

  const initialData: CheckoutInitialData | null = cartData
    ? {
        cart: cartData,
        countries: countriesData.data,
        savedAddresses: addressesData.data,
        isAuthenticated: authStatus,
        storeCreditBalance,
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
