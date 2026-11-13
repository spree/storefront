import Link from "next/link";
import {
  MarketplaceEmptyState,
  MarketplacePage,
} from "@/components/marketplace";

export default function RootNotFound() {
  return (
    <div className="min-h-screen bg-marketplace-background px-6 py-20 text-marketplace-foreground">
      <MarketplacePage>
        <p className="mb-10 text-center font-display text-2xl font-semibold text-[#c2522b]">
          Spree Store
        </p>
        <MarketplaceEmptyState
          illustration="page-not-found"
          title="Page not found"
          description="This page may have moved or is no longer available."
          action={
            <Link
              href="/us/en"
              className="inline-flex min-h-11 items-center rounded-md bg-[#3b3044] px-5 text-sm font-semibold text-white hover:opacity-90"
            >
              Return to the store
            </Link>
          }
        />
      </MarketplacePage>
    </div>
  );
}
