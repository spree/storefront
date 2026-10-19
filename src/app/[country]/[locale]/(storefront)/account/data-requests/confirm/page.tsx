"use client";

import type { DataRequest } from "@spree/sdk";
import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { confirmDataRequest, getDataRequest } from "@/lib/data/data-requests";
import { extractBasePath } from "@/lib/utils/path";

type PageState =
  | { step: "loading" }
  | { step: "invalid" }
  | { step: "awaiting"; dataRequest: DataRequest }
  | { step: "confirmed"; dataRequest: DataRequest };

// The request is confirmed only when the person presses the button, never on
// load: some mail scanners open links and run the page's scripts, and an
// erasure cannot be undone.
export default function ConfirmDataRequestPage() {
  const t = useTranslations("dataRequestConfirmation");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const token = searchParams.get("token");

  const [state, setState] = useState<PageState>({ step: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ step: "invalid" });
      return;
    }

    let cancelled = false;
    getDataRequest(token).then((dataRequest) => {
      if (cancelled) return;
      if (!dataRequest || dataRequest.status === "lapsed") {
        setState({ step: "invalid" });
      } else if (dataRequest.status === "awaiting_confirmation") {
        setState({ step: "awaiting", dataRequest });
      } else {
        setState({ step: "confirmed", dataRequest });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;

    setError(null);
    setSubmitting(true);

    try {
      const result = await confirmDataRequest(token);
      if (result.success) {
        setState({ step: "confirmed", dataRequest: result.dataRequest });
      } else {
        setError(result.error || t("genericError"));
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  const backToStore = (
    <CardFooter className="justify-center">
      <Link
        href={basePath || "/"}
        className="text-sm text-primary hover:text-primary/70 font-medium"
      >
        {t("backToStore")}
      </Link>
    </CardFooter>
  );

  if (state.step === "loading") {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardHeader className="text-center">
            <CardDescription>{t("loading")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (state.step === "invalid") {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("invalidLink")}</CardTitle>
            <CardDescription>{t("invalidLinkDescription")}</CardDescription>
          </CardHeader>
          {backToStore}
        </Card>
      </div>
    );
  }

  const kind =
    state.dataRequest.kind === "erasure" ? "erasure" : ("access" as const);

  if (state.step === "confirmed") {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CircleCheck className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>{t("confirmed")}</CardTitle>
            <CardDescription>
              {t(`${kind}.confirmedDescription`)}
            </CardDescription>
          </CardHeader>
          {backToStore}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{t(`${kind}.title`)}</CardTitle>
          <CardDescription>{t(`${kind}.description`)}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {kind === "erasure" && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{t("erasure.warning")}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            size="lg"
            className="w-full"
            variant={kind === "erasure" ? "destructive" : "default"}
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting ? t("confirming") : t(`${kind}.confirm`)}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            {t("ignore")}
          </p>
        </CardContent>

        {backToStore}
      </Card>
    </div>
  );
}
