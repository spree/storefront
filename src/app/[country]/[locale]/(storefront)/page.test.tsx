import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMerchandisingPlacements: vi.fn(),
  getHomePersonalizationComposition: vi.fn(),
  resolveCurrency: vi.fn(),
  editorialStorefrontEnabled: vi.fn(),
  themeTemplateHomeEnabled: vi.fn(),
  getActiveTheme: vi.fn(),
  getResolvedTemplate: vi.fn(),
  themePageRender: vi.fn(),
  templateRender: vi.fn(),
  marketplaceHomeRender: vi.fn(),
}));

vi.mock("@/lib/data/merchandising", () => ({
  getMerchandisingPlacements: mocks.getMerchandisingPlacements,
}));
vi.mock("next/server", () => ({
  connection: vi.fn(),
}));
vi.mock("@/lib/data/markets", () => ({
  resolveCurrency: mocks.resolveCurrency,
}));
vi.mock("@/lib/data/storefront-personalization", () => ({
  getHomePersonalizationComposition: mocks.getHomePersonalizationComposition,
}));
vi.mock("@/lib/theme/flags", () => ({
  editorialStorefrontEnabled: mocks.editorialStorefrontEnabled,
  themeTemplateHomeEnabled: mocks.themeTemplateHomeEnabled,
}));
vi.mock("@/lib/theme/resolver", () => ({
  getActiveTheme: mocks.getActiveTheme,
  getResolvedTemplate: mocks.getResolvedTemplate,
  themeGroupHasContent: (document?: { order?: string[] }) =>
    Boolean(document?.order?.length),
}));
vi.mock("@/components/theme/ThemePageRenderer", () => ({
  ThemePageRenderer: (props: unknown) => {
    mocks.themePageRender(props);
    return <div data-testid="theme-homepage" />;
  },
}));
vi.mock("@/components/theme/ThemeTemplateRenderer", () => ({
  ThemeTemplateRenderer: (props: unknown) => {
    mocks.templateRender(props);
    return <div data-testid="editorial-homepage" />;
  },
}));
vi.mock("@/components/home/MarketplaceHomeEditorialHero", () => ({
  MarketplaceHomeEditorialHero: () => (
    <div data-testid="marketplace-home-hero" />
  ),
}));
vi.mock("@/components/home/MarketplaceHomeSections", () => ({
  MarketplaceHomeSections: (props: unknown) => {
    mocks.marketplaceHomeRender(props);
    return <div data-testid="marketplace-homepage" />;
  },
}));

import { HomePageContent } from "./HomePageContent";
import HomePage from "./page";

describe("storefront homepage theme template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMerchandisingPlacements.mockResolvedValue([]);
    mocks.getHomePersonalizationComposition.mockResolvedValue({});
    mocks.resolveCurrency.mockResolvedValue("USD");
    mocks.editorialStorefrontEnabled.mockReturnValue(false);
    mocks.themeTemplateHomeEnabled.mockReturnValue(true);
    mocks.getActiveTheme.mockResolvedValue({ id: "theme-1", settings: {} });
  });

  it("renders the published non-empty section template by default", async () => {
    mocks.getResolvedTemplate.mockResolvedValue({
      full_key: "home.default",
      data: {
        order: ["hero"],
        sections: { hero: { type: "hero", settings: {} } },
      },
    });

    render(
      await HomePageContent({
        country: "us",
        locale: "en",
        basePath: "/us/en",
      }),
    );

    expect(screen.getByTestId("theme-homepage")).toBeInTheDocument();
    expect(mocks.themePageRender).toHaveBeenCalledOnce();
    expect(
      screen.queryByTestId("marketplace-homepage"),
    ).not.toBeInTheDocument();
  });

  it("renders the new marketplace homepage when the saved template has no sections", async () => {
    mocks.getResolvedTemplate.mockResolvedValue({
      full_key: "home.default",
      data: { order: [], sections: {} },
    });

    await renderLegacyHome();

    expect(screen.getByTestId("marketplace-home-hero")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-homepage")).toBeInTheDocument();
    expect(mocks.themePageRender).not.toHaveBeenCalled();
  });

  it("renders the new marketplace homepage when theme data cannot be loaded", async () => {
    mocks.getActiveTheme.mockResolvedValue(null);
    mocks.getResolvedTemplate.mockResolvedValue(null);

    await renderLegacyHome();

    expect(screen.getByTestId("marketplace-home-hero")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-homepage")).toBeInTheDocument();
    expect(mocks.themePageRender).not.toHaveBeenCalled();
  });

  it("does not restore the old homepage when theme rendering is disabled", async () => {
    mocks.themeTemplateHomeEnabled.mockReturnValue(false);

    await renderLegacyHome();

    expect(screen.getByTestId("marketplace-homepage")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-home-hero")).toBeInTheDocument();
    expect(mocks.marketplaceHomeRender).toHaveBeenCalledOnce();
    expect(mocks.themePageRender).not.toHaveBeenCalled();
  });

  it("shows a neutral loading shell before homepage data resolves", async () => {
    mocks.resolveCurrency.mockReturnValue(new Promise(() => {}));
    render(
      await HomePage({
        params: Promise.resolve({ country: "us", locale: "en" }),
      }),
    );

    expect(screen.getByLabelText("Loading homepage")).toBeInTheDocument();
    expect(mocks.themePageRender).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId("marketplace-homepage"),
    ).not.toBeInTheDocument();
  });

  it("leaves the editorial campaign available while merchandising waits for theme chrome", async () => {
    mocks.editorialStorefrontEnabled.mockReturnValue(true);
    mocks.themeTemplateHomeEnabled.mockReturnValue(false);
    let resolveTheme!: (value: null) => void;
    mocks.getActiveTheme.mockReturnValue(
      new Promise<null>((resolve) => {
        resolveTheme = resolve;
      }),
    );

    render(
      await HomePageContent({
        country: "us",
        locale: "en",
        basePath: "/us/en",
      }),
    );
    expect(screen.getByTestId("editorial-homepage")).toBeInTheDocument();
    const { homeMerchandising } = mocks.templateRender.mock.calls[0][0] as {
      homeMerchandising: () => Promise<unknown>;
    };
    const result = homeMerchandising();
    expect(mocks.getMerchandisingPlacements).not.toHaveBeenCalled();
    resolveTheme(null);
    await result;
    expect(mocks.getMerchandisingPlacements).toHaveBeenCalledOnce();
  });
});

async function renderLegacyHome() {
  const page = await HomePageContent({
    country: "us",
    locale: "en",
    basePath: "/us/en",
  });
  await act(async () => {
    render(page);
  });
}
