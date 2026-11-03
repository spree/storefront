import { connection } from "next/server";
import { ReturnRequestPage } from "@/components/returns/ReturnRequestPage";
import { getOrderForReturns, getReturnReasons } from "@/lib/data/returns";

interface ReturnPageProps {
  params: Promise<{ country: string; locale: string; id: string }>;
}

export default async function AccountReturnPage({ params }: ReturnPageProps) {
  await connection();
  const { country, locale, id } = await params;
  const basePath = `/${country}/${locale}`;
  const [order, reasons] = await Promise.all([
    getOrderForReturns(id),
    getReturnReasons(),
  ]);

  return (
    <ReturnRequestPage
      order={order}
      reasons={reasons}
      locale={locale}
      orderHref={`${basePath}/account/orders/${id}`}
    />
  );
}
