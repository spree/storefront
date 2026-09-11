"use client";

import type { AuthProvider } from "@spree/sdk";
import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { startSocialLogin } from "@/lib/data/customer";

interface SocialLoginButtonsProps {
  /** Only the redirect providers — the password form is rendered next to it. */
  providers: AuthProvider[];
  /** Where to send the shopper once the provider signs them in. */
  returnTo?: string | null;
}

export function SocialLoginButtons({
  providers,
  returnTo,
}: SocialLoginButtonsProps) {
  const t = useTranslations("account");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  const handleClick = async (provider: string) => {
    setError(null);
    setPending(provider);

    const result = await startSocialLogin(provider, returnTo ?? undefined);

    if ("url" in result) {
      // Leaving the page — keep the button disabled so a second click cannot
      // overwrite the state cookie the callback will check.
      window.location.assign(result.url);
      return;
    }

    setPending(null);
    setError(t("socialErrorUnavailable"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("orContinueWith")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {providers.map((provider) => (
          <div key={provider.key} className="space-y-1">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={pending !== null}
              onClick={() => handleClick(provider.key)}
            >
              {t("continueWith", {
                provider: provider.label ?? provider.key,
              })}
            </Button>

            {provider.requires_email && (
              <p className="text-xs text-muted-foreground text-center">
                {t("providerNeedsEmail")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
