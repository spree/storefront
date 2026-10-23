"use client";

import { useEffect, useState } from "react";
import {
  getStorefrontIntegrations,
  type StorefrontIntegrationsConfig,
} from "@/lib/data/storefront-integrations";

export type TurnstileAction = "register" | "login" | "password_reset";

function isProtected(
  config: StorefrontIntegrationsConfig["turnstile"],
  action: TurnstileAction,
): boolean {
  if (!config?.site_key) return false;
  switch (action) {
    case "register":
      return config.protect_registration !== false;
    case "login":
      return config.protect_login === true;
    case "password_reset":
      return config.protect_password_reset !== false;
    default:
      return false;
  }
}

export function useTurnstileConfig(action: TurnstileAction) {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getStorefrontIntegrations().then((config) => {
      if (!active) return;
      const turnstile = config.turnstile;
      if (turnstile?.site_key && isProtected(turnstile, action)) {
        setSiteKey(turnstile.site_key);
        setRequired(true);
      } else {
        setSiteKey(null);
        setRequired(false);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [action]);

  return { siteKey, required, loading };
}
