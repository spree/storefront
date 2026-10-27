import { WholesaleGate } from "../_components/WholesaleGate";
import { WholesaleCartView } from "./WholesaleCartView";

interface WholesaleCartPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export default async function WholesaleCartPage({
  params,
}: WholesaleCartPageProps) {
  const { country, locale } = await params;
  return (
    <WholesaleGate basePath={`/${country}/${locale}`}>
      {() => <WholesaleCartView />}
    </WholesaleGate>
  );
}
