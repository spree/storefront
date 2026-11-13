"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown } from "@/components/icons";
import { MadeTogetherMakerAvatar } from "@/components/products/MadeTogetherMakerAvatar";
import type { MadeTogetherPresentation } from "@/lib/made-together/types";

export function MadeTogetherCollective({
  presentation,
}: {
  presentation: MadeTogetherPresentation;
}) {
  const t = useTranslations("products");
  const { makers } = presentation;

  return (
    <details
      data-made-together
      id="made-together-collective"
      className="group border-b border-[#e1e3df] py-4"
    >
      <summary className="cursor-pointer list-none text-[16px] font-semibold text-[#222] marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0">{t("meetTheCollective")}</span>
          <ChevronDown
            aria-hidden
            className="size-5 shrink-0 text-[#222] transition-transform group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="mt-4 space-y-5">
        <p className="text-sm leading-relaxed text-[#595959]">
          {t("madeTogetherLead")}
        </p>
        <ul className="space-y-6">
          {makers.map((maker, index) => (
            <li key={maker.key} className="flex items-start gap-3">
              <MadeTogetherMakerAvatar
                name={maker.name}
                logoUrl={maker.logoUrl}
                href={maker.href}
                variantIndex={index}
                className="size-14 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                {maker.href ? (
                  <p className="text-[15px] font-semibold leading-snug text-[#222]">
                    <Link
                      href={maker.href}
                      className="hover:underline underline-offset-4"
                    >
                      {maker.name}
                    </Link>
                  </p>
                ) : (
                  <p className="text-[15px] font-semibold leading-snug text-[#222]">
                    {maker.name}
                  </p>
                )}
                {maker.craftContribution ? (
                  <p className="text-sm leading-relaxed text-[#595959]">
                    {maker.craftContribution}
                  </p>
                ) : null}
                {maker.href ? (
                  <Link
                    href={maker.href}
                    className="inline-block text-sm font-semibold text-[#222] underline-offset-4 hover:underline"
                  >
                    {t("visitStore")}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
