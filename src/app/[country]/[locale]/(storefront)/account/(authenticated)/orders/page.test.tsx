import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getOrders: vi.fn() }));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations:
    async () => (key: string, values?: Record<string, unknown>) =>
      key === "pageIndicator"
        ? `Page ${values?.page} of ${values?.pages}`
        : key,
}));
vi.mock("@/lib/data/orders", () => ({ getOrders: mocks.getOrders }));
vi.mock("@/components/account/AccountPageHeader", () => ({
  AccountPageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/account/OrderList", () => ({
  OrderList: ({ orders }: { orders: Array<{ number: string }> }) => (
    <div>{orders.map((order) => order.number).join(", ")}</div>
  ),
}));

import OrdersPage from "./page";

function response(page: number, pages: number) {
  return {
    data: [
      {
        id: `order-${page}`,
        number: `R${page}`,
        completed_at: "2026-10-01T12:00:00Z",
      },
    ],
    meta: { page, pages, count: pages * 25, limit: 25 },
  };
}

describe("OrdersPage pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests the selected page and links to adjacent pages", async () => {
    mocks.getOrders.mockResolvedValue(response(2, 3));
    const page = await OrdersPage({
      params: Promise.resolve({ country: "us", locale: "en" }),
      searchParams: Promise.resolve({ page: "2" }),
    });

    render(page);

    expect(mocks.getOrders).toHaveBeenCalledWith({
      page: 2,
      limit: 25,
      sort: "completed_at desc",
    });
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "previousPage" })).toHaveAttribute(
      "href",
      "/us/en/account/orders?page=1",
    );
    expect(screen.getByRole("link", { name: "nextPage" })).toHaveAttribute(
      "href",
      "/us/en/account/orders?page=3",
    );
  });

  it("clamps a page beyond the last result to the final page", async () => {
    mocks.getOrders
      .mockResolvedValueOnce(response(1, 2))
      .mockResolvedValueOnce(response(2, 2));
    const page = await OrdersPage({
      params: Promise.resolve({ country: "us", locale: "en" }),
      searchParams: Promise.resolve({ page: "99" }),
    });

    render(page);

    expect(mocks.getOrders).toHaveBeenNthCalledWith(2, {
      page: 2,
      limit: 25,
      sort: "completed_at desc",
    });
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "nextPage" })).toBeNull();
  });
});
