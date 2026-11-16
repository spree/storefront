import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegionPreferences } from "@/components/layout/RegionPreferences";
import type { CountryWithMarket } from "@/contexts/StoreContext";
import { useStore } from "@/contexts/StoreContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { useCountrySwitch } from "@/hooks/useCountrySwitch";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      title: "Region and language",
      description:
        "Choose your region and language. Currency is set by the selected region.",
      region: "Region",
      language: "Language",
      updatePreferences: "Update preferences",
      updatingPreferences: "Updating preferences...",
      updatePreferencesFailed: "Could not update preferences.",
    })[key] ?? key,
}));

vi.mock("@/contexts/StoreContext", () => ({
  useStore: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}));

vi.mock("@/hooks/useCountrySwitch", () => ({
  useCountrySwitch: vi.fn(),
}));

vi.mock("@/contexts/ThemeSettingsContext", () => ({
  useStoreThemeSettings: vi.fn(() => ({})),
}));

const mockUseStore = vi.mocked(useStore);
const mockUseCountrySwitch = vi.mocked(useCountrySwitch);
const mockUseStoreThemeSettings = vi.mocked(useStoreThemeSettings);

const countries = [
  {
    iso: "US",
    name: "United States",
    currency: "USD",
    default_locale: "en",
    supported_locales: ["en"],
    marketId: "market-us",
  },
  {
    iso: "CA",
    name: "Canada",
    currency: "USD",
    default_locale: "en",
    supported_locales: ["en", "fr"],
    marketId: "market-ca",
  },
] as CountryWithMarket[];

describe("RegionPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStoreThemeSettings.mockReturnValue({});
    mockUseStore.mockReturnValue({
      countries,
      country: "us",
      currency: "USD",
      locale: "en",
      loading: false,
      storeName: "Spree Store",
    });
  });

  it("opens the dialog and submits the selected region and language", async () => {
    const user = userEvent.setup();
    const handleCountrySelect = vi.fn().mockResolvedValue(true);
    mockUseCountrySwitch.mockReturnValue({
      handleCountrySelect,
      isCartLoading: false,
      isCountryNavigating: false,
    });

    render(<RegionPreferences variant="header" />);

    const flag = document.querySelector('img[src="/flags/1x1/us.svg"]');
    expect(flag).toHaveAttribute("src", "/flags/1x1/us.svg");
    expect(flag?.parentElement).toHaveClass("inline-block");

    await user.click(
      screen.getByRole("button", { name: /region and language/i }),
    );

    expect(
      screen.getByRole("dialog", { name: "Region and language" }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Region"), "ca");
    expect(screen.getByLabelText("Region")).toHaveValue("ca");
    expect(screen.getByLabelText("Language")).toHaveValue("en");

    await user.click(
      screen.getByRole("button", { name: "Update preferences" }),
    );

    expect(handleCountrySelect).toHaveBeenCalledWith(countries[1], "en");
  });

  it("disables submission while the cart is loading", async () => {
    const user = userEvent.setup();
    mockUseCountrySwitch.mockReturnValue({
      handleCountrySelect: vi.fn(),
      isCartLoading: true,
      isCountryNavigating: false,
    });

    render(<RegionPreferences variant="menu" />);
    await user.click(
      screen.getByRole("button", { name: /region and language/i }),
    );

    expect(
      screen.getByRole("button", { name: "Update preferences" }),
    ).toBeDisabled();
  });

  it("shows an error when the region switch fails", async () => {
    const user = userEvent.setup();
    mockUseCountrySwitch.mockReturnValue({
      handleCountrySelect: vi.fn().mockResolvedValue(false),
      isCartLoading: false,
      isCountryNavigating: false,
    });

    render(<RegionPreferences variant="header" />);
    await user.click(
      screen.getByRole("button", { name: /region and language/i }),
    );
    await user.click(
      screen.getByRole("button", { name: "Update preferences" }),
    );

    expect(
      screen.getByText("Could not update preferences."),
    ).toBeInTheDocument();
  });

  it("filters regions by supported currencies and prioritizes the default currency", async () => {
    const user = userEvent.setup();
    mockUseStore.mockReturnValue({
      countries: [
        ...countries,
        {
          ...countries[0],
          iso: "GB",
          name: "United Kingdom",
          currency: "GBP",
          marketId: "market-gb",
        },
        {
          ...countries[0],
          iso: "FR",
          name: "France",
          currency: "EUR",
          marketId: "market-fr",
        },
      ],
      country: "us",
      currency: "USD",
      locale: "en",
      loading: false,
      storeName: "Spree Store",
    });
    mockUseStoreThemeSettings.mockReturnValue({
      localization: {
        supported_currencies: "GBP, EUR",
        default_currency: "EUR",
      },
    });
    mockUseCountrySwitch.mockReturnValue({
      handleCountrySelect: vi.fn().mockResolvedValue(true),
      isCartLoading: false,
      isCountryNavigating: false,
    });

    render(<RegionPreferences variant="menu" />);
    await user.click(
      screen.getByRole("button", { name: /region and language/i }),
    );

    const regionOptions = screen
      .getAllByRole("option")
      .filter(
        (option) => option.parentElement?.id === "region-preferences-country",
      );
    expect(regionOptions.map((option) => option.textContent)).toEqual([
      "France (EUR)",
      "United Kingdom (GBP)",
      "United States (USD)",
    ]);
    expect(
      screen.queryByRole("option", { name: "Canada (USD)" }),
    ).not.toBeInTheDocument();
  });

  it("respects the currency format setting when showing the active market currency", () => {
    mockUseStoreThemeSettings.mockReturnValue({
      localization: { currency_format: "without_currency" },
    });
    mockUseCountrySwitch.mockReturnValue({
      handleCountrySelect: vi.fn(),
      isCartLoading: false,
      isCountryNavigating: false,
    });

    render(<RegionPreferences variant="menu" />);
    expect(
      screen.getByRole("button", { name: /region and language/i }),
    ).not.toHaveTextContent("USD");
  });
});
