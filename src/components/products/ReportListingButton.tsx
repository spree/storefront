"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  getListingAbuseReportReasons,
  reportListing,
} from "@/lib/data/abuse-reports";
import { buildAccountLoginHref } from "@/lib/utils/account-redirect";

export function ReportListingButton({ productId }: { productId: string }) {
  const t = useTranslations("products.reportListing");
  const { isAuthenticated, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [reasonId, setReasonId] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let active = true;
    void getListingAbuseReportReasons().then((response) => {
      if (active) setReasons(response.data ?? []);
    });
    return () => {
      active = false;
    };
  }, [open]);

  function changeOpen(next: boolean) {
    if (pending) return;
    if (next) {
      setReasonId("");
      setBody("");
      setError(false);
      setSuccess(false);
    }
    setOpen(next);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || pending || !isAuthenticated) return;
    setError(false);
    startTransition(async () => {
      try {
        await reportListing({
          productId,
          body: body.trim(),
          reasonId: reasonId || undefined,
        });
        setSuccess(true);
      } catch {
        setError(true);
      }
    });
  }

  const triggerClass =
    "inline-flex items-center gap-1.5 py-1 text-xs text-marketplace-muted-foreground underline underline-offset-4 hover:text-marketplace-foreground";

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="!mt-3 flex justify-end">
        <Link href={buildAccountLoginHref(pathname)} className={triggerClass}>
          <Flag className="size-3.5" aria-hidden="true" />
          {t("signInToReport")}
        </Link>
      </div>
    );
  }

  return (
    <div className="!mt-3 flex justify-end">
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger asChild>
          <button type="button" className={triggerClass}>
            <Flag className="size-3.5" aria-hidden="true" />
            {t("trigger")}
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          {success ? (
            <p role="status" className="text-sm text-marketplace-foreground">
              {t("success")}
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {reasons.length > 0 ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${id}-reason`}
                    className="text-sm font-medium"
                  >
                    {t("reason")}
                  </label>
                  <select
                    id={`${id}-reason`}
                    value={reasonId}
                    onChange={(event) => setReasonId(event.target.value)}
                    disabled={pending}
                    className="h-10 w-full rounded-md border border-marketplace-border bg-marketplace-surface px-3 text-sm"
                  >
                    <option value="">{t("reasonOptional")}</option>
                    {reasons.map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-details`}
                  className="text-sm font-medium"
                >
                  {t("details")}
                </label>
                <Textarea
                  id={`${id}-details`}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={5000}
                  required
                  disabled={pending}
                  rows={4}
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-red-700">
                  {t("error")}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => changeOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={pending || !body.trim()}>
                  {t("submit")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
