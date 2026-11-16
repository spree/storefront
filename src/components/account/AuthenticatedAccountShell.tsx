"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AccountShell } from "./AccountShell";

function SessionFallback() {
  const t = useTranslations("common");

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mx-auto max-w-md space-y-4 animate-pulse motion-reduce:animate-none">
        <span className="sr-only">{t("loading")}</span>
        <div
          aria-hidden="true"
          className="h-8 w-1/2 mx-auto rounded bg-gray-200"
        />
        <div
          aria-hidden="true"
          className="h-4 w-3/4 mx-auto rounded bg-gray-200"
        />
        <div aria-hidden="true" className="h-32 rounded bg-gray-200" />
      </div>
    </div>
  );
}

interface AuthenticatedAccountShellProps {
  children: React.ReactNode;
  loginHref: string;
  /** Server layout already verified JWT or refresh cookies — do not hide SSR content while the client re-syncs. */
  hasServerSession?: boolean;
}

/**
 * The server layout rejects requests with no session credentials. This client
 * boundary verifies the remaining session before exposing account chrome and
 * preserves the existing refresh-token recovery flow.
 */
export function AuthenticatedAccountShell({
  children,
  loginHref,
  hasServerSession = false,
}: AuthenticatedAccountShellProps) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (hasServerSession) return;
    if (!loading && !isAuthenticated) router.replace(loginHref);
  }, [hasServerSession, isAuthenticated, loading, loginHref, router]);

  if (!hasServerSession && (loading || !isAuthenticated)) {
    return <SessionFallback />;
  }

  return <AccountShell>{children}</AccountShell>;
}
