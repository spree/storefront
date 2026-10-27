import { Suspense } from "react";
import { WholesaleGate } from "../_components/WholesaleGate";
import { WholesalePageSkeleton } from "../_components/WholesalePageSkeleton";
import { WholesaleCartView } from "./WholesaleCartView";

interface WholesaleCartPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export default function WholesaleCartPage(props: WholesaleCartPageProps) {
  return (
    <Suspense fallback={<WholesalePageSkeleton />}>
      <WholesaleCartPageContent {...props} />
    </Suspense>
  );
}

async function WholesaleCartPageContent({ params }: WholesaleCartPageProps) {
  const { country, locale } = await params;
  return (
    <WholesaleGate basePath={`/${country}/${locale}`}>
      {() => <WholesaleCartView />}
    </WholesaleGate>
  );
}
