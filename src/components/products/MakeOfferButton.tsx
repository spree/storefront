"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { createBuyerOffer } from "@/lib/data/offers";
import { buildAccountLoginHref } from "@/lib/utils/account-redirect";

type MakeOfferButtonProps = {
  variantId?: string;
  available?: boolean;
  basePath: string;
  currency: string;
};

export function MakeOfferButton(props: MakeOfferButtonProps) {
  if (!props.available || !props.variantId) return null;
  return <OfferDialog {...props} variantId={props.variantId} />;
}

function OfferDialog({
  variantId,
  basePath,
  currency,
}: MakeOfferButtonProps & { variantId: string }) {
  const t = useTranslations("offers");
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!isAuthenticated)
    return (
      <Button variant="outline" className="w-full" asChild>
        <Link href={buildAccountLoginHref(basePath, pathname)}>
          {t("makeOffer")}
        </Link>
      </Button>
    );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!variantId || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createBuyerOffer(variantId, amount, message);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(`${basePath}/account/offers`);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {t("makeOffer")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("makeOffer")}</DialogTitle>
            <DialogDescription>{t("offerHelp")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={`${id}-amount`}>
                  {t("yourPrice", { currency })}
                </FieldLabel>
                <Input
                  id={`${id}-amount`}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  disabled={pending}
                />
                {error ? (
                  <FieldError id={`${id}-error`}>{error}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-message`}>
                  {t("offerNote")}
                </FieldLabel>
                <Textarea
                  id={`${id}-message`}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={2000}
                  disabled={pending}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? t("sendingOffer") : t("sendOffer")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
