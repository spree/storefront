import type { Product } from "@spree/sdk";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const product = (id: string) => ({ id }) as Product;
const visibleIds = () =>
  screen.getAllByTestId("product-card").map((node) => node.textContent);

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InfiniteProductList", () => {
  it("deduplicates IDs already rendered and repeated within the fetched page", async () => {
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

    await act(async () => {
      intersect?.();
    });

    await waitFor(() => {
      expect(visibleIds()).toEqual(["one", "two", "three"]);
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith({ limit: 12, page: 2 });
  });

  it("does not request a page beyond the last one when the sentinel intersects again", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      data: [product("two"), product("two")],
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

    await act(async () => {
      intersect?.();
    });
    await waitFor(() => {
      expect(visibleIds()).toEqual(["one", "two"]);
    });

    await act(async () => {
      intersect?.();
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
