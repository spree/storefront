"use client";

import type { AuthProvider } from "@spree/sdk";
import { KeyRound } from "lucide-react";
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

function ProviderLogo({ provider }: { provider: AuthProvider }) {
  const key = provider.key?.toLowerCase() ?? "";

  if (key.includes("google")) {
    return (
      <svg
        aria-hidden="true"
        data-provider-logo="google"
        className="size-[18px] shrink-0"
        viewBox="0 0 48 48"
        fill="none"
      >
        <path
          fill="#4285F4"
          d="M47.04 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.1 11.1 0 0 1-4.78 7.18l7.73 6c4.51-4.17 7.15-10.31 7.15-17.65Z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19Z"
        />
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
        />
      </svg>
    );
  }

  if (key.includes("apple")) {
    return (
      <svg
        aria-hidden="true"
        data-provider-logo="apple"
        className="size-[17px] shrink-0 fill-current"
        viewBox="0 0 24 24"
      >
        <path d="M16.365 1.43c0 1.14-.416 2.2-1.244 3.18-.999 1.165-2.207 1.84-3.517 1.733a3.55 3.55 0 0 1-.027-.43c0-1.095.477-2.267 1.322-3.226.422-.487.96-.892 1.614-1.215.653-.318 1.27-.494 1.848-.524.017.16.004.32.004.482Zm4.114 16.11c-.352.81-.768 1.556-1.247 2.24-.654.934-1.188 1.58-1.597 1.938-.635.586-1.316.886-2.044.903-.523 0-1.153-.149-1.886-.452-.735-.301-1.41-.45-2.025-.45-.645 0-1.34.15-2.084.45-.745.303-1.345.46-1.803.474-.699.03-1.396-.279-2.093-.925-.443-.389-1.001-1.059-1.675-2.01-.722-1.018-1.316-2.198-1.782-3.543-.5-1.455-.75-2.865-.75-4.229 0-1.564.338-2.915 1.018-4.05a5.97 5.97 0 0 1 2.096-2.154 5.63 5.63 0 0 1 2.842-.809c.557 0 1.287.173 2.195.512.906.34 1.487.513 1.738.513.188 0 .833-.203 1.928-.609 1.034-.374 1.907-.529 2.624-.467 1.94.157 3.398.922 4.367 2.3-1.735 1.05-2.594 2.52-2.578 4.405.016 1.47.55 2.693 1.598 3.664.475.451 1.008.801 1.6 1.05-.128.37-.265.725-.412 1.064Z" />
      </svg>
    );
  }

  if (key.includes("facebook")) {
    return (
      <svg
        aria-hidden="true"
        data-provider-logo="facebook"
        className="size-[18px] shrink-0"
        viewBox="0 0 24 24"
        fill="#1877F2"
      >
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.02 4.388 11.018 10.125 11.927v-8.437H7.078v-3.49h3.047V9.412c0-3.025 1.792-4.696 4.533-4.696 1.312 0 2.686.236 2.686.236v2.973h-1.513c-1.49 0-1.956.93-1.956 1.884v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.09 24 18.093 24 12.073Z" />
      </svg>
    );
  }

  if (key.includes("microsoft")) {
    return (
      <svg
        aria-hidden="true"
        data-provider-logo="microsoft"
        className="size-[17px] shrink-0"
        viewBox="0 0 24 24"
      >
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#7FBA00" d="M13 1h10v10H13z" />
        <path fill="#00A4EF" d="M1 13h10v10H1z" />
        <path fill="#FFB900" d="M13 13h10v10H13z" />
      </svg>
    );
  }

  return (
    <KeyRound
      aria-hidden="true"
      data-provider-logo="generic"
      className="size-4"
    />
  );
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
    <div className="mt-5 space-y-3">
      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("orContinueWith")}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-2">
        {redirectProviders.map((provider) => (
          <Button
            key={provider.key}
            type="button"
            variant="outline"
            className="h-auto min-h-11 w-full min-w-0 whitespace-normal px-2 py-2 text-center text-sm leading-tight"
            disabled={disabled || loadingKey !== null}
            onClick={() => {
              if (!provider.authorization_url) return;
              setLoadingKey(provider.key);
              storeOAuthReturnTo(returnTo);
              window.location.href = provider.authorization_url;
            }}
          >
            {loadingKey === provider.key ? (
              t("redirecting")
            ) : (
              <>
                <ProviderLogo provider={provider} />
                <span className="min-w-0">{providerLabel(provider, t)}</span>
              </>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
