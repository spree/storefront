"use client";

import type { StoreCountry } from "@spree/sdk";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { useStore } from "@/contexts/StoreContext";
import { setStoreCookies } from "@/lib/utils/cookies";
import { getPathWithoutPrefix } from "@/lib/utils/path";

// Convert ISO country code to flag emoji
// Uses regional indicator symbols: A=🇦 (U+1F1E6), B=🇧 (U+1F1E7), etc.
function countryToFlag(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return "";

  const firstChar = code.charCodeAt(0) - 65 + 0x1f1e6;
  const secondChar = code.charCodeAt(1) - 65 + 0x1f1e6;

  return String.fromCodePoint(firstChar, secondChar);
}

export function CountrySwitcher() {
  const { country, currency, countries, setCountry, loading } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle country selection — derive locale and currency from the country directly
  const handleCountrySelect = (entry: StoreCountry) => {
    const newLocale = entry.default_locale || "en";
    const pathRest = getPathWithoutPrefix(pathname);
    const newPath = `/${entry.iso.toLowerCase()}/${newLocale}${pathRest}`;

    setStoreCookies(entry.iso.toLowerCase(), newLocale);
    setCountry(entry.iso.toLowerCase());

    setIsOpen(false);
    router.push(newPath);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-lg leading-none">{countryToFlag(country)}</span>
        <span className="font-medium">{country.toUpperCase()}</span>
        <span className="text-gray-400">|</span>
        <span>{currency}</span>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Select Country
            </p>
          </div>
          <ul className="max-h-64 overflow-auto py-1" role="listbox">
            {countries.map((c) => {
              const isSelected = c.iso.toLowerCase() === country.toLowerCase();
              return (
                <li key={c.iso}>
                  <button
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      isSelected
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700"
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg leading-none">
                        {countryToFlag(c.iso)}
                      </span>
                      <span className="font-medium">{c.name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">
                        {c.currency}
                      </span>
                      {isSelected && (
                        <CheckIcon className="w-4 h-4 text-primary-500" />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
