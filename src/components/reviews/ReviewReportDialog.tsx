"use client";

import { SpreeError } from "@spree/sdk";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  getProductReviewAbuseReportReasons,
  reportProductReview,
} from "@/lib/data/abuse-reports";

type ReviewReportDialogProps = {
  reviewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReviewReportDialog({
  reviewId,
  open,
  onOpenChange,
}: ReviewReportDialogProps) {
  const t = useTranslations("reviews");
  const [pending, startTransition] = useTransition();
  const [reasonId, setReasonId] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reasons, setReasons] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  useEffect(() => {
    if (!open) return;
    setSuccess(false);
    setError(null);
    void getProductReviewAbuseReportReasons().then((response) => {
      setReasons(response.data ?? []);
    });
  }, [open]);

  function submit() {
    if (!reasonId) {
      setError(t("reportReasonRequired"));
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await reportProductReview({
          reviewId,
          body: body.trim(),
          reasonId,
        });
        setSuccess(true);
      } catch (error) {
        if (
          error instanceof SpreeError &&
          (error.code === "product_review_already_reported" ||
            error.message.toLowerCase().includes("already reported"))
        ) {
          setError(t("reportDuplicate"));
        } else {
          setError(t("reportFailed"));
        }
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reportReviewTitle")}</DialogTitle>
          <DialogDescription>{t("reportReviewDescription")}</DialogDescription>
        </DialogHeader>
        {success ? (
          <p className="text-sm text-[#222]">{t("reportSubmitted")}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="review-report-reason"
                className="text-sm font-medium"
              >
                {t("reportReasonLabel")}
              </label>
              <select
                id="review-report-reason"
                className="mt-2 w-full rounded-md border border-[#e1e3df] bg-white px-3 py-2 text-sm"
                value={reasonId}
                onChange={(event) => setReasonId(event.target.value)}
                disabled={pending}
              >
                <option value="">{t("reportReasonNone")}</option>
                {reasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="review-report-body"
                className="text-sm font-medium"
              >
                {t("reportDetailsLabel")}
              </label>
              <Textarea
                id="review-report-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                disabled={pending}
                className="mt-2"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("reportCancel")}
              </Button>
              <Button type="button" onClick={submit} disabled={pending}>
                {t("reportSubmit")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
