import type { Category } from "@spree/sdk";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "@/components/search/SearchBar";
import { useAuth } from "@/contexts/AuthContext";
import {
  EMPTY_QUICK_SEARCH_RESULTS,
  fetchQuickSearch,
  type QuickSearchResponse,
} from "@/lib/utils/quick-search";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ country: "us", locale: "en", currency: "USD" }),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/analytics/gtm", () => ({
  trackQuickSearch: vi.fn(),
  trackSelectItem: vi.fn(),
}));

vi.mock("@/lib/utils/quick-search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils/quick-search")>()),
  fetchQuickSearch: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockFetch = vi.mocked(fetchQuickSearch);

function signedIn(id: string | null, loading = false): void {
  mockUseAuth.mockReturnValue({
    user: id ? { id } : null,
    loading,
  } as ReturnType<typeof useAuth>);
}

/** A route response: guests' are cacheable, customers' are `no-store`. */
function resultsNamed(name: string, cacheable = true): QuickSearchResponse {
  return {
    results: {
      ...EMPTY_QUICK_SEARCH_RESULTS,
      categories: [
        { id: `ctg_${name}`, name, permalink: name } as unknown as Category,
      ],
    },
    cacheable,
  };
}

function type(value: string): void {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });
}

describe("SearchBar session handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches again once auth settles if a search ran while it loaded", async () => {
    signedIn(null, true);
    mockFetch.mockResolvedValue(resultsNamed("Loading result"));
    const view = render(<SearchBar basePath="/us/en" />);

    type("loading-query");
    await screen.findByText("Loading result");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // That request may have gone out with an expired token, so once auth
    // settles the open query is searched again as the settled session.
    signedIn(null);
    mockFetch.mockResolvedValue(resultsNamed("Settled guest result"));
    view.rerender(<SearchBar basePath="/us/en" />);
    await screen.findByText("Settled guest result");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // The loading-time response was never cached; the settled guest's is.
    type("lo");
    type("loading-query");
    await screen.findByText("Settled guest result");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("drops an in-flight guest response when auth first settles as a customer", async () => {
    signedIn(null, true);
    let resolve: (value: QuickSearchResponse) => void = () => {};
    mockFetch.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const view = render(<SearchBar basePath="/us/en" />);

    type("first-settle");
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Auth settles as a customer whose token was refreshed meanwhile.
    signedIn("cus_5");
    mockFetch.mockResolvedValue(resultsNamed("Customer result", false));
    view.rerender(<SearchBar basePath="/us/en" />);
    await act(async () => {
      resolve(resultsNamed("Guest result"));
    });

    expect(screen.queryByText("Guest result")).not.toBeInTheDocument();
    await screen.findByText("Customer result");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("leaves things alone when auth settles as a guest with no search made", async () => {
    signedIn(null, true);
    const view = render(<SearchBar basePath="/us/en" />);

    signedIn(null);
    view.rerender(<SearchBar basePath="/us/en" />);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("never caches a signed-in customer's results", async () => {
    signedIn("cus_1");
    mockFetch.mockResolvedValue(resultsNamed("Customer result", false));
    render(<SearchBar basePath="/us/en" />);

    type("customer-query");
    await screen.findByText("Customer result");
    type("cu");
    type("customer-query");
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it("replaces the previous customer's results when the customer changes", async () => {
    signedIn("cus_1");
    mockFetch.mockResolvedValue(resultsNamed("First customer", false));
    const view = render(<SearchBar basePath="/us/en" />);

    type("switch-query");
    await screen.findByText("First customer");

    signedIn("cus_2");
    mockFetch.mockResolvedValue(resultsNamed("Second customer", false));
    view.rerender(<SearchBar basePath="/us/en" />);

    // The previous customer's results leave the screen at once, and the
    // query on screen is searched again as the new customer.
    expect(screen.queryByText("First customer")).not.toBeInTheDocument();
    await screen.findByText("Second customer");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("drops a response still in flight when the customer changes", async () => {
    signedIn("cus_3");
    let resolve: (value: QuickSearchResponse) => void = () => {};
    mockFetch.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const view = render(<SearchBar basePath="/us/en" />);

    type("in-flight");
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    signedIn(null);
    mockFetch.mockResolvedValue(resultsNamed("Guest result"));
    view.rerender(<SearchBar basePath="/us/en" />);
    await act(async () => {
      resolve(resultsNamed("Previous session", false));
    });

    expect(screen.queryByText("Previous session")).not.toBeInTheDocument();
    await screen.findByText("Guest result");
  });
  it("does not cache a response the route marked no-store, even for a guest", async () => {
    // The auth context still says guest, but the cookie the request carried
    // was a customer's (a sign-in in another tab).
    signedIn(null);
    mockFetch.mockResolvedValue(resultsNamed("Other tab customer", false));
    render(<SearchBar basePath="/us/en" />);

    type("other-tab");
    await screen.findByText("Other tab customer");
    type("ot");
    type("other-tab");
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it("waits for the list to reopen before searching again after a session change", async () => {
    signedIn("cus_4");
    mockFetch.mockResolvedValue(resultsNamed("Closed overlay", false));
    const view = render(<SearchBar basePath="/us/en" />);

    type("closed-overlay");
    await screen.findByText("Closed overlay");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

    signedIn(null);
    view.rerender(<SearchBar basePath="/us/en" />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Opening the list again searches the query on screen as the new session.
    mockFetch.mockResolvedValue(resultsNamed("Reopened guest result"));
    fireEvent.blur(screen.getByRole("combobox"));
    fireEvent.focus(screen.getByRole("combobox"));
    await screen.findByText("Reopened guest result");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
