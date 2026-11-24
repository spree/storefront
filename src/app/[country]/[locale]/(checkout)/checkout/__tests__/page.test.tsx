import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data/checkout", () => ({
  getCheckoutOrder: vi.fn(),
}));

vi.mock("@/lib/data/companies", () => ({
  adoptSoleStandingCompany: vi.fn().mockResolvedValue(null),
  getCartAddresses: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/cookies", () => ({
  isAuthenticated: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/data/countries", () => ({
  getCountry: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/data/markets", () => ({
  getMarketCountries: vi.fn().mockResolvedValue({ data: [] }),
  resolveMarket: vi.fn().mockResolvedValue({ id: "mkt_1" }),
}));

vi.mock("../[id]/CheckoutPageContent", () => ({
  CheckoutPageContent: () => null,
}));

import { getCheckoutOrder } from "@/lib/data/checkout";
import { getCartAddresses } from "@/lib/data/companies";
import CheckoutPage from "../[id]/page";

/** Runs the page's async data loader, the server component inside its Suspense. */
function loadCheckout(params: { id: string; country: string; locale: string }) {
  const page = CheckoutPage({
    params: Promise.resolve(params),
  }) as ReactElement<{
    children: ReactElement<{ params: Promise<typeof params> }>;
  }>;
  const loader = page.props.children;
  const render = loader.type as (
    props: typeof loader.props,
  ) => Promise<unknown>;
  return render(loader.props);
}

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a placed order's checkout to its order-placed page, in the URL's language", async () => {
    vi.mocked(getCheckoutOrder).mockResolvedValue({
      id: "or_1",
      current_step: "complete",
    } as Awaited<ReturnType<typeof getCheckoutOrder>>);

    await expect(
      loadCheckout({ id: "cart_1", country: "ca", locale: "fr" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/ca/fr/order-placed/cart_1");
    expect(getCartAddresses).not.toHaveBeenCalled();
  });
});
