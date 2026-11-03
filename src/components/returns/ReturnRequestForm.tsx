"use client";

import type { Order, ReturnReason, Variant } from "@spree/sdk";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ProductImage } from "@/components/ui/product-image";
import { Textarea } from "@/components/ui/textarea";
import {
  getExchangeOptions,
  type OrderAccess,
  requestReturnAndExchange,
} from "@/lib/data/returns";
import { formatDate } from "@/lib/utils/format";
import {
  allocateUnits,
  type ReturnableRow,
  returnableRows,
} from "@/lib/utils/returns";

type Mode = "return" | "exchange";

interface Selection {
  quantity: number;
  mode: Mode;
  variantId: string;
}

type Step = "items" | "reason" | "review" | "done";

interface ReturnRequestFormProps {
  order: Order;
  reasons: ReturnReason[];
  orderHref: string;
  locale: string;
  access?: OrderAccess;
}

/**
 * The customer's return and exchange request, in three steps: what is coming
 * back and what they want instead, why, and a review that states how the
 * refund is made before anything is sent. It collects the same facts as the
 * EU model withdrawal form; the confirmation email restates them.
 */
export function ReturnRequestForm({
  order,
  reasons,
  orderHref,
  locale,
  access,
}: ReturnRequestFormProps) {
  const t = useTranslations("returns.form");
  const tr = useTranslations("returns");
  const rows = useMemo(() => returnableRows(order), [order]);
  const [step, setStep] = useState<Step>("items");
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [variantOptions, setVariantOptions] = useState<
    Record<string, Variant[] | undefined>
  >({});
  const [reasonId, setReasonId] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [numbers, setNumbers] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const chosen = rows.filter((row) => (selections[row.key]?.quantity ?? 0) > 0);
  const incompleteExchange = chosen.some(
    (row) =>
      selections[row.key].mode === "exchange" && !selections[row.key].variantId,
  );

  const update = (row: ReturnableRow, patch: Partial<Selection>) => {
    setSelections((current) => {
      const previous: Selection = current[row.key] ?? {
        quantity: 0,
        mode: "return",
        variantId: "",
      };
      return { ...current, [row.key]: { ...previous, ...patch } };
    });
  };

  const chooseMode = (row: ReturnableRow, mode: Mode) => {
    update(row, { mode });
    if (mode !== "exchange" || variantOptions[row.key]) return;

    startTransition(async () => {
      const options = await getExchangeOptions(
        row.lineItem.slug,
        row.lineItem.variant_id,
      );
      setVariantOptions((current) => ({ ...current, [row.key]: options }));
    });
  };

  const submit = () => {
    setError(null);
    const returns = chosen
      .filter((row) => selections[row.key].mode === "return")
      .flatMap((row) => allocateUnits(row.units, selections[row.key].quantity));
    const exchanges = chosen
      .filter((row) => selections[row.key].mode === "exchange")
      .flatMap((row) =>
        allocateUnits(row.units, selections[row.key].quantity).map((unit) => ({
          ...unit,
          new_variant_id: selections[row.key].variantId,
        })),
      );

    startTransition(async () => {
      const result = await requestReturnAndExchange(
        order.id,
        { returns, exchanges, reasonId, memo },
        access,
      );
      if (result.success) {
        setNumbers(
          [result.returnNumber, result.exchangeNumber].filter(
            (number): number is string => Boolean(number),
          ),
        );
        setStep("done");
      } else {
        setError(result.error);
      }
    });
  };

  if (step === "done") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("doneTitle")}
        </h2>
        <p className="text-sm text-gray-600">
          {t("doneNumbers", { numbers: numbers.join(", ") })}
        </p>
        <p className="text-sm text-gray-600">{t("doneBody")}</p>
        <Button asChild>
          <Link href={orderHref}>{t("viewRequest")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="flex gap-4 text-sm" aria-label={t("progress")}>
        {(["items", "reason", "review"] as const).map((name, index) => (
          <li
            key={name}
            aria-current={step === name ? "step" : undefined}
            className={
              step === name ? "font-semibold text-gray-900" : "text-gray-500"
            }
          >
            {index + 1}. {t(`step.${name}`)}
          </li>
        ))}
      </ol>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === "items" && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
          {rows.map((row) => {
            const selection = selections[row.key];
            const options = variantOptions[row.key];
            const disabled = row.returnableQuantity === 0;

            return (
              <fieldset key={row.key} className="p-6 space-y-4">
                <legend className="sr-only">{row.lineItem.name}</legend>
                <div className="flex gap-4">
                  <div className="relative w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    <ProductImage
                      src={row.lineItem.thumbnail_url}
                      alt={row.lineItem.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {row.lineItem.name}
                    </p>
                    {row.lineItem.options_text && (
                      <p className="text-sm text-gray-500">
                        {row.lineItem.options_text}
                      </p>
                    )}
                    {disabled && (
                      <p className="text-sm text-gray-500 mt-1">
                        {tr.has(`nonReturnable.${row.nonReturnableReason}`)
                          ? tr(`nonReturnable.${row.nonReturnableReason}`)
                          : tr("nonReturnable.default")}
                      </p>
                    )}
                  </div>
                  {!disabled && (
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`qty-${row.key}`}>{t("quantity")}</Label>
                      <NativeSelect
                        id={`qty-${row.key}`}
                        size="sm"
                        value={selection?.quantity ?? 0}
                        onChange={(event) =>
                          update(row, { quantity: Number(event.target.value) })
                        }
                      >
                        {Array.from(
                          { length: row.returnableQuantity + 1 },
                          (_, quantity) => (
                            <NativeSelectOption key={quantity} value={quantity}>
                              {quantity}
                            </NativeSelectOption>
                          ),
                        )}
                      </NativeSelect>
                    </div>
                  )}
                </div>

                {(selection?.quantity ?? 0) > 0 && (
                  <div className="space-y-3 pl-24">
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                      {(["return", "exchange"] as const).map((mode) => (
                        <label
                          key={mode}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="radio"
                            name={`mode-${row.key}`}
                            checked={selection.mode === mode}
                            onChange={() => chooseMode(row, mode)}
                          />
                          {t(`mode.${mode}`)}
                        </label>
                      ))}
                    </div>
                    {selection.mode === "exchange" &&
                      (options === undefined ? (
                        <p className="text-sm text-gray-500">{t("loading")}</p>
                      ) : options.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          {t("noVariants")}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={`variant-${row.key}`}>
                            {t("chooseVariant")}
                          </Label>
                          <NativeSelect
                            id={`variant-${row.key}`}
                            value={selection.variantId}
                            onChange={(event) =>
                              update(row, { variantId: event.target.value })
                            }
                          >
                            <NativeSelectOption value="">
                              {t("chooseVariantPlaceholder")}
                            </NativeSelectOption>
                            {options.map((variant) => (
                              <NativeSelectOption
                                key={variant.id}
                                value={variant.id}
                              >
                                {variant.options_text}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </div>
                      ))}
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>
      )}

      {step === "reason" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {reasons.length > 0 && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="return-reason">{t("reason")}</Label>
              <NativeSelect
                id="return-reason"
                className="w-full"
                value={reasonId}
                onChange={(event) => setReasonId(event.target.value)}
              >
                <NativeSelectOption value="">
                  {t("reasonPlaceholder")}
                </NativeSelectOption>
                {reasons.map((reason) => (
                  <NativeSelectOption key={reason.id} value={reason.id}>
                    {reason.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor="return-memo">{t("note")}</Label>
            <Textarea
              id="return-memo"
              value={memo}
              maxLength={1000}
              onChange={(event) => setMemo(event.target.value)}
            />
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <ul className="space-y-2">
            {chosen.map((row) => {
              const selection = selections[row.key];
              const variant = variantOptions[row.key]?.find(
                (option) => option.id === selection.variantId,
              );
              return (
                <li key={row.key} className="text-sm text-gray-900">
                  {selection.mode === "return"
                    ? t("reviewReturn", {
                        quantity: selection.quantity,
                        name: row.lineItem.name,
                      })
                    : t("reviewExchange", {
                        quantity: selection.quantity,
                        name: row.lineItem.name,
                        variant: variant?.options_text ?? "",
                      })}
                </li>
              );
            })}
          </ul>
          <div className="text-sm text-gray-600 space-y-2">
            {order.withdrawal_period_ends_at && (
              <p>
                {tr("withdrawalDeadline", {
                  date: formatDate(
                    order.withdrawal_period_ends_at,
                    "-",
                    locale,
                  ),
                })}
              </p>
            )}
            <p>{t("refundMethod")}</p>
            <p>{t("shippingCost")}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {step === "items" ? (
          <Button asChild variant="outline">
            <Link href={orderHref}>{t("cancel")}</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setStep(step === "review" ? "reason" : "items")}
            disabled={pending}
          >
            {t("back")}
          </Button>
        )}
        {step === "review" ? (
          <Button onClick={submit} disabled={pending}>
            {pending ? t("submitting") : t("submit")}
          </Button>
        ) : (
          <Button
            onClick={() => setStep(step === "items" ? "reason" : "review")}
            disabled={chosen.length === 0 || incompleteExchange || pending}
          >
            {t("next")}
          </Button>
        )}
      </div>
      {step === "items" && chosen.length === 0 && (
        <p className="text-sm text-gray-500">{t("noneSelected")}</p>
      )}
    </div>
  );
}
