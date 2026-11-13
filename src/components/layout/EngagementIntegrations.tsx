"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  type AnalyticsConsentChoice,
  analyticsConsentChoice,
  analyticsConsentGranted,
  analyticsConsentRequired,
} from "@/lib/analytics/consent";
import type { StorefrontIntegrationsConfig } from "@/lib/data/storefront-integrations";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
    clarity?: (action: string, ...args: unknown[]) => void;
  }
}

function resetCrispSession() {
  if (typeof window === "undefined" || !window.$crisp) return;
  try {
    window.$crisp.push(["do", "session:reset"]);
  } catch {
    // ignore
  }
}

export function EngagementIntegrations({
  integrations,
}: {
  integrations?: StorefrontIntegrationsConfig;
}) {
  const crispId = integrations?.crisp?.website_id;
  const clarityId = integrations?.microsoft_clarity?.project_id;
  const [choice, setChoice] = useState<AnalyticsConsentChoice | null>(null);

  useEffect(() => {
    if (analyticsConsentRequired()) {
      setChoice(analyticsConsentChoice());
    }
    const onConsent = (event: Event) => {
      const next = (event as CustomEvent<AnalyticsConsentChoice>).detail;
      setChoice(next);
      if (next === "denied") {
        resetCrispSession();
      }
    };
    window.addEventListener("spree-analytics-consent", onConsent);
    return () =>
      window.removeEventListener("spree-analytics-consent", onConsent);
  }, []);

  const granted = analyticsConsentGranted();

  return (
    <>
      {granted && crispId ? (
        <Script id="spree-crisp" strategy="afterInteractive">
          {`window.$crisp=[];window.CRISP_WEBSITE_ID="${crispId}";(function(){const d=document,s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}
        </Script>
      ) : null}
      {granted && clarityId ? (
        <Script id="spree-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      ) : null}
    </>
  );
}
