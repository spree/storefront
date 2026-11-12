"use client";

import type { Cart } from "@spree/sdk";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type Ref,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PurchaseOrderSectionHandle {
  /**
   * Persists what is typed but not yet saved. Place Order awaits this, so a
   * reference the buyer typed and never blurred out of still reaches the cart
   * before its requirements are read.
   *
   * @returns whether the cart now holds what the field shows — false when a
   *   pending write failed, in which case the cart still carries the previous
   *   reference and must not be placed on it.
   */
  flush: () => Promise<boolean>;
}

interface PurchaseOrderSectionProps {
  ref?: Ref<PurchaseOrderSectionHandle>;
  cart: Cart;
  onSave: (poNumber: string) => Promise<boolean>;
  processing?: boolean;
  errors?: string[];
}

/**
 * The buyer's own purchase-order reference, which their accounting reconciles
 * the order, the invoice and the payment against.
 *
 * Shown to company buyers only. A company may require one, and the server then
 * refuses to complete the checkout without it — leaving the field out is what
 * stranded those buyers at Place Order.
 */
export function PurchaseOrderSection({
  ref,
  cart,
  onSave,
  processing,
  errors,
}: PurchaseOrderSectionProps) {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");

  const [poNumber, setPoNumber] = useState(cart.po_number ?? "");
  const [saving, setSaving] = useState(false);

  // What the cart is known to hold, so a blur that changed nothing — and the
  // flush before Place Order — cost no round-trip.
  const savedRef = useRef((cart.po_number ?? "").trim());
  const poNumberRef = useRef(poNumber);
  poNumberRef.current = poNumber;

  const save = useCallback(async (): Promise<boolean> => {
    const value = poNumberRef.current.trim();
    if (value === savedRef.current) return true;

    setSaving(true);
    try {
      // Left unrecorded on failure, so the next blur or the flush below
      // retries rather than reporting a number the cart never took.
      const saved = await onSave(value);
      if (saved) savedRef.current = value;
      return saved;
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  useImperativeHandle(ref, () => ({ flush: save }), [save]);

  const required = cart.po_number_required;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">
          {t("purchaseOrder")}
        </h2>
        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            {tc("saving")}
          </span>
        )}
      </div>

      {errors && errors.length > 0 && (
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 mb-3">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>
      )}

      <Label htmlFor="po-number" className="mb-1.5 text-gray-700">
        {required ? t("poNumberRequiredLabel") : t("poNumberOptionalLabel")}
      </Label>
      <Input
        id="po-number"
        name="po_number"
        autoComplete="off"
        spellCheck={false}
        required={required}
        disabled={processing}
        value={poNumber}
        onChange={(e) => setPoNumber(e.target.value)}
        onBlur={save}
        placeholder={t("poNumberPlaceholder")}
      />
      <p className="text-xs text-gray-500 mt-1.5">
        {required
          ? cart.company_name
            ? t("poNumberRequiredByCompany", { company: cart.company_name })
            : t("poNumberRequiredHint")
          : t("poNumberOptionalHint")}
      </p>
    </div>
  );
}
