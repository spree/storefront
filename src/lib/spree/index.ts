// Configuration

// Auth helpers (token refresh, cookie-based auth)
export {
  clearAuthCookies,
  ensureFreshSession,
  getAuthOptions,
  isAuthError,
  type SessionState,
  withAuthRefresh,
} from "./auth-helpers";
export {
  getClient,
  getClientForSurface,
  getConfig,
  getWholesaleChannelCode,
  getWholesaleClient,
  initSpreeNext,
  isMarketplaceEnabled,
  isWholesaleEnabled,
} from "./config";
// Cookie management
export {
  canPersistCookies,
  clearAccessToken,
  clearAllCartCookies,
  clearCartCookies,
  clearRefreshToken,
  getAccessToken,
  getCartId,
  getCartOptions,
  getCartToken,
  getRefreshToken,
  isPoisonedDtcCartId,
  requireCartId,
  setAccessToken,
  setCartCookies,
  setRefreshToken,
} from "./cookies";
// JWT helpers (expiry inspection, no signature verification)
export { decodeJwtExp, isJwtExpired } from "./jwt";
// Locale resolution (reads country/locale from cookies)
export { getLocaleOptions } from "./locale";
// Surface (DTC vs wholesale sales context)
export {
  cacheTagSuffix,
  cartCookieBaseName,
  DEFAULT_SURFACE,
  SURFACES,
  type Surface,
} from "./surface";
export type { SpreeNextConfig, SpreeNextOptions } from "./types";
