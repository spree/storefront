import type { ProductFiltersResponse } from "@spree/sdk";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActiveFilters } from "@/types/filters";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

import { FilterBar } from "./ProductFilters";

const filtersData: ProductFiltersResponse = {
  filters: [],
  sort_options: [{ id: "newest" }],
  default_sort: "newest",
  total_count: 0,
};
const activeFilters: ActiveFilters = { optionValues: [] };

const sellerFilters = {
  ...filtersData,
  filters: [
    {
      id: "seller",
      type: "seller",
      options: [{ id: "maker-1", name: "Juniper Studio", count: 2 }],
    },
  ],
} as ProductFiltersResponse;

describe("collection filter layouts", () => {
  it("stacks filter controls in sidebar layouts and keeps a desktop drawer mode", () => {
    const sidebar = render(
      <FilterBar
        filtersData={filtersData}
        filtersLoading={false}
        activeFilters={activeFilters}
        totalCount={0}
        onFilterChange={vi.fn()}
        layout="left_sidebar"
      />,
    );
    expect(
      sidebar.container.querySelector("[data-theme-filter-controls]")
        ?.className,
    ).toContain("flex-col");
    const allFilterButtons = screen.getAllByRole("button", {
      name: "allFilters",
    });
    expect(allFilterButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(allFilterButtons[0]);
    expect(screen.getAllByRole("heading", { name: "filters" })).toHaveLength(2);
    sidebar.unmount();

    const drawer = render(
      <FilterBar
        filtersData={filtersData}
        filtersLoading={false}
        activeFilters={activeFilters}
        totalCount={0}
        onFilterChange={vi.fn()}
        layout="left_drawer"
      />,
    );
    const drawerTriggers = drawer.container.querySelectorAll(
      "[data-theme-filter-drawer-trigger]",
    );
    const drawerRow = drawerTriggers[drawerTriggers.length - 1]?.parentElement;
    expect(drawerRow?.className).toContain("flex items-center");
    expect(drawerRow?.className).not.toContain("md:hidden");
  });

  it("can hide seller facets for curated collection listings", () => {
    const { container } = render(
      <FilterBar
        filtersData={sellerFilters}
        filtersLoading={false}
        activeFilters={activeFilters}
        totalCount={3}
        onFilterChange={vi.fn()}
      />,
    );

    expect(container.textContent).not.toContain("sellerFilter");
    expect(container.textContent).toContain("productCount");
    fireEvent.click(screen.getAllByRole("button", { name: "allFilters" })[0]);
    expect(screen.queryByText("sellerFilter")).not.toBeInTheDocument();
  });
});
