"use client";

import type { Category, Collection, Product, Seller } from "@spree/sdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ProductImage } from "@/components/ui/product-image";
import { SellerImage } from "@/components/ui/seller-image";
import { useStore } from "@/contexts/StoreContext";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { trackQuickSearch, trackSelectItem } from "@/lib/analytics/gtm";
import {
  EMPTY_QUICK_SEARCH_RESULTS,
  fetchQuickSearch,
  QUICK_SEARCH_MIN_LENGTH,
  type QuickSearchResults,
  quickSearchUrl,
} from "@/lib/utils/quick-search";

interface SearchBarProps {
  basePath: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}

/** One selectable row, flattened across groups for keyboard navigation. */
type Suggestion =
  | { kind: "product"; item: Product; position: number }
  | { kind: "category"; item: Category }
  | { kind: "collection"; item: Collection }
  | { kind: "seller"; item: Seller };

/** Pause after the last keystroke before a request goes out. */
const DEBOUNCE_MS = 150;
/** Recent queries kept in memory so backspacing and reopening are instant. */
const RESULT_CACHE_SIZE = 30;

/**
 * Module-level so it survives the SearchBar remount each time the overlay
 * opens. Keyed by request URL, which carries the query, country and locale.
 */
const resultCache = new Map<string, QuickSearchResults>();

function rememberResults(key: string, results: QuickSearchResults): void {
  resultCache.delete(key);
  resultCache.set(key, results);
  if (resultCache.size > RESULT_CACHE_SIZE) {
    const oldest = resultCache.keys().next().value;
    if (oldest !== undefined) resultCache.delete(oldest);
  }
}

function toSuggestions(results: QuickSearchResults): Suggestion[] {
  return [
    ...results.products.map(
      (item, position): Suggestion => ({ kind: "product", item, position }),
    ),
    ...results.categories.map(
      (item): Suggestion => ({ kind: "category", item }),
    ),
    ...results.collections.map(
      (item): Suggestion => ({ kind: "collection", item }),
    ),
    ...results.sellers.map((item): Suggestion => ({ kind: "seller", item })),
  ];
}

function suggestionHref(suggestion: Suggestion, basePath: string): string {
  switch (suggestion.kind) {
    case "product":
      return `${basePath}/products/${suggestion.item.slug}`;
    case "category":
      return `${basePath}/c/${suggestion.item.permalink}`;
    case "collection":
      return `${basePath}/collections/${suggestion.item.permalink}`;
    case "seller":
      return `${basePath}/sellers/${suggestion.item.slug}`;
  }
}

