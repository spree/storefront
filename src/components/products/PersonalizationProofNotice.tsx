"use client";

import { ClipboardCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export function PersonalizationProofNotice() {
  const t = useTranslations("personalization");

  return (
    <div className="flex items-start gap-2.5" role="note">
      <span
        className="mt-0.5 shrink-0 text-marketplace-muted-foreground"
        aria-hidden
      >
        <ClipboardCheck className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-marketplace-foreground">
          {t("proofRequiredTitle")}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-marketplace-muted-foreground">
          {t("proofRequiredBody")}
        </p>
      </div>
    </div>
  );
}
