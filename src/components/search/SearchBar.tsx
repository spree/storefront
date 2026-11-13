"use client";

import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import type { Collection, Product } from "@spree/sdk";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ProductImage } from "@/components/ui/product-image";
import { useStore } from "@/contexts/StoreContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { trackQuickSearch, trackSelectItem } from "@/lib/analytics/gtm";
import { getCollections } from "@/lib/data/collections";
import { getProducts } from "@/lib/data/products";
import { productDetailPathSegment } from "@/lib/discovery-context";
import { marketplaceEtsyPillLinkClass } from "@/lib/marketplace-etsy-motion";
import { themeSettingEnabled } from "@/lib/theme/setting-value";

interface SearchBarProps {
  basePath: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
  appearance?: "default" | "marketplace" | "etsy";
}

export function SearchBar({
  basePath,
  autoFocus,
  onNavigate,
  appearance = "default",
}: SearchBarProps) {
  const router = useRouter();
  const { currency } = useStore();
  const { search: searchSettings } = useStoreThemeSettings();
  const suggestionsEnabled = themeSettingEnabled(
    searchSettings?.suggestions,
    true,
  );
  const showProductSuggestions = themeSettingEnabled(
    searchSettings?.show_products,
    true,
  );
  const showCollectionSuggestions = themeSettingEnabled(
    searchSettings?.show_collections,
    true,
  );
  const popularKeywords = String(searchSettings?.popular_keywords || "")
    .split(/[,|\n]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 12);
  const tProducts = useTranslations("products");
  const tHeader = useTranslations("header");
  const drawerTitle = String(searchSettings?.drawer_title ?? "").trim();
  const popularRightNowTitle =
    drawerTitle && !drawerTitle.startsWith("header.")
      ? drawerTitle
      : (() => {
          const label = tHeader("popularRightNow");
          return label.includes("popularRightNow")
            ? "Popular right now"
            : label;
        })();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [collectionSuggestions, setCollectionSuggestions] = useState<
    Collection[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const initialSuggestionsLoaded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [dropdownBox, setDropdownBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);

  // Fetch suggestions
  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      if (
        !suggestionsEnabled ||
        (!showProductSuggestions && !showCollectionSuggestions) ||
        searchQuery.length < 2
      ) {
        setSuggestions([]);
        setCollectionSuggestions([]);
        return;
      }

      const currentRequestId = requestIdRef.current;
      setLoading(true);
      try {
        const [productsResponse, collectionsResponse] = await Promise.all([
          showProductSuggestions
            ? getProducts({
                search: searchQuery,
                fields: ["name", "slug", "price", "thumbnail_url"],
                limit: appearance === "etsy" ? 8 : 6,
                expand: appearance === "etsy" ? ["media"] : undefined,
              }).catch(() => null)
            : null,
          showCollectionSuggestions
            ? getCollections({ name_cont: searchQuery, limit: 4 }).catch(
                () => null,
              )
            : null,
        ]);
        // Discard stale responses if a newer query has been issued
        if (requestIdRef.current !== currentRequestId) return;
        const products = productsResponse?.data || [];
        setSuggestions(products);
        setCollectionSuggestions(collectionsResponse?.data || []);
        if (products.length > 0) {
          trackQuickSearch(products, searchQuery, currency);
        }
      } catch (error) {
        if (requestIdRef.current !== currentRequestId) return;
        console.error("Search failed:", error);
        setSuggestions([]);
        setCollectionSuggestions([]);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      }
    },
    [
      appearance,
      currency,
      showCollectionSuggestions,
      showProductSuggestions,
      suggestionsEnabled,
    ],
  );

  async function loadInitialSuggestions() {
    if (initialSuggestionsLoaded.current || !suggestionsEnabled) return;
    initialSuggestionsLoaded.current = true;
    const productIds = String(searchSettings?.recommended_product_ids || "")
      .split(/[,|\s]+/)
      .filter(Boolean)
      .slice(0, 8);
    const collectionIds = String(searchSettings?.featured_collection_ids || "")
      .split(/[,|\s]+/)
      .filter(Boolean)
      .slice(0, 8);
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const [productsResponse, collectionsResponse] = await Promise.all([
        showProductSuggestions
          ? getProducts(
              productIds.length
                ? {
                    id_in: productIds,
                    limit: productIds.length,
                    expand: ["media"],
                  }
                : {
                    sort: "popular",
                    limit: appearance === "etsy" ? 8 : 4,
                    expand: ["media"],
                  },
            ).catch(() => null)
          : null,
        showCollectionSuggestions && collectionIds.length
          ? getCollections({
              id_in: collectionIds,
              limit: collectionIds.length,
            }).catch(() => null)
          : null,
      ]);
      if (requestIdRef.current !== currentRequestId) return;
      let products = productsResponse?.data || [];
      if (
        showProductSuggestions &&
        products.length === 0 &&
        (productIds.length > 0 || appearance === "etsy")
      ) {
        const fallback = await getProducts({
          sort: "popular",
          limit: appearance === "etsy" ? 8 : 4,
          expand: ["media"],
        }).catch(() => null);
        if (requestIdRef.current !== currentRequestId) return;
        products = fallback?.data || [];
      }
      setSuggestions(products);
      setCollectionSuggestions(collectionsResponse?.data || []);
    } catch {
      if (requestIdRef.current === currentRequestId) {
        setSuggestions([]);
        setCollectionSuggestions([]);
      }
    } finally {
      if (requestIdRef.current === currentRequestId) setLoading(false);
    }
  }

  // Debounced search — called from onChange handler, no useEffect needed
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    setSelectedIndex(-1);
    requestIdRef.current += 1;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (
      suggestionsEnabled &&
      (showProductSuggestions || showCollectionSuggestions) &&
      value.length >= 2
    ) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    } else if (!value) {
      setSuggestions([]);
      setCollectionSuggestions([]);
      setLoading(false);
      initialSuggestionsLoaded.current = false;
      void loadInitialSuggestions();
    } else {
      setLoading(false);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`${basePath}/products?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      inputRef.current?.blur();
      onNavigate?.();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (product: Product, index: number) => {
    trackSelectItem(product, "quick-search", "Quick Search", index, currency);
    router.push(`${basePath}/products/${productDetailPathSegment(product)}`);
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
          handleSuggestionClick(suggestions[selectedIndex], selectedIndex);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const etsyDropdownHasBody =
    loading ||
    suggestions.length > 0 ||
    (!query.trim() && popularKeywords.length > 0) ||
    query.trim().length >= 2;

  const showSuggestions = Boolean(
    isOpen &&
      suggestionsEnabled &&
      (appearance === "etsy"
        ? etsyDropdownHasBody
        : loading ||
          suggestions.length > 0 ||
          collectionSuggestions.length > 0 ||
          query.length >= 2 ||
          (!query &&
            (popularKeywords.length > 0 ||
              searchSettings?.recommended_product_ids ||
              searchSettings?.featured_collection_ids))),
  );

  const etsyShowPopularTitle = !query.trim();

  const syncDropdownBox = useCallback(() => {
    const node = rootRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setDropdownBox({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!showSuggestions || appearance !== "etsy") return;
    syncDropdownBox();
    window.addEventListener("resize", syncDropdownBox);
    window.addEventListener("scroll", syncDropdownBox, true);
    return () => {
      window.removeEventListener("resize", syncDropdownBox);
      window.removeEventListener("scroll", syncDropdownBox, true);
    };
  }, [appearance, showSuggestions, syncDropdownBox]);

  return (
    <div ref={rootRef} className="relative">
      <form onSubmit={handleSubmit}>
        <InputGroup
          style={{
            backgroundColor: "var(--theme-search-background, white)",
            color: "var(--theme-search-text, inherit)",
            borderColor: "var(--theme-search-border, currentColor)",
          }}
          className={
            appearance === "etsy"
              ? "h-12 overflow-hidden rounded-[var(--marketplace-search-radius)] border-2 border-marketplace-border bg-[var(--marketplace-search-surface)] shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-marketplace-brand has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-marketplace-brand/15 md:h-12"
              : appearance === "marketplace"
                ? "h-11 overflow-hidden rounded-lg border border-marketplace-border bg-[var(--marketplace-search-surface)] shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-marketplace-brand md:h-12"
                : undefined
          }
        >
          <InputGroupInput
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => {
              setIsOpen(true);
              if (!query) void loadInitialSuggestions();
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={
              appearance === "etsy" || appearance === "marketplace"
                ? tHeader("searchMarketplace")
                : tProducts("search")
            }
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="search-suggestions"
            aria-activedescendant={
              selectedIndex >= 0 ? `search-option-${selectedIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-label={
              appearance === "etsy" || appearance === "marketplace"
                ? tHeader("searchMarketplace")
                : tProducts("search")
            }
            className={
              appearance === "etsy"
                ? "rounded-none border-0 bg-transparent px-4 text-base shadow-none placeholder:text-[#6b626a]"
                : appearance === "marketplace"
                  ? "rounded-none border-0 bg-transparent px-4 text-base shadow-none placeholder:text-marketplace-muted-foreground"
                  : undefined
            }
          />
          <InputGroupAddon
            align="inline-end"
            className={
              appearance === "etsy"
                ? "m-1 size-10 rounded-full bg-marketplace-brand-accent p-0 text-white transition-colors hover:bg-marketplace-brand-accent-hover [&_svg]:size-6"
                : appearance === "marketplace"
                  ? "m-1 rounded-md bg-marketplace-brand px-3 text-marketplace-brand-foreground [&_svg]:size-5"
                  : undefined
            }
          >
            <MagnifyingGlass className="size-6" weight="bold" aria-hidden />
          </InputGroupAddon>
        </InputGroup>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && appearance === "etsy" && dropdownBox
        ? createPortal(
            <div
              id="search-suggestions"
              data-theme-search-suggestions
              role="listbox"
              className="fixed z-[60] max-h-[min(70vh,28rem)] overflow-y-auto rounded-[var(--marketplace-radius-lg)] border border-marketplace-border-subtle bg-marketplace-surface py-1.5 shadow-[var(--marketplace-shadow-overlay)]"
              style={{
                top: dropdownBox.top,
                left: dropdownBox.left,
                width: dropdownBox.width,
              }}
              onMouseDown={handleSuggestionsMouseDown}
            >
              {etsyShowPopularTitle ? (
                <p
                  data-theme-search-drawer-title
                  className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-marketplace-muted-foreground"
                >
                  {popularRightNowTitle}
                </p>
              ) : null}
              {loading ? (
                <div className="px-4 py-4 text-center text-sm text-marketplace-muted-foreground">
                  {tProducts("searching")}
                </div>
              ) : suggestions.length > 0 ? (
                <ul>
                  {suggestions.map((product, index) => (
                    <li
                      key={product.id}
                      id={`search-option-${index}`}
                      role="option"
                      aria-selected={index === selectedIndex}
                      tabIndex={-1}
                    >
                      <button
                        type="button"
                        onClick={() => handleSuggestionClick(product, index)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-200 ease-out hover:bg-marketplace-surface-subtle motion-reduce:transition-none ${
                          index === selectedIndex
                            ? "bg-marketplace-surface-subtle"
                            : ""
                        }`}
                      >
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-marketplace-surface-subtle">
                          <ProductImage
                            src={product.thumbnail_url}
                            alt=""
                            fill
                            className="object-cover"
                            iconClassName="size-5"
                          />
                        </div>
                        <span className="min-w-0 flex-1 text-sm text-marketplace-foreground">
                          {product.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : !query && popularKeywords.length > 0 ? (
                <ul>
                  {popularKeywords.map((keyword) => (
                    <li key={keyword}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-200 ease-out hover:bg-marketplace-surface-subtle motion-reduce:transition-none"
                        onClick={() => {
                          router.push(
                            `${basePath}/products?q=${encodeURIComponent(keyword)}`,
                          );
                          setIsOpen(false);
                          onNavigate?.();
                        }}
                      >
                        <div
                          className="size-11 shrink-0 rounded-md bg-marketplace-surface-subtle"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 text-sm text-marketplace-foreground">
                          {keyword}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.length >= 2 ? (
                <div className="px-4 py-4 text-center text-sm text-marketplace-muted-foreground">
                  {tProducts("noProductsFound")}
                </div>
              ) : null}
              {query.trim() && suggestions.length > 0 ? (
                <div className="border-t border-marketplace-border-subtle px-4 py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      router.push(
                        `${basePath}/products?q=${encodeURIComponent(query.trim())}`,
                      );
                      setIsOpen(false);
                      onNavigate?.();
                    }}
                    className="w-full py-2 text-center text-sm font-medium text-marketplace-brand hover:underline"
                  >
                    {tProducts("viewAllResultsFor", { query: query.trim() })}
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
      {showSuggestions && appearance !== "etsy" ? (
        <div
          data-theme-search-suggestions
          className="fixed left-0 right-0 mt-1 bg-white border-b border-gray-200 z-50"
          style={{
            backgroundColor: "var(--theme-search-background, white)",
            color: "var(--theme-search-text, #111827)",
            borderColor: "var(--theme-search-border, #e5e7eb)",
          }}
          onMouseDown={handleSuggestionsMouseDown}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <p
              data-theme-search-drawer-title
              className="px-4 pt-4 text-base font-semibold"
            >
              {String(searchSettings?.drawer_title || tHeader("search"))}
            </p>
            {!query && popularKeywords.length > 0 ? (
              <div className="p-4">
                <p className="mb-3 text-sm font-semibold">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {popularKeywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      className={marketplaceEtsyPillLinkClass}
                      onClick={() => {
                        setQuery(keyword);
                        router.push(
                          `${basePath}/products?q=${encodeURIComponent(keyword)}`,
                        );
                        setIsOpen(false);
                        onNavigate?.();
                      }}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
                {(collectionSuggestions.length > 0 ||
                  suggestions.length > 0) && (
                  <ul className="mt-4 border-t border-current/10">
                    {collectionSuggestions.map((collection) => (
                      <li key={`featured-${collection.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            router.push(
                              `${basePath}/collections/${collection.permalink}`,
                            );
                            setIsOpen(false);
                            onNavigate?.();
                          }}
                          className="w-full border-b border-current/10 p-3 text-left text-sm"
                        >
                          {collection.name}
                          <span className="ml-2 text-xs opacity-70">
                            Collection
                          </span>
                        </button>
                      </li>
                    ))}
                    {suggestions.map((product, index) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick(product, index)}
                          className="w-full border-b border-current/10 p-3 text-left text-sm"
                        >
                          {product.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {tProducts("searching")}
              </div>
            ) : suggestions.length > 0 || collectionSuggestions.length > 0 ? (
              <ul id="search-suggestions" role="listbox">
                {collectionSuggestions.map((collection) => (
                  <li key={`collection-${collection.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(
                          `${basePath}/collections/${collection.permalink}`,
                        );
                        setIsOpen(false);
                        setQuery("");
                        onNavigate?.();
                      }}
                      className="w-full border-b border-gray-100 p-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      {collection.name}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        Collection
                      </span>
                    </button>
                  </li>
                ))}
                {suggestions.map((product, index) => (
                  <li
                    key={product.id}
                    id={`search-option-${index}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    tabIndex={-1}
                  >
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(product, index)}
                      tabIndex={-1}
                      className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                        index === selectedIndex ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="relative w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        <ProductImage
                          src={product.thumbnail_url}
                          alt={product.name}
                          fill
                          className="object-cover"
                          iconClassName="w-5 h-5"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        {product.price?.display_amount && (
                          <p className="text-sm text-gray-500">
                            {product.price.display_amount}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
                {query.trim() && (
                  <li className="border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        router.push(
                          `${basePath}/products?q=${encodeURIComponent(query.trim())}`,
                        );
                        setIsOpen(false);
                        onNavigate?.();
                      }}
                      className="w-full p-3 text-sm text-primary hover:bg-gray-50 text-center font-medium"
                    >
                      {tProducts("viewAllResultsFor", { query: query.trim() })}
                    </button>
                  </li>
                )}
              </ul>
            ) : query.length >= 2 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {tProducts("noProductsFound")}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
