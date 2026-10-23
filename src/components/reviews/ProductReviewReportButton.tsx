"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { extractBasePath } from "@/lib/utils/path";
import { ReviewReportDialog } from "./ReviewReportDialog";

type ProductReviewReportButtonProps = {
  reviewId: string;
};

export function ProductReviewReportButton({
  reviewId,
}: ProductReviewReportButtonProps) {
  const t = useTranslations("reviews");
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const loginHref = `${extractBasePath(pathname)}/login?returnTo=${encodeURIComponent(pathname)}`;

  if (!isAuthenticated) {
    return (
      <Link
        href={loginHref}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#595959] transition-colors hover:bg-[#f5f5f5] hover:text-[#222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand"
      >
        <Flag className="size-3.5" aria-hidden />
        {t("reportReview")}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#595959] transition-colors hover:bg-[#f5f5f5] hover:text-[#222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand"
      >
        <Flag className="size-3.5" aria-hidden />
        {t("reportReview")}
      </button>
      <ReviewReportDialog
        reviewId={reviewId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
