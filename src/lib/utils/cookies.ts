const ONE_YEAR = 60 * 60 * 24 * 365;

function setCookie(name: string, value: string): void {
  if ("cookieStore" in window && window.cookieStore) {
    window.cookieStore
      .set({
        name,
        value: encodeURIComponent(value),
        path: "/",
        expires: Date.now() + ONE_YEAR * 1000,
      })
      .catch(() => {
        // biome-ignore lint/suspicious/noDocumentCookie: fallback for Cookie Store API failure
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}`;
      });
  } else {
    // biome-ignore lint/suspicious/noDocumentCookie: fallback for browsers without Cookie Store API
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}`;
  }
}

/**
 * Persist the selected country and locale in client-side cookies.
 */
export function setStoreCookies(country: string, locale: string): void {
  setCookie("spree_country", country);
  setCookie("spree_locale", locale);
}
