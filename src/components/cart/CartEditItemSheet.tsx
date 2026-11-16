"use client";

import type { LineItem, Media, Product, Variant } from "@spree/sdk";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { QuantityPickerField } from "@/components/cart/QuantityPickerField";
import { ProductPersonalizationForm } from "@/components/products/ProductPersonalizationForm";
import { VariantPicker } from "@/components/products/VariantPicker";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { replaceCartLineItem } from "@/lib/data/cart";
import { getProduct } from "@/lib/data/products";
import {
  answersFromPersonalizationSnapshot,
  buildPersonalizationPayload,
  mapServerPersonalizationErrors,
  type PersonalizationAnswers,
  type PersonalizationFieldError,
  personalizationPayloadsEqual,
  validatePersonalizationAnswers,
} from "@/lib/personalization";

type CartLinePersonalization = LineItem & {
  personalization_snapshot?: Array<Record<string, unknown>> | null;
};

type Props = {
  item: LineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
};

function findVariant(product: Product, variantId: string): Variant | null {
  const variants = product.variants ?? [];
  return (
    variants.find((variant) => variant.id === variantId) ||
    product.default_variant ||
    null
  );
}

function mediaUrl(media: Media | null | undefined): string | null {
  if (!media) return null;
  return (
    media.large_url ||
    media.medium_url ||
    media.original_url ||
    media.xlarge_url ||
    media.small_url ||
    null
  );
}

