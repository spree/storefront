import { permanentRedirect } from "next/navigation";
import { queryString } from "@/lib/utils/query-string";

/**
 * An old permalink still resolves after a rename; send it to the current one,
 * keeping the shopper's filters and sort.
 */
export function redirectToCurrentPermalink(
  requested: string,
  current: string,
  pathPrefix: string,
  searchParams: Record<string, string | string[] | undefined>,
): void {
  if (safeDecode(requested) === current) return;
  permanentRedirect(
    `${pathPrefix}/${encodeURI(current)}${queryString(searchParams)}`,
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
