/**
 * Decode a JWT's `exp` claim (seconds since epoch) without verifying the
 * signature. Returns null when the token is malformed or carries no `exp`.
 */
export function decodeJwtExp(token: string): number | null {
  const exp = decodeJwtClaims(token)?.exp;
  return typeof exp === "number" ? exp : null;
}

/**
 * Decode a JWT's `sub` claim (who the token is for) without verifying the
 * signature. Returns null when the token is malformed or carries no `sub`.
 * Only for telling sessions apart, never for authorization.
 */
export function decodeJwtSub(token: string): string | null {
  const sub = decodeJwtClaims(token)?.sub;
  return typeof sub === "string" || typeof sub === "number"
    ? String(sub)
    : null;
}

function decodeJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json: unknown = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return json && typeof json === "object"
      ? (json as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Whether a JWT is expired, or expires within `skewSeconds`. A token that
 * can't be decoded is treated as not-expired: the server stays the source of
 * truth and rejects it if genuinely invalid.
 */
export function isJwtExpired(token: string, skewSeconds = 0): boolean {
  const exp = decodeJwtExp(token);
  if (exp === null) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp - now <= skewSeconds;
}

/**
 * The customer JWT when it is still live, or undefined. Catalog reads send it
 * so the Store API narrows them to the customer's catalogs; an expired token
 * reads as a guest instead of failing the request with a 401.
 */
export function liveAccessToken(token: string | undefined): string | undefined {
  return token && !isJwtExpired(token, 30) ? token : undefined;
}
