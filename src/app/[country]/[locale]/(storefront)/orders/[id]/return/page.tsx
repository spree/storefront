import { connection } from "next/server";
import { ReturnRequestPage } from "@/components/returns/ReturnRequestPage";
import { getOrderForReturns, getReturnReasons } from "@/lib/data/returns";

interface GuestReturnPageProps {
  params: Promise<{ country: string; locale: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
}

/** A guest's request form, reached from the emailed order link. */
export default async function GuestReturnPage({
  params,
  searchParams,
}: GuestReturnPageProps) {
  await connection();
  const { country, locale, id } = await params;
  const { token } = await searchParams;
  const basePath = `/${country}/${locale}`;
  const access = token ? { orderToken: token } : undefined;
  const [order, reasons] = await Promise.all([
    access ? getOrderForReturns(id, access) : null,
    getReturnReasons(),
  ]);

  return (
    <ReturnRequestPage
      order={order}
      reasons={reasons}
      locale={locale}
      access={access}
      orderHref={`${basePath}/orders/${id}?token=${encodeURIComponent(token ?? "")}`}
      findHref={`${basePath}/orders/find`}
    />
  );
}
