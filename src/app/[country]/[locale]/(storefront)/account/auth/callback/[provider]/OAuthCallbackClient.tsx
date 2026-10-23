"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { consumeOAuthReturnTo } from "@/components/account/SocialLoginButtons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { completeOAuthCallback } from "@/lib/data/customer";
import { extractBasePath } from "@/lib/utils/path";

export function OAuthCallbackClient({ provider }: { provider: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const t = useTranslations("account");
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;

    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(t("socialLoginFailed"));
      setDone(true);
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      setError(t("socialLoginFailed"));
      setDone(true);
      return;
    }

    void (async () => {
      const result = await completeOAuthCallback(provider, { code, state });
      if (!result.success) {
        setError(result.error || t("socialLoginFailed"));
        setDone(true);
        return;
      }

      if (result.linked) {
        router.replace(`${basePath}/account/settings/security`);
        return;
      }

      await refreshUser();
      router.refresh();
      const destination = consumeOAuthReturnTo(`${basePath}/account`);
      router.replace(destination);
    })();
  }, [basePath, done, provider, refreshUser, router, searchParams, t]);

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-4">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href={`${basePath}/account`}>{t("backToSignIn")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center text-muted-foreground">
      {t("completingSignIn")}
    </div>
  );
}
