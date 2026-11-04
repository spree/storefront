"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** Copies a bank transfer reference, so the buyer pastes it rather than retyping it. */
export function CopyReferenceButton({ reference }: { reference: string }) {
  const t = useTranslations("bankTransfer");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard access (an insecure context, a refused permission): the
      // reference is on screen to copy by hand.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t("copyReference")}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
      <span>{copied ? t("copied") : t("copy")}</span>
    </button>
  );
}
