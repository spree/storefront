import { act, render, screen, waitFor } from "@testing-library/react";
import type { Product } from "@spree/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InfiniteProductList } from "./InfiniteProductList";

let intersect: (() => void) | undefined;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/products/ProductCard", () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <div data-testid="product-card">{product.id}</div>
  ),
}));

beforeEach(() => {
  intersect = undefined;
  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      intersect = () =>
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
    }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

describe("InfiniteProductList", () => {
  it("does not render duplicate IDs from previous pages or within a response", async () => {
    const product = (id: string) => ({ id }) as Product;
    const fetchPage = vi.fn().mockResolvedValue({
      data: [product("one"), product("two"), product("two"), product("three")],
      meta: { pages: 2 },
    });

    render(
      <InfiniteProductList
        initialProducts={[product("one")]}
        initialPage={1}
        totalPages={2}
        listParams={{ limit: 12 }}
        fetchPage={fetchPage}
        basePath="/us/en"
      />,
    );

    expect(intersect).toBeDefined();
    await act(async () => {
      intersect?.();
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("product-card")).toHaveLength(3);
    });
    expect(screen.getAllByTestId("product-card").map((node) => node.textContent)).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect(fetchPage).toHaveBeenCalledWith({ limit: 12, page: 2 });
  });
});
