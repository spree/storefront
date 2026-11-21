// @vitest-environment node
import { createHmac } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_CATALOG_EVENTS } from "@/lib/webhooks/products";
import { POST } from "./route";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/webhooks/handlers", () => ({
  handleDataRequestConfirmation: vi.fn(),
  handleOrderCanceled: vi.fn(),
  handleOrderFulfilled: vi.fn(),
  handleOrderPlaced: vi.fn(),
  handlePasswordReset: vi.fn(),
}));

const SECRET = "whsec_test";
const mockRevalidateTag = vi.mocked(revalidateTag);

function signedRequest(
  name: string,
  data: unknown,
  secret = SECRET,
): NextRequest {
  const body = JSON.stringify({ id: "evt_1", name, data });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return new NextRequest("https://shop.example/api/webhooks/spree", {
    method: "POST",
    body,
    headers: {
      "x-spree-webhook-signature": signature,
      "x-spree-webhook-timestamp": timestamp,
      "x-spree-webhook-event": name,
    },
  });
}

const product = { id: "prod_86Rf07xd4z", slug: "dual-basket-air-fryer" };

describe("POST /api/webhooks/spree — product events", () => {
  beforeEach(() => {
    vi.stubEnv("SPREE_WEBHOOK_SECRET", SECRET);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(PRODUCT_CATALOG_EVENTS)(
    "expires product lists, search and the product on %s",
    async (name) => {
      const response = await POST(signedRequest(name, product));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true, handled: true });
      const tags = mockRevalidateTag.mock.calls.map(([tag]) => tag);
      expect(tags).toEqual(
        expect.arrayContaining([
          "products",
          "products-wholesale",
          "product-filters",
          "product-filters-wholesale",
          "product:prod_86Rf07xd4z",
          "product:dual-basket-air-fryer",
          "product:prod_86Rf07xd4z-wholesale",
          "product:dual-basket-air-fryer-wholesale",
        ]),
      );
      for (const [, profile] of mockRevalidateTag.mock.calls) {
        expect(profile).toEqual({ expire: 0 });
      }
    },
  );

  it("rejects a product event with a bad signature", async () => {
    const response = await POST(
      signedRequest("product.drafted", product, "wrong_secret"),
    );

    expect(response.status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("ignores product events the storefront does not cache on", async () => {
    const response = await POST(signedRequest("product.out_of_stock", product));

    expect(await response.json()).toEqual({ received: true, handled: false });
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
