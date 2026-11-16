// The Store API's static decision for a guest depends on the configured
// store's rollout, independent of the guest traffic-session token.
const staticDecisions = new Map<string, number>();
const STATIC_DECISION_TTL_MS = 30_000;

export function hasStaticGuestHomeComposition(scope: string): boolean {
  const expiresAt = staticDecisions.get(scope);
  if (expiresAt === undefined) return false;
  if (expiresAt > Date.now()) return true;
  staticDecisions.delete(scope);
  return false;
}

export function rememberStaticGuestHomeComposition(scope: string) {
  const now = Date.now();
  for (const [key, expiresAt] of staticDecisions) {
    if (expiresAt <= now) staticDecisions.delete(key);
  }
  staticDecisions.set(scope, now + STATIC_DECISION_TTL_MS);
}

export function clearStaticGuestHomeComposition() {
  staticDecisions.clear();
}
