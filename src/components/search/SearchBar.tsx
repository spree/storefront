"use client";

import type { Category, Product, Seller } from "@spree/sdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
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
import { type QuickSearchResults, quickSearch } from "@/lib/data/search";

interface SearchBarProps {
  basePath: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}

/** One selectable row, flattened across groups for keyboard navigation. */
type Suggestion =
  | { kind: "product"; item: Product; position: number }
  | { kind: "category"; item: Category }
  | { kind: "seller"; item: Seller };

const EMPTY_RESULTS: QuickSearchResults = {
  products: [],
  categories: [],
  sellers: [],
};

function toSuggestions(results: QuickSearchResults): Suggestion[] {
  return [
    ...results.products.map(
      (item, position): Suggestion => ({ kind: "product", item, position }),
    ),
    ...results.categories.map(
      (item): Suggestion => ({ kind: "category", item }),
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
    case "seller":
      return `${basePath}/sellers/${suggestion.item.slug}`;
  }
}

export function SearchBar({ basePath, autoFocus, onNavigate }: SearchBarProps) {
  const router = useRouter();
  const { currency } = useStore();
  const t = useTranslations("products");
  const formatMoney = useFormatMoney();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickSearchResults>(EMPTY_RESULTS);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);

  const suggestions = toSuggestions(results);

  // Fetch suggestions
  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      const currentRequestId = requestIdRef.current;
      setLoading(true);
      try {
        const response = await quickSearch(searchQuery);
        // Discard stale responses if a newer query has been issued
        if (requestIdRef.current !== currentRequestId) return;
        setResults(response);
        if (response.products.length > 0) {
          trackQuickSearch(response.products, searchQuery, currency);
        }
      } catch (error) {
        if (requestIdRef.current !== currentRequestId) return;
        console.error("Search failed:", error);
        setResults(EMPTY_RESULTS);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      }
    },
    [currency],
  );

  // Debounced search — called from onChange handler, no useEffect needed
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    setSelectedIndex(-1);
    requestIdRef.current += 1;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    } else {
      setResults(EMPTY_RESULTS);
      setLoading(false);
    }
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
    isOpen && (suggestions.length > 0 || loading || trimmedQuery.length >= 2);

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
    results.categories.length > 0 || results.sellers.length > 0;

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
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {t("searching")}
              </div>
            ) : suggestions.length > 0 ? (
              <>
                <div
                  id="search-suggestions"
                  role="listbox"
                  aria-label={t("search")}
                  className={
                    hasSideGroups && results.products.length > 0
                      ? "md:grid md:grid-cols-[2fr_1fr] md:gap-6"
                      : undefined
                  }
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
                        (s) =>
                          renderOption(
                            s,
                            s.kind === "category" ? (
                              <>
                                <div className="relative w-8 h-8 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                  <ProductImage
                                    src={
                                      s.item.square_image_url ||
                                      s.item.image_url
                                    }
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
                          ),
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
            ) : trimmedQuery.length >= 2 ? (
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
