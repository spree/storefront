"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProductReviewAbuseReportReasons,
  reportProductReview,
} from "@/lib/data/abuse-reports";

export function SellerShopReviewReportButton({
  reviewId,
  loginHref,
}: {
  reviewId: string;
  loginHref: string;
}) {
  const t = useTranslations("sellers");
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Link
        href={loginHref}
        className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-[#5b5148] transition-colors hover:bg-[#f5f1ec] hover:text-[#26221f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75644e] focus-visible:ring-offset-2"
      >
        <Flag className="size-4" aria-hidden />
        {t("reportReview")}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-[#5b5148] transition-colors hover:bg-[#f5f1ec] hover:text-[#26221f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75644e] focus-visible:ring-offset-2"
      >
        <Flag className="size-4" aria-hidden />
        {t("reportReview")}
      </button>
      {open && isAuthenticated ? (
        <ReportReviewDialog
          reviewId={reviewId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ReportReviewDialog({
  reviewId,
  onClose,
}: {
  reviewId: string;
  onClose: () => void;
}) {
  const t = useTranslations("sellers");
  const tMessages = useTranslations("messages");
  const [body, setBody] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [reasons, setReasons] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    void getProductReviewAbuseReportReasons().then((page) => {
      setReasons(
        (page.data ?? []).map((reason) => ({
          id: reason.id,
          name: reason.name,
        })),
      );
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending]);

  function handleSubmit() {
    if (!body.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await reportProductReview({
          reviewId,
          body: body.trim(),
          reasonId: reasonId || undefined,
        });
        setSent(true);
      } catch {
        setError(tMessages("report.failed"));
      }
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={tMessages("report.cancel")}
        className="absolute inset-0 bg-black/45"
        onClick={() => !pending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-review-title"
        className="relative z-[201] w-full max-w-md rounded-lg border border-[#e8e3df] bg-white p-5 shadow-xl sm:p-6"
      >
        <h2
          id="report-review-title"
          className="text-lg font-semibold text-[#26221f]"
        >
          {sent ? t("reviewReportSuccessTitle") : t("reviewReportTitle")}
        </h2>
        {sent ? (
          <>
            <p className="mt-2 text-sm leading-5 text-[#625b55]">
              {t("reviewReportSuccess")}
            </p>
            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={onClose}>
                {tMessages("report.cancel")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-5 text-[#625b55]">
              {t("reviewReportDescription")}
            </p>
            {reasons.length ? (
              <select
                aria-label={tMessages("report.reasonNone")}
                className="mt-4 h-10 w-full rounded-md border border-[#d8d1ca] bg-white px-3 text-sm text-[#26221f]"
                value={reasonId}
                onChange={(event) => setReasonId(event.target.value)}
              >
                <option value="">{tMessages("report.reasonNone")}</option>
                {reasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              placeholder={tMessages("report.placeholder")}
              aria-label={tMessages("report.placeholder")}
              className="mt-3"
            />
            {error ? (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={onClose}
              >
                {tMessages("report.cancel")}
              </Button>
              <Button
                type="button"
                disabled={!body.trim() || pending}
                onClick={handleSubmit}
              >
                {tMessages("report.submit")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
