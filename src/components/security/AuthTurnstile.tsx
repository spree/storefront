"use client";

import { useCallback, useState } from "react";
import type { TurnstileAction } from "@/hooks/use-turnstile-config";
import { useTurnstileConfig } from "@/hooks/use-turnstile-config";
import { TurnstileField } from "./TurnstileField";

export function AuthTurnstile({
  action,
  onTokenChange,
}: {
  action: TurnstileAction;
  onTokenChange: (token: string | null) => void;
}) {
  const { siteKey, required, loading } = useTurnstileConfig(action);
  const [error, setError] = useState(false);

  const handleToken = useCallback(
    (token: string | null) => {
      setError(!token && required);
      onTokenChange(token);
    },
    [onTokenChange, required],
  );

  if (loading || !required || !siteKey) {
    return null;
  }

  return (
    <div className="space-y-1">
      <TurnstileField siteKey={siteKey} action={action} onToken={handleToken} />
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          Complete the security check to continue.
        </p>
      ) : null}
    </div>
  );
}
