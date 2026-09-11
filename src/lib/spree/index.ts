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
  isWholesaleEnabled,
} from "./config";
// Cookie management
export {
  canPersistCookies,
  clearAccessToken,
  clearAllCartCookies,
  clearCartCookies,
  clearRefreshToken,
  clearRegistrationToken,
  clearSocialLoginContext,
  getAccessToken,
  getCartId,
  getCartOptions,
  getCartToken,
  getRefreshToken,
  getRegistrationToken,
  getSocialLoginContext,
  isPoisonedDtcCartId,
  OAUTH_STATE_COOKIE_NAME,
  oauthStateCookieOptions,
  REGISTRATION_TOKEN_COOKIE_NAME,
  registrationTokenCookieOptions,
  requireCartId,
  type SocialLoginContext,
  setAccessToken,
  setCartCookies,
  setRefreshToken,
  setRegistrationToken,
  setSocialLoginContext,
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
