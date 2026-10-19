import type { Address, Cart, Country } from "@spree/sdk";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCheckoutOrder } from "@/lib/data/checkout";
import { getCheckoutAddressBook } from "@/lib/data/companies";
import { isAuthenticated as checkAuth } from "@/lib/data/cookies";
import { getCountry } from "@/lib/data/countries";
import { getMarketCountries, resolveMarket } from "@/lib/data/markets";

import { CheckoutPageContent } from "./CheckoutPageContent";

export interface CheckoutInitialData {
  cart: Cart;
  countries: Country[];
  savedAddresses: Address[];
  isAuthenticated: boolean;
  /** The company's sites, offered beside the buyer's own book when the
   * purchase is for a company. */
  companyAddresses: Address[];
  company: { id: string; name: string } | null;
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
  const [cartData, market] = await Promise.all([
    getCheckoutOrder(cartId),
    resolveMarket(urlCountry).catch(() => null),
  ]);

  // Redirect to order-placed if already complete
  if (cartData?.current_step === "complete") {
    const basePath = `/${urlCountry}/en`;
    redirect(`${basePath}/order-placed/${cartId}`);
  }

  // Which book checkout may offer depends on who the purchase is for, so it
  // follows the cart rather than being fetched beside it.
  const addressBook =
    authStatus && cartData
      ? await getCheckoutAddressBook(cartData.company_id)
      : {
          company: null,
          companyAddresses: [] as Address[],
          personalAddresses: [] as Address[],
        };

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
        savedAddresses: addressBook.personalAddresses,
        isAuthenticated: authStatus,
        companyAddresses: addressBook.companyAddresses,
        company: addressBook.company,
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
