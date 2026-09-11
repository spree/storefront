import { connection } from "next/server";
import { Suspense } from "react";
import { getAuthProviders } from "@/lib/data/customer";
import { AccountPageContent } from "./AccountPageContent";

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountPageFallback />}>
      <AccountPageWithProviders />
    </Suspense>
  );
}

async function AccountPageWithProviders() {
  // Provider discovery is request-scoped: which providers exist depends on the
  // store, and the authorization URL carries a freshly signed state.
  await connection();

  return <AccountPageContent providers={await getAuthProviders()} />;
}

function AccountPageFallback() {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
