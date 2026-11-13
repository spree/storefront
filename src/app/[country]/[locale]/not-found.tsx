import Link from "next/link";
import {
  MarketplaceEmptyState,
  MarketplacePage,
} from "@/components/marketplace";

export default function LocaleNotFound() {
  return (
    <div className="min-h-[70vh] bg-marketplace-background">
      <MarketplacePage className="py-20">
        <p className="mb-10 text-center font-display text-2xl font-semibold text-marketplace-brand-accent">
          Spree Store
        </p>
        <MarketplaceEmptyState
          illustration="page-not-found"
          title="Page not found"
          description="This page may have moved or is no longer available."
          action={
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-md bg-marketplace-brand px-5 text-sm font-semibold text-marketplace-brand-foreground hover:opacity-90"
            >
              Return to the store
            </Link>
          }
        />
      </MarketplacePage>
    </div>
  );
}
