"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupOrder } from "@/lib/data/returns";

type State = "idle" | "sent" | "failed";

/**
 * Asks for a link to an order. The answer is the same whether or not the
 * details matched — the link only ever goes to the order's own address.
 */
export function FindOrderForm() {
  // Filled in when the customer arrives from a request confirmation email.
  const defaultNumber = useSearchParams().get("number") ?? undefined;
  const t = useTranslations("returns.find");
  const [state, submit, pending] = useActionState<State, FormData>(
    async (_previous, formData) => {
      const result = await lookupOrder(
        String(formData.get("number") ?? ""),
        String(formData.get("email") ?? ""),
      );
      return result.ok ? "sent" : "failed";
    },
    "idle",
  );

  if (state === "sent") {
    return (
      <Alert>
        <AlertDescription>{t("sent")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={submit} className="space-y-4">
      {state === "failed" && (
        <Alert variant="destructive">
          <AlertDescription>{t("failed")}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor="lookup-number">{t("number")}</Label>
        <Input
          id="lookup-number"
          name="number"
          required
          autoComplete="off"
          defaultValue={defaultNumber}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="lookup-email">{t("email")}</Label>
        <Input
          id="lookup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
