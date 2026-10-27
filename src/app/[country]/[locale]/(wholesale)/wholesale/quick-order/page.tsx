import { Suspense } from "react";
import { WholesaleGate } from "../_components/WholesaleGate";
import { WholesalePageSkeleton } from "../_components/WholesalePageSkeleton";
import { QuickOrderView } from "./QuickOrderView";

interface QuickOrderPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export default function WholesaleQuickOrderPage(props: QuickOrderPageProps) {
  return (
    <Suspense fallback={<WholesalePageSkeleton />}>
      <WholesaleQuickOrderPageContent {...props} />
    </Suspense>
  );
}

async function WholesaleQuickOrderPageContent({ params }: QuickOrderPageProps) {
  const { country, locale } = await params;
  return (
    <WholesaleGate basePath={`/${country}/${locale}`}>
      {() => <QuickOrderView />}
    </WholesaleGate>
  );
}
