"use client";

import type { DataRequest } from "@spree/sdk";
import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
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
  | { step: "error" }
  | { step: "ready"; dataRequest: DataRequest };

function PageCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Card>{children}</Card>
    </div>
  );
}

// The request is confirmed only when the person presses the button, never on
// load: some mail scanners open links and run the page's scripts, and an
// erasure cannot be undone.
export default function ConfirmDataRequestPage() {
  const t = useTranslations("dataRequestConfirmation");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  // Read once: the token is removed from the address bar right after.
  const [token] = useState(() => searchParams.get("token"));

  const [state, setState] = useState<PageState>({ step: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setState({ step: "invalid" });
      return;
    }

    setState({ step: "loading" });
    const lookup = await getDataRequest(token);
    if (!lookup.found) {
      setState({ step: lookup.reason });
    } else if (lookup.dataRequest.status === "lapsed") {
      setState({ step: "invalid" });
    } else {
      setState({ step: "ready", dataRequest: lookup.dataRequest });
    }
  }, [token]);

  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirm = async () => {
    if (!token) return;

    setError(null);
    setSubmitting(true);

    try {
      const result = await confirmDataRequest(token);
      if (result.success) {
        setState({ step: "ready", dataRequest: result.dataRequest });
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
      <PageCard>
        <CardHeader className="text-center">
          <CardDescription>{t("loading")}</CardDescription>
        </CardHeader>
      </PageCard>
    );
  }

  if (state.step === "invalid") {
    return (
      <PageCard>
        <CardHeader className="text-center">
          <CardTitle>{t("invalidLink")}</CardTitle>
          <CardDescription>{t("invalidLinkDescription")}</CardDescription>
        </CardHeader>
        {backToStore}
      </PageCard>
    );
  }

  if (state.step === "error") {
    return (
      <PageCard>
        <CardHeader className="text-center">
          <CardTitle>{t("loadError")}</CardTitle>
          <CardDescription>{t("loadErrorDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="w-full" onClick={load}>
            {t("retry")}
          </Button>
        </CardContent>
        {backToStore}
      </PageCard>
    );
  }

  const { dataRequest } = state;
  const kind = dataRequest.kind === "erasure" ? "erasure" : "access";

  if (dataRequest.status === "failed") {
    return (
      <PageCard>
        <CardHeader className="text-center">
          <CardTitle>{t("failed")}</CardTitle>
          <CardDescription>{t("failedDescription")}</CardDescription>
        </CardHeader>
        {backToStore}
      </PageCard>
    );
  }

  if (dataRequest.status !== "awaiting_confirmation") {
    const completed = dataRequest.status === "completed";
    const description = !completed
      ? t(`${kind}.confirmedDescription`)
      : kind === "erasure"
        ? t("erasure.completedDescription")
        : dataRequest.download_url
          ? t("access.readyDescription")
          : t("access.expiredDescription");

    return (
      <PageCard>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
            <CircleCheck className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle>
            {completed && kind === "access" && dataRequest.download_url
              ? t("access.readyTitle")
              : t("confirmed")}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {completed && kind === "access" && dataRequest.download_url && (
          <CardContent>
            <Button asChild size="lg" className="w-full">
              <a href={dataRequest.download_url}>{t("access.download")}</a>
            </Button>
          </CardContent>
        )}
        {backToStore}
      </PageCard>
    );
  }

  return (
    <PageCard>
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
    </PageCard>
  );
}
