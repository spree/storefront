import type { Cart, Product } from "@spree/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  forgetKlaviyo,
  identifyKlaviyo,
  trackKlaviyoAddedToCart,
  trackKlaviyoStartedCheckout,
  trackKlaviyoViewedProduct,
} from "./klaviyo";

const product = {
  id: "prod_1",
  name: "Linen Shirt",
  slug: "linen-shirt",
  thumbnail_url: "https://cdn.example.com/shirt.webp",
  price: { amount: "49.90", currency: "EUR" },
  default_variant: { id: "variant_1", sku: "SHIRT-M" },
  categories: [{ name: "Shirts" }],
} as unknown as Product;

const cart = {
  id: "cart_1",
  email: "ada@example.com",
  total: "104.80",
  items: [
    {
      id: "li_1",
      variant_id: "variant_1",
      name: "Linen Shirt",
      slug: "linen-shirt",
      price: "49.90",
      quantity: 2,
      thumbnail_url: "https://cdn.example.com/shirt.webp",
    },
  ],
} as unknown as Cart;

describe("Klaviyo onsite events", () => {
  const track = vi.fn();
  const identify = vi.fn();

  afterEach(() => {
    delete (window as unknown as { klaviyo?: unknown }).klaviyo;
    vi.restoreAllMocks();
  });

  describe("without Klaviyo's script", () => {
    it("does nothing", () => {
      expect(() => {
        trackKlaviyoViewedProduct(product, "/us/en");
        trackKlaviyoAddedToCart(product, null, 1, "/us/en");
        trackKlaviyoStartedCheckout(cart, "/us/en");
        identifyKlaviyo("ada@example.com");
      }).not.toThrow();
    });
  });

  describe("with Klaviyo's script", () => {
    beforeEach(() => {
      track.mockReset();
      identify.mockReset();
      (window as unknown as { klaviyo: unknown }).klaviyo = { track, identify };
    });

    it("sends Viewed Product with Klaviyo's item properties", () => {
      trackKlaviyoViewedProduct(product, "/us/en");

      expect(track).toHaveBeenCalledWith("Viewed Product", {
        ProductID: "prod_1",
        SKU: "SHIRT-M",
        ProductName: "Linen Shirt",
        ItemPrice: 49.9,
        ProductURL: `${window.location.origin}/us/en/products/linen-shirt`,
        ImageURL: "https://cdn.example.com/shirt.webp",
        Categories: ["Shirts"],
      });
    });

    it("sends Added to Cart with the quantity and its value", () => {
      trackKlaviyoAddedToCart(product, null, 2, "/us/en");

      expect(track).toHaveBeenCalledWith(
        "Added to Cart",
        expect.objectContaining({
          ProductName: "Linen Shirt",
          Quantity: 2,
          $value: 99.8,
          AddedItemQuantity: 2,
        }),
      );
    });

    it("sends Started Checkout keyed by the cart and the time, linking to the cart page", () => {
      vi.spyOn(Date, "now").mockReturnValue(1_793_800_000_000);

      trackKlaviyoStartedCheckout(cart, "/us/en");

      expect(track).toHaveBeenCalledWith("Started Checkout", {
        $event_id: "cart_1_1793800000",
        $value: 104.8,
        ItemNames: ["Linen Shirt"],
        Items: [
          {
            ProductID: "variant_1",
            ProductName: "Linen Shirt",
            Quantity: 2,
            ItemPrice: 49.9,
            RowTotal: 99.8,
            ProductURL: `${window.location.origin}/us/en/products/linen-shirt`,
            ImageURL: "https://cdn.example.com/shirt.webp",
          },
        ],
        CheckoutURL: `${window.location.origin}/us/en/cart`,
      });
    });

    it("identifies the shopper by email", () => {
      identifyKlaviyo("ada@example.com");

      expect(identify).toHaveBeenCalledWith({ email: "ada@example.com" });
    });

    it("identifies nobody without an email", () => {
      identifyKlaviyo(null);

      expect(identify).not.toHaveBeenCalled();
    });

    it("never lets Klaviyo break the page", () => {
      track.mockImplementation(() => {
        throw new Error("blocked");
      });

      expect(() => trackKlaviyoViewedProduct(product, "/us/en")).not.toThrow();
    });
  });
});

describe("forgetKlaviyo", () => {
  afterEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API
    document.cookie = "__kla_id=; Max-Age=0; path=/";
  });

  it("reports nothing to forget when Klaviyo set no identity", async () => {
    expect(await forgetKlaviyo()).toBe(false);
  });

  it("expires the identity cookie", async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API
    document.cookie = "__kla_id=eyJjaWQiOiJhYmMifQ; path=/";

    expect(await forgetKlaviyo()).toBe(true);
    expect(document.cookie).not.toContain("__kla_id=");
  });
});