export function SearchBar({ basePath, autoFocus, onNavigate }: SearchBarProps) {
  const router = useRouter();
  const { country, locale, currency } = useStore();
  const t = useTranslations("products");
  const formatMoney = useFormatMoney();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickSearchResults>(
    EMPTY_QUICK_SEARCH_RESULTS,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Every keystroke takes a sequence number. GET requests run in parallel, so
  // responses can arrive out of order: one is shown only if it is newer than
  // what is on screen, and loading ends when the latest query answers.
  const latestSeqRef = useRef(0);
  const shownSeqRef = useRef(0);

  const suggestions = toSuggestions(results);

  const showResults = (
    seq: number,
    searchQuery: string,
    response: QuickSearchResults,
  ) => {
    if (seq <= shownSeqRef.current) return;
    shownSeqRef.current = seq;
    setResults(response);
    if (seq !== latestSeqRef.current) return;
    setLoading(false);
    if (response.products.length > 0) {
      trackQuickSearch(response.products, searchQuery, currency);
    }
  };

  const fetchSuggestions = async (
    seq: number,
    searchQuery: string,
    cacheKey: string,
  ) => {
    try {
      const response = await fetchQuickSearch(searchQuery, {
        country,
        locale,
      });
      rememberResults(cacheKey, response);
      showResults(seq, searchQuery, response);
    } catch (error) {
      if (seq !== latestSeqRef.current) return;
      console.error("Search failed:", error);
      showResults(seq, searchQuery, EMPTY_QUICK_SEARCH_RESULTS);
    }
  };

  // Debounced search — called from onChange handler, no useEffect needed.
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    latestSeqRef.current += 1;
    const seq = latestSeqRef.current;

    if (value.trim().length < QUICK_SEARCH_MIN_LENGTH) {
      // Drop answers still in flight for longer queries.
      shownSeqRef.current = seq;
      setResults(EMPTY_QUICK_SEARCH_RESULTS);
      setLoading(false);
      return;
    }

    const cacheKey = quickSearchUrl(value, { country, locale });
    const cached = resultCache.get(cacheKey);
    if (cached) {
      showResults(seq, value, cached);
      return;
    }

    // Previous results stay on screen until the new ones arrive.
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(seq, value, cacheKey);
    }, DEBOUNCE_MS);
  };

  const viewAllResults = () => {
    router.push(`${basePath}/products?q=${encodeURIComponent(query.trim())}`);
    setIsOpen(false);
    inputRef.current?.blur();
    onNavigate?.();
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) viewAllResults();
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.kind === "product") {
      trackSelectItem(
        suggestion.item,
        "quick-search",
        "Quick Search",
        suggestion.position,
        currency,
      );
    }
    router.push(suggestionHref(suggestion, basePath));
    setIsOpen(false);
    setQuery("");
    onNavigate?.();
  };

  // Close suggestions on blur — delayed to allow click on suggestions
  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Cancel blur timeout when interacting with suggestions
  const handleSuggestionsMouseDown = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const trimmedQuery = query.trim();
  const showSuggestions =
    isOpen &&
    (suggestions.length > 0 ||
      loading ||
      trimmedQuery.length >= QUICK_SEARCH_MIN_LENGTH);

  const renderOption = (
    suggestion: Suggestion,
    content: React.ReactNode,
  ): React.JSX.Element => {
    const index = suggestions.indexOf(suggestion);
    return (
      <li
        key={`${suggestion.kind}-${suggestion.item.id}`}
        id={`search-option-${index}`}
        role="option"
        aria-selected={index === selectedIndex}
        tabIndex={-1}
      >
        <button
          type="button"
          onClick={() => handleSuggestionClick(suggestion)}
          tabIndex={-1}
          className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${
            index === selectedIndex ? "bg-gray-50" : ""
          }`}
        >
          {content}
        </button>
      </li>
    );
  };

  const renderGroup = (
    kind: Suggestion["kind"],
    heading: string,
    render: (suggestion: Suggestion) => React.JSX.Element,
  ): React.JSX.Element | null => {
    const group = suggestions.filter((s) => s.kind === kind);
    if (group.length === 0) return null;
    const headingId = `search-group-${kind}`;
    return (
      // biome-ignore lint/a11y/useSemanticElements: ARIA listbox groups have no native element
      <ul role="group" aria-labelledby={headingId} className="py-2">
        <li
          id={headingId}
          role="presentation"
          className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          {heading}
        </li>
        {group.map(render)}
      </ul>
    );
  };

  const hasSideGroups =
    results.categories.length > 0 ||
    results.collections.length > 0 ||
    results.sellers.length > 0;

  // Categories and collections share one row layout: thumbnail and name.
  const renderGroupingOption = (s: Suggestion): React.JSX.Element =>
    renderOption(
      s,
      s.kind === "category" || s.kind === "collection" ? (
        <>
          <div className="relative w-8 h-8 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
            <ProductImage
              src={s.item.square_image_url || s.item.image_url}
              alt=""
              fill
              className="object-cover"
              iconClassName="w-4 h-4"
            />
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">
            {s.item.name}
          </p>
        </>
      ) : null,
    );

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <InputGroup>
          <InputGroupInput
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={t("search")}
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="search-suggestions"
            aria-activedescendant={
              selectedIndex >= 0 ? `search-option-${selectedIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-label={t("search")}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          className="fixed left-0 right-0 mt-1 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain bg-white border-b border-gray-200 z-50"
          onMouseDown={handleSuggestionsMouseDown}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {suggestions.length > 0 ? (
              <>
                <div
                  id="search-suggestions"
                  role="listbox"
                  aria-label={t("search")}
                  aria-busy={loading}
                  className={`transition-opacity ${loading ? "opacity-60" : ""} ${
                    hasSideGroups && results.products.length > 0
                      ? "md:grid md:grid-cols-[2fr_1fr] md:gap-6"
                      : ""
                  }`}
                >
                  {renderGroup("product", t("searchGroupProducts"), (s) =>
                    renderOption(
                      s,
                      s.kind === "product" ? (
                        <>
                          <div className="relative w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                            <ProductImage
                              src={s.item.thumbnail_url}
                              alt={s.item.name}
                              fill
                              className="object-cover"
                              iconClassName="w-5 h-5"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {s.item.name}
                            </p>
                            {s.item.price?.amount && (
                              <p className="text-sm text-gray-500">
                                {formatMoney(
                                  s.item.price.amount,
                                  s.item.price.currency,
                                  { unitPrice: true },
                                )}
                              </p>
                            )}
                          </div>
                        </>
                      ) : null,
                    ),
                  )}
                  {hasSideGroups && (
                    <div>
                      {renderGroup(
                        "category",
                        t("searchGroupCategories"),
                        renderGroupingOption,
                      )}
                      {renderGroup(
                        "collection",
                        t("searchGroupCollections"),
                        renderGroupingOption,
                      )}
                      {renderGroup("seller", t("searchGroupSellers"), (s) =>
                        renderOption(
                          s,
                          s.kind === "seller" ? (
                            <>
                              <div className="relative w-8 h-8 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden">
                                <SellerImage
                                  src={
                                    s.item.square_logo_url || s.item.logo_url
                                  }
                                  alt=""
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                  iconClassName="w-4 h-4"
                                />
                              </div>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {s.item.name}
                              </p>
                            </>
                          ) : null,
                        ),
                      )}
                    </div>
                  )}
                </div>
                {/* The results page lists products only */}
                {trimmedQuery && results.products.length > 0 && (
                  <div className="border-t border-gray-100">
                    <button
                      type="button"
                      onClick={viewAllResults}
                      className="w-full p-3 text-sm text-primary hover:bg-gray-50 text-center font-medium"
                    >
                      {t("viewAllResultsFor", { query: trimmedQuery })}
                    </button>
                  </div>
                )}
              </>
            ) : loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {t("searching")}
              </div>
            ) : trimmedQuery.length >= QUICK_SEARCH_MIN_LENGTH ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {t("noSearchResults")}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
