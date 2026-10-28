"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface NotFoundContentProps {
  basePath: string;
}

export function NotFoundContent({
  basePath,
}: NotFoundContentProps): React.JSX.Element {
  const t = useTranslations("notFound");

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <p className="text-sm font-semibold text-gray-500">404</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-4 text-gray-600">{t("description")}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button asChild>
          <Link href={basePath}>{t("backHome")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`${basePath}/products`}>{t("browseProducts")}</Link>
        </Button>
      </div>
    </div>
  );
}
