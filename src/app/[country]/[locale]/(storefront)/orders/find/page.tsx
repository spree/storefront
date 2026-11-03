import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FindOrderForm } from "@/components/returns/FindOrderForm";

interface FindOrderPageProps {
  params: Promise<{ country: string; locale: string }>;
}

/** "Find my order" for a guest who lost the confirmation email. */
export default async function FindOrderPage({ params }: FindOrderPageProps) {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "returns.find",
  });

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="text-sm text-gray-500 mt-2 mb-6">{t("description")}</p>
      <Suspense>
        <FindOrderForm />
      </Suspense>
    </div>
  );
}
