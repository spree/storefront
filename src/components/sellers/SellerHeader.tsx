import type { Seller } from "@spree/sdk";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SellerImage } from "@/components/ui/seller-image";

interface SellerHeaderProps {
  seller: Seller;
  basePath: string;
  locale: Locale;
}

/** Cover photo, logo, name, about text and policies of a seller profile. */
export async function SellerHeader({
  seller,
  basePath,
  locale,
}: SellerHeaderProps): Promise<React.JSX.Element> {
  const t = await getTranslations({ locale, namespace: "sellers" });
  const logo = seller.square_logo_url || seller.logo_url;
  const policies = (seller.policies ?? []).filter(
    (policy) => policy.body_html || policy.body,
  );

  return (
    <>
      <div className="relative h-48 bg-gray-100 sm:h-64">
        {seller.cover_photo_url && (
          <SellerImage
            src={seller.cover_photo_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="pt-4">
          <ol className="flex items-center gap-1 text-sm text-gray-500">
            <li>
              <Link href={`${basePath}/sellers`} className="hover:underline">
                {t("allSellers")}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </li>
            <li aria-current="page" className="text-gray-900">
              {seller.name}
            </li>
          </ol>
        </nav>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white sm:h-24 sm:w-24">
            <SellerImage
              src={logo}
              alt={t("logoAlt", { name: seller.name })}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            {seller.name}
          </h1>
        </div>

        {(seller.about_html || seller.about) && (
          <section aria-labelledby="seller-about" className="mt-6 max-w-3xl">
            <h2 id="seller-about" className="sr-only">
              {t("about")}
            </h2>
            {seller.about_html ? (
              <div
                className="prose prose-gray"
                dangerouslySetInnerHTML={{ __html: seller.about_html }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-gray-600">
                {seller.about}
              </p>
            )}
          </section>
        )}

        {policies.length > 0 && (
          <section aria-labelledby="seller-policies" className="mt-6 max-w-3xl">
            <h2
              id="seller-policies"
              className="text-sm font-medium text-gray-900"
            >
              {t("policies")}
            </h2>
            <div className="mt-2 divide-y divide-gray-200 border-y border-gray-200">
              {policies.map((policy) => (
                <details key={policy.id} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-gray-700 hover:text-gray-900">
                    {policy.name}
                    <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  </summary>
                  {policy.body_html ? (
                    <div
                      className="prose prose-sm prose-gray mt-3"
                      dangerouslySetInnerHTML={{ __html: policy.body_html }}
                    />
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                      {policy.body}
                    </p>
                  )}
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
