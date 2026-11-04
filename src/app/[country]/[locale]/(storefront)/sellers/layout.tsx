import { notFound } from "next/navigation";
import { isMarketplaceEnabled } from "@/lib/spree";

/**
 * The one gate for every seller route: single-vendor stores have no seller
 * pages. The proxy answers full page loads with a 404 status before this
 * renders; this covers navigations, prefetches and anything the proxy skips.
 */
export default function SellersLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  if (!isMarketplaceEnabled()) notFound();
  return children;
}
