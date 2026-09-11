import { connection } from "next/server";
import { Suspense } from "react";
import { getAuthProviders } from "@/lib/data/customer";
import { RegisterPageContent } from "./RegisterPageContent";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageWithProviders />
    </Suspense>
  );
}

async function RegisterPageWithProviders() {
  // Provider discovery is request-scoped: which providers exist depends on the
  // store, and the authorization URL carries a freshly signed state.
  await connection();

  return <RegisterPageContent providers={await getAuthProviders()} />;
}
