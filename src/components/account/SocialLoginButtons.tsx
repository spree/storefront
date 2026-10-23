"use client";

import type { AuthProvider } from "@spree/sdk";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const OAUTH_RETURN_KEY = "spree_oauth_return_to";

export function storeOAuthReturnTo(path: string) {
  if (typeof window !== "undefined" && path) {
    sessionStorage.setItem(OAUTH_RETURN_KEY, path);
  }
}

export function consumeOAuthReturnTo(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = sessionStorage.getItem(OAUTH_RETURN_KEY);
  sessionStorage.removeItem(OAUTH_RETURN_KEY);
  return value || fallback;
}

function providerLabel(
  provider: AuthProvider,
  t: (key: string) => string,
): string {
  const key = provider.key?.toLowerCase() ?? "";
  if (key.includes("google")) return t("continueWithGoogle");
  if (key.includes("apple")) return t("continueWithApple");
  if (key.includes("facebook")) return t("continueWithFacebook");
  if (key.includes("microsoft")) return t("continueWithMicrosoft");
  return provider.label || t("continueWithProvider");
}

export function SocialLoginButtons({
  providers,
  returnTo,
  disabled,
}: {
  providers: AuthProvider[];
  returnTo: string;
  disabled?: boolean;
}) {
  const t = useTranslations("account");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const redirectProviders = providers.filter(
    (provider) => provider.kind === "redirect" && provider.authorization_url,
  );

  if (redirectProviders.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("orContinueWith")}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {redirectProviders.map((provider) => (
          <Button
            key={provider.key}
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled || loadingKey !== null}
            onClick={() => {
              if (!provider.authorization_url) return;
              setLoadingKey(provider.key);
              storeOAuthReturnTo(returnTo);
              window.location.href = provider.authorization_url;
            }}
          >
            {loadingKey === provider.key
              ? t("redirecting")
              : providerLabel(provider, t)}
          </Button>
        ))}
      </div>
    </div>
  );
}
