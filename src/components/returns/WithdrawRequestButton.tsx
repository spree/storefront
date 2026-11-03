"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { type OrderAccess, withdrawRequest } from "@/lib/data/returns";

interface WithdrawRequestButtonProps {
  orderId: string;
  kind: "return" | "exchange";
  id: string;
  access?: OrderAccess;
}

/** Withdraws a request the store has not acted on yet. */
export function WithdrawRequestButton({
  orderId,
  kind,
  id,
  access,
}: WithdrawRequestButtonProps) {
  const t = useTranslations("returns");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const withdraw = () => {
    if (!window.confirm(t("withdrawConfirm"))) return;

    startTransition(async () => {
      const result = await withdrawRequest(orderId, kind, id, access);
      if (result.success) {
        toast.success(t("withdrawn"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={withdraw} disabled={pending}>
      {t("withdraw")}
    </Button>
  );
}