export function CartEditItemSheet({
  item,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const t = useTranslations("cart");
  const tp = useTranslations("personalization");
  const tc = useTranslations("common");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [answers, setAnswers] = useState<PersonalizationAnswers>({});
  const [errors, setErrors] = useState<PersonalizationFieldError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [personalizationOpen, setPersonalizationOpen] = useState(true);

  useEffect(() => {
    if (!open || !item) {
      setProduct(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setQuantity(item.quantity);
    setMediaIndex(0);

    void getProduct(item.slug, {
      expand: [
        "seller",
        "media",
        "variants",
        "default_variant",
        "option_types",
        "option_values",
        "personalization_fields",
      ],
    })
      .then((loaded) => {
        if (cancelled) return;
        setProduct(loaded);
        const variant = findVariant(loaded, item.variant_id);
        setSelectedVariant(variant);
        const fields = loaded.personalization_fields ?? [];
        const snapshot = (item as CartLinePersonalization)
          .personalization_snapshot;
        const hydrated = answersFromPersonalizationSnapshot(fields, snapshot);
        setAnswers(hydrated);
        setPersonalizationOpen(
          fields.length > 0 &&
            (Object.keys(hydrated).length > 0 ||
              fields.some((field) => field.required)),
        );
        setErrors([]);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(t("editItemLoadFailed"));
          setProduct(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, item, t]);

  const fields = product?.personalization_fields ?? [];
  const hasPersonalization = fields.length > 0;
  const optionTypes = product?.option_types ?? [];
  const variants = product?.variants ?? [];
  const media = useMemo(() => product?.media ?? [], [product?.media]);
  const currentMedia = media[mediaIndex] ?? media[0];
  const imageSrc =
    mediaUrl(currentMedia) ||
    selectedVariant?.thumbnail_url ||
    product?.thumbnail_url ||
    item?.thumbnail_url;
  const displayPrice =
    selectedVariant?.price?.display_amount ||
    product?.price?.display_amount ||
    item?.display_price;
  const baseUnitAmount = (() => {
    const amount =
      selectedVariant?.price?.amount ?? product?.price?.amount ?? item?.price;
    if (amount == null || amount === "") return null;
    const value = Number.parseFloat(String(amount));
    return Number.isFinite(value) ? value : null;
  })();

  const handleSave = async () => {
    if (!item || !product || !selectedVariant || saving || uploading) return;

    if (hasPersonalization) {
      const clientErrors = validatePersonalizationAnswers(fields, answers);
      if (clientErrors.length > 0) {
        setErrors(clientErrors);
        setPersonalizationOpen(true);
        toast.error(tp("formErrors"));
        return;
      }
      setErrors([]);
    }

    const payload = hasPersonalization
      ? buildPersonalizationPayload(fields, answers)
      : undefined;
    const originalPayload = hasPersonalization
      ? buildPersonalizationPayload(
          fields,
          answersFromPersonalizationSnapshot(
            fields,
            (item as CartLinePersonalization).personalization_snapshot,
          ),
        )
      : [];
    const quantityOnly =
      selectedVariant.id === item.variant_id &&
      (!hasPersonalization ||
        personalizationPayloadsEqual(payload ?? [], originalPayload));

    setSaving(true);
    try {
      const result = await replaceCartLineItem(item.id, {
        variantId: selectedVariant.id,
        quantity,
        personalization: payload,
        quantityOnly,
      });
      if (!result.success) {
        if (hasPersonalization) {
          const mapped = mapServerPersonalizationErrors(
            fields,
            "details" in result
              ? (result.details as Record<string, unknown> | undefined)
              : undefined,
            result.error,
          );
          if (mapped.length > 0) {
            setErrors(mapped);
            setPersonalizationOpen(true);
          }
        }
        toast.error(result.error || t("editItemSaveFailed"));
        return;
      }
      toast.success(t("editItemSaved"));
      await onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-md"
        showCloseButton
      >
        <SheetHeader className="border-b border-marketplace-border-subtle px-5 py-4">
          <SheetTitle className="pr-8 text-lg font-semibold tracking-tight text-marketplace-foreground">
            {t("editItem")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="aspect-square rounded-2xl bg-marketplace-muted" />
              <div className="h-5 w-3/4 rounded bg-marketplace-muted" />
              <div className="h-4 w-1/3 rounded bg-marketplace-muted" />
              <div className="h-24 rounded bg-marketplace-muted" />
            </div>
          ) : loadError ? (
            <p className="text-sm text-marketplace-danger">{loadError}</p>
          ) : product && item ? (
            <div className="space-y-5">
              <div>
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-marketplace-surface-warm ring-1 ring-black/[0.04]">
                  <ProductImage
                    src={imageSrc}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                  {media.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-marketplace-foreground shadow-sm transition-transform duration-150 ease-out active:scale-95"
                        onClick={() =>
                          setMediaIndex(
                            (index) =>
                              (index - 1 + media.length) % media.length,
                          )
                        }
                        aria-label={t("editItemPreviousImage")}
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-marketplace-foreground shadow-sm transition-transform duration-150 ease-out active:scale-95"
                        onClick={() =>
                          setMediaIndex((index) => (index + 1) % media.length)
                        }
                        aria-label={t("editItemNextImage")}
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </>
                  ) : null}
                </div>
                {media.length > 1 ? (
                  <div className="mt-2.5 flex justify-center gap-1.5">
                    {media.map((entry, index) => (
                      <button
                        key={entry.id}
                        type="button"
                        aria-label={t("editItemImageDot", {
                          index: index + 1,
                        })}
                        className={`size-1.5 rounded-full transition-colors duration-150 ease-out ${
                          index === mediaIndex
                            ? "bg-marketplace-foreground"
                            : "bg-marketplace-border"
                        }`}
                        onClick={() => setMediaIndex(index)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <h3 className="text-base font-medium leading-snug tracking-tight text-marketplace-foreground">
                  {product.name}
                </h3>
                {displayPrice ? (
                  <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-marketplace-foreground">
                    {displayPrice}
                  </p>
                ) : null}
              </div>

              {optionTypes.length > 0 && variants.length > 0 ? (
                <VariantPicker
                  variants={variants}
                  optionTypes={optionTypes}
                  selectedVariant={selectedVariant}
                  onVariantChange={setSelectedVariant}
                  preferDropdown
                />
              ) : null}

              {hasPersonalization ? (
                <div>
                  <button
                    type="button"
                    className="text-sm font-medium text-marketplace-muted-foreground underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-150 ease-out hover:text-marketplace-foreground hover:decoration-marketplace-foreground"
                    onClick={() => setPersonalizationOpen((value) => !value)}
                  >
                    {personalizationOpen
                      ? t("hidePersonalization")
                      : t("selectPersonalization")}
                  </button>
                  {personalizationOpen ? (
                    <ProductPersonalizationForm
                      fields={fields}
                      answers={answers}
                      onChange={setAnswers}
                      errors={errors}
                      disabled={saving}
                      baseDisplayPrice={displayPrice}
                      currency={item.currency}
                      baseUnitAmount={baseUnitAmount}
                      uploadingChange={setUploading}
                    />
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-marketplace-foreground">
                  {tc("quantity")}
                </label>
                <div className="max-w-[7rem]">
                  <QuantityPickerField
                    quantity={quantity}
                    onQuantityChange={setQuantity}
                    disabled={saving}
                    variant="dropdown"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-marketplace-border-subtle p-4">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-full bg-marketplace-foreground text-marketplace-surface transition-[transform,background-color] duration-150 ease-out hover:bg-marketplace-foreground/90 active:scale-[0.98]"
            disabled={
              loading || saving || uploading || !product || !selectedVariant
            }
            onClick={handleSave}
          >
            {saving ? tc("saving") : t("saveItem")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
