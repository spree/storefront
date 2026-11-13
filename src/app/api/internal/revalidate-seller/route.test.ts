import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => mocks);

import { OPTIONS, POST } from "./route";

describe("seller storefront revalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.STOREFRONT_REVALIDATE_SECRET;
    delete process.env.NEXT_PUBLIC_STOREFRONT_REVALIDATE_SECRET;
    delete process.env.SELLER_PANEL_ORIGIN;
    delete process.env.NEXT_PUBLIC_SELLER_PANEL_URL;
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    "http://127.0.0.1:5176",
    "http://localhost:5176",
    "https://sellers.feature-shop.spree.localhost",
  ])("allows the seller editor origin %s to refresh buyer shop data", async (origin) => {
    const request = new Request(
      "http://storefront.test/api/internal/revalidate-seller",
      {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({ slug: "Dev-Seller-01" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(await response.json()).toMatchObject({
      revalidated: true,
      slug: "Dev-Seller-01",
      tag: "seller-storefront:dev-seller-01",
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith(
      "seller-storefront:dev-seller-01",
      {
        expire: 0,
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/[country]/[locale]/sellers/[slug]",
      "page",
    );
  });

  it("does not grant cross-origin access to unrelated local sites", async () => {
    const request = new Request(
      "http://storefront.test/api/internal/revalidate-seller",
      {
        method: "OPTIONS",
        headers: { origin: "http://localhost:9999" },
      },
    );

    const response = await OPTIONS(request);

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
