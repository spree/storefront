import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegionPreferences } from "@/components/layout/RegionPreferences";
import type { CountryWithMarket } from "@/contexts/StoreContext";
import { useStore } from "@/contexts/StoreContext";
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
      noSupportedLanguage: "Language unavailable",
    })[key] ?? key,
}));

vi.mock("@/contexts/StoreContext", () => ({
  useStore: vi.fn(),
}));

vi.mock("@/hooks/useCountrySwitch", () => ({
  useCountrySwitch: vi.fn(),
}));

const mockUseStore = vi.mocked(useStore);
const mockUseCountrySwitch = vi.mocked(useCountrySwitch);

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
    supported_locales: ["en", "fr", "it"],
    marketId: "market-ca",
  },
  {
    iso: "GB",
    name: "United Kingdom",
    currency: "GBP",
    default_locale: "en-GB",
    supported_locales: [],
    marketId: "market-gb",
  },
  {
    iso: "JP",
    name: "Japan",
    currency: "JPY",
    default_locale: "ja",
    supported_locales: [],
    marketId: "market-jp",
  },
] as CountryWithMarket[];

describe("RegionPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      screen.getByRole("button", { name: "Region and language" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Region and language" }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Region"), "ca");
    expect(screen.getByLabelText("Region")).toHaveValue("ca");
    expect(screen.getByLabelText("Language")).toHaveValue("en");
    expect(
      screen.getByLabelText("Language").querySelector('option[value="it"]'),
    ).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Update preferences" }),
    );

    expect(handleCountrySelect).toHaveBeenCalledWith(countries[1], "en");
  });

  it("uses a lowercase regional locale in the language selector", async () => {
    const user = userEvent.setup();
    const handleCountrySelect = vi.fn().mockResolvedValue(true);
    mockUseCountrySwitch.mockReturnValue({
      handleCountrySelect,
      isCartLoading: false,
      isCountryNavigating: false,
    });

    render(<RegionPreferences variant="header" />);
    await user.click(
      screen.getByRole("button", { name: "Region and language" }),
    );
    await user.selectOptions(screen.getByLabelText("Region"), "gb");

    expect(screen.getByLabelText("Language")).toHaveValue("en-gb");

    await user.click(
      screen.getByRole("button", { name: "Update preferences" }),
    );

    expect(handleCountrySelect).toHaveBeenCalledWith(countries[2], "en-gb");
  });

  it("allows selecting a country without a renderable language but disables updating", async () => {
    const user = userEvent.setup();
    mockUseCountrySwitch.mockReturnValue({
      handleCountrySelect: vi.fn(),
      isCartLoading: false,
      isCountryNavigating: false,
    });

    render(<RegionPreferences variant="header" />);
    await user.click(
      screen.getByRole("button", { name: "Region and language" }),
    );

    const region = screen.getByLabelText("Region");
    expect(
      screen.getByRole("option", { name: "Japan (JPY)" }),
    ).not.toBeDisabled();

    await user.selectOptions(region, "jp");

    expect(region).toHaveValue("jp");
    expect(screen.getByLabelText("Language")).toBeDisabled();
    expect(screen.getByText("Language unavailable")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update preferences" }),
    ).toBeDisabled();
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
      screen.getByRole("button", { name: "Region and language" }),
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
      screen.getByRole("button", { name: "Region and language" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Update preferences" }),
    );

    expect(
      screen.getByText("Could not update preferences."),
    ).toBeInTheDocument();
  });
});
