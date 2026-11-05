/**
 * Resolves with `fallback` when `promise` hasn't settled within `ms`, so
 * optional chrome (menus, search groups) never waits on a stalled request.
 * The request itself keeps running; only the wait is cut short.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
