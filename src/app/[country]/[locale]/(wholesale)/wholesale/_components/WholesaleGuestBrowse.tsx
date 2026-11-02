"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { MainContent, SkipLink } from "@/components/layout/SkipLink";
import { HiddenPricingProvider } from "@/contexts/HiddenPricingContext";
import { wholesaleSignInHref } from "@/lib/wholesale";
import { WholesaleHeader } from "./WholesaleHeader";

interface WholesaleGuestBrowseProps {
  basePath: string;
  children: React.ReactNode;
}

/**
 * Guest view of a `prices_hidden` wholesale channel: the catalog renders, but
 * money fields come back null and every price becomes a "sign in for pricing"
 * prompt (via HiddenPricingProvider). Ordering is gated behind sign-in too.
 *
 * Client component so it can read the current path/query and build a sign-in
 * link that returns the buyer here after they authenticate — matching the
 * `?redirect=` contract the sign-in wall already honours.
 */
export function WholesaleGuestBrowse({
  basePath,
  children,
}: WholesaleGuestBrowseProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Return the buyer to exactly where they were, query string included.
  const signInHref = useMemo(() => {
    const query = searchParams.toString();
    return wholesaleSignInHref(
      basePath,
      query ? `${pathname}?${query}` : pathname,
    );
  }, [basePath, pathname, searchParams]);
  const hiddenPricing = useMemo(() => ({ signInHref }), [signInHref]);

  return (
    <HiddenPricingProvider value={hiddenPricing}>
      <SkipLink />
      <WholesaleHeader
        basePath={basePath}
        authenticated={false}
        signInHref={signInHref}
      />
      <MainContent>{children}</MainContent>
    </HiddenPricingProvider>
  );
}
