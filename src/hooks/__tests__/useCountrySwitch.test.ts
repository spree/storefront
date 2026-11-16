import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCart } from "@/contexts/CartContext";
import type { CountryWithMarket } from "@/contexts/StoreContext";
import { updateCartMarket } from "@/lib/data/checkout";
import { setStoreCookies } from "@/lib/utils/cookies";
import { useCountrySwitch } from "../useCountrySwitch";

const mockPathname = vi.hoisted(() => ({ value: "/us/en/products" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: vi.fn(),
}));

vi.mock("@/lib/data/checkout", () => ({
  updateCartMarket: vi.fn(),
}));

vi.mock("@/lib/utils/cookies", () => ({
  setStoreCookies: vi.fn(),
}));

vi.mock("@/lib/utils/account-redirect", () => ({
  rebaseAccountRedirectSearch: vi.fn((search: string) => search),
}));

const mockUseCart = vi.mocked(useCart);
const mockUpdateCartMarket = vi.mocked(updateCartMarket);
const mockSetStoreCookies = vi.mocked(setStoreCookies);

const targetCountry = {
  iso: "DE",
  currency: "EUR",
  default_locale: "de",
  supported_locales: ["de", "en"],
} as unknown as CountryWithMarket;

describe("useCountrySwitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCartMarket.mockResolvedValue({
      success: true,
      cart: null as never,
    } as never);
    mockUseCart.mockReturnValue({
      cart: {
        id: "cart-1",
        currency: "USD",
        locale: "en",
      } as never,
      loading: false,
      refreshCart: vi.fn().mockResolvedValue(undefined),
    } as never);
  });

  afterEach(() => {
    mockPathname.value = "/us/en/products";
    document.head.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("blocks switching while the cart is still loading", async () => {
    mockUseCart.mockReturnValue({
      cart: null,
      loading: true,
      refreshCart: vi.fn().mockResolvedValue(undefined),
    } as never);

    const { result } = renderHook(() =>
      useCountrySwitch({
        currentCountry: "us",
        currentLocale: "en",
      }),
    );
    expect(result.current.isCartLoading).toBe(true);

    let switched = true;
    await act(async () => {
      switched = await result.current.handleCountrySelect(targetCountry, "de");
    });

    expect(switched).toBe(false);
    expect(mockUpdateCartMarket).not.toHaveBeenCalled();
    expect(mockSetStoreCookies).not.toHaveBeenCalled();
  });

  it("updates the cart and preserves the current path when switching", async () => {
    const refreshCart = vi.fn().mockResolvedValue(undefined);
    mockUseCart.mockReturnValue({
      cart: {
        id: "cart-1",
        currency: "USD",
        locale: "en",
      } as never,
      loading: false,
      refreshCart,
    } as never);

    const { result } = renderHook(() =>
      useCountrySwitch({
        currentCountry: "us",
        currentLocale: "en",
      }),
    );
    const mockAssign = vi.fn();
    vi.stubGlobal("window", {
      location: { assign: mockAssign, hash: "", search: "" },
    });

    await act(async () => {
      await result.current.handleCountrySelect(targetCountry, "de");
    });

    expect(mockUpdateCartMarket).toHaveBeenCalledWith("cart-1", {
      currency: "EUR",
      locale: "de",
    });
    expect(refreshCart).toHaveBeenCalledOnce();
    expect(mockSetStoreCookies).toHaveBeenCalledWith("de", "de");
    expect(mockAssign).toHaveBeenCalledWith("/de/de/products");
  });

  it("rebases a login return target when switching market", async () => {
    const { rebaseAccountRedirectSearch } = await import(
      "@/lib/utils/account-redirect"
    );
    vi.mocked(rebaseAccountRedirectSearch).mockReturnValueOnce(
      "?redirect=%2Fde%2Fde%2Faccount%2Forders",
    );

    const { result } = renderHook(() =>
      useCountrySwitch({
        currentCountry: "us",
        currentLocale: "en",
      }),
    );
    const mockAssign = vi.fn();
    vi.stubGlobal("window", {
      location: {
        assign: mockAssign,
        hash: "",
        search: "?redirect=%2Fus%2Fen%2Faccount%2Forders",
      },
    });

    await act(async () => {
      await result.current.handleCountrySelect(targetCountry, "de");
    });

    expect(rebaseAccountRedirectSearch).toHaveBeenCalledWith(
      "?redirect=%2Fus%2Fen%2Faccount%2Forders",
      "/us/en",
      "/de/de",
    );
    expect(mockAssign).toHaveBeenCalledWith(
      "/de/de/products?redirect=%2Fde%2Fde%2Faccount%2Forders",
    );
  });

  it("lands on the target locale's translated slug", async () => {
    mockPathname.value = "/fr/fr/products/friteuse-a-air-double-panier-8l";
    document.head.innerHTML = `
      <link rel="alternate" hreflang="fr-FR" href="https://shop.example/fr/fr/products/friteuse-a-air-double-panier-8l" />
      <link rel="alternate" hreflang="de-DE" href="https://shop.example/de/de/products/doppelkorb-heissluftfritteuse-8l" />
      <link rel="alternate" hreflang="x-default" href="https://shop.example/us/en/products/dual-basket-air-fryer-8l" />
    `;

    const { result } = renderHook(() =>
      useCountrySwitch({
        currentCountry: "fr",
        currentLocale: "fr",
      }),
    );
    const mockAssign = vi.fn();
    vi.stubGlobal("window", {
      location: { assign: mockAssign, hash: "", search: "" },
    });

    await act(async () => {
      await result.current.handleCountrySelect(targetCountry, "de");
    });

    expect(mockAssign).toHaveBeenCalledWith(
      "/de/de/products/doppelkorb-heissluftfritteuse-8l",
    );
  });

  it("does not reuse a translated slug when the page has no alternates", async () => {
    mockPathname.value = "/fr/fr/products/friteuse-a-air-double-panier-8l";

    const { result } = renderHook(() =>
      useCountrySwitch({
        currentCountry: "fr",
        currentLocale: "fr",
      }),
    );
    const mockAssign = vi.fn();
    vi.stubGlobal("window", {
      location: { assign: mockAssign, hash: "", search: "" },
    });

    await act(async () => {
      await result.current.handleCountrySelect(targetCountry, "de");
    });

    expect(mockAssign).toHaveBeenCalledWith("/de/de/products");
  });
});
