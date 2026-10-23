"use client";

import type { ProductReview, ReviewablePurchase } from "@spree/sdk";
import { ArrowLeft, ArrowRight, Check, ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/ui/product-image";
import { Textarea } from "@/components/ui/textarea";
import {
  createProductReview,
  getProductReviewAttributeTemplate,
  updateProductReview,
  uploadReviewMedia,
} from "@/lib/data/reviews";
import {
  type AttributeAnswerDraft,
  type ReviewAttributeDefinition,
  ReviewAttributeQuestions,
  serializeAttributeAnswers,
  validateAttributeAnswers,
} from "./ReviewAttributeQuestions";
import { StarRatingInput } from "./StarRating";

type PendingMedia = {
  key: string;
  signedId: string;
  previewUrl: string;
  filename: string;
  kind: "image" | "video";
};

export type ReviewFormTarget =
  | { mode: "create"; purchase: ReviewablePurchase }
  | { mode: "edit"; review: ProductReview };

interface ReviewFormDialogProps {
  target: ReviewFormTarget;
  onClose: () => void;
}

export function ReviewFormDialog({ target, onClose }: ReviewFormDialogProps) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const fileInputId = useId();
  const titleInputId = useId();
  const bodyInputId = useId();
  const ratingGroupId = useId();
  const recommendGroupId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const initialRating = target.mode === "edit" ? target.review.rating : 0;
  const [rating, setRating] = useState(initialRating);
  const [itemQualityRating, setItemQualityRating] = useState(
    target.mode === "edit" ? (target.review.item_quality_rating ?? 0) : 0,
  );
  const [shippingRating, setShippingRating] = useState(
    target.mode === "edit" ? (target.review.shipping_rating ?? 0) : 0,
  );
  const [customerServiceRating, setCustomerServiceRating] = useState(
    target.mode === "edit" ? (target.review.customer_service_rating ?? 0) : 0,
  );
  const [recommended, setRecommended] = useState<boolean | null>(
    target.mode === "edit" ? (target.review.recommended ?? null) : null,
  );
  const [title, setTitle] = useState(
    target.mode === "edit" ? (target.review.title ?? "") : "",
  );
  const [body, setBody] = useState(
    target.mode === "edit" ? (target.review.body ?? "") : "",
  );
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState<
    ReviewAttributeDefinition[]
  >([]);
  const [attributeAnswers, setAttributeAnswers] = useState<
    Record<string, AttributeAnswerDraft>
  >({});

  const productLabel =
    target.mode === "create"
      ? target.purchase.product_name
      : target.review.product_name;

  const attributesValid = validateAttributeAnswers(
    attributeDefinitions,
    attributeAnswers,
  );

  const canSubmit =
    rating >= 1 &&
    rating <= 5 &&
    itemQualityRating >= 1 &&
    itemQualityRating <= 5 &&
    shippingRating >= 1 &&
    shippingRating <= 5 &&
    customerServiceRating >= 1 &&
    customerServiceRating <= 5 &&
    recommended !== null &&
    attributesValid &&
    !pending &&
    !uploading &&
    title.trim().length > 0 &&
    body.trim().length > 0;
  const canContinueFromRating =
    rating >= 1 && recommended !== null && !pending && !uploading;

  const existingImages =
    target.mode === "edit" ? (target.review.images ?? []) : [];
  const existingVideos =
    target.mode === "edit" ? (target.review.videos ?? []) : [];

  useEffect(() => {
    if (target.mode !== "create") return;
    const slug = target.purchase.product_slug;
    if (!slug) return;
    void getProductReviewAttributeTemplate(slug).then((template) => {
      if (!template || typeof template !== "object") return;
      const definitions = Reflect.get(template, "definitions");
      if (Array.isArray(definitions)) {
        setAttributeDefinitions(definitions as ReviewAttributeDefinition[]);
      }
    });
  }, [target]);

  async function handleAddMedia(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    setUploading(true);
    try {
      const next: PendingMedia[] = [];
      for (const file of Array.from(fileList)) {
        const kind = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : null;
        const supported =
          ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
            file.type,
          ) ||
          ["video/mp4", "video/webm", "video/quicktime"].includes(file.type);
        if (!kind || !supported) {
          setError(t("mediaType"));
          continue;
        }
        const savedImageCount =
          existingImages.length +
          media.filter((item) => item.kind === "image").length +
          next.filter((item) => item.kind === "image").length;
        const savedVideoCount =
          existingVideos.length +
          media.filter((item) => item.kind === "video").length +
          next.filter((item) => item.kind === "video").length;
        if (
          (kind === "image" && savedImageCount >= 10) ||
          (kind === "video" && savedVideoCount >= 2)
        ) {
          setError(t("mediaLimit"));
          continue;
        }
        const formData = new FormData();
        formData.set("file", file);
        const signedId = await uploadReviewMedia(formData);
        next.push({
          key: `${file.name}-${file.size}-${file.lastModified}`,
          signedId,
          previewUrl: URL.createObjectURL(file),
          filename: file.name,
          kind,
        });
      }
      if (next.length) setMedia((current) => [...current, ...next]);
    } catch {
      setError(t("mediaFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeMedia(key: string) {
    setMedia((current) => {
      const targetMedia = current.find((item) => item.key === key);
      if (targetMedia) URL.revokeObjectURL(targetMedia.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  }

  function handleSubmit() {
    if (!attributesValid) {
      setError(t("attributeAnswersRequired"));
      return;
    }
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        const imageIds = media
          .filter((item) => item.kind === "image")
          .map((item) => item.signedId);
        const videoIds = media
          .filter((item) => item.kind === "video")
          .map((item) => item.signedId);
        const serializedAttributes =
          serializeAttributeAnswers(attributeAnswers);
        if (target.mode === "create") {
          await createProductReview({
            line_item_id: target.purchase.line_item_id,
            rating,
            item_quality_rating: itemQualityRating,
            shipping_rating: shippingRating,
            customer_service_rating: customerServiceRating,
            recommended,
            title: title.trim() || undefined,
            body: body.trim() || undefined,
            images: imageIds.length ? imageIds : undefined,
            videos: videoIds.length ? videoIds : undefined,
            attribute_answers:
              serializedAttributes.length > 0
                ? serializedAttributes
                : undefined,
          });
        } else {
          await updateProductReview(target.review.id, {
            rating,
            item_quality_rating: itemQualityRating,
            shipping_rating: shippingRating,
            customer_service_rating: customerServiceRating,
            recommended,
            title: title.trim() || undefined,
            body: body.trim() || undefined,
            images: imageIds.length ? imageIds : undefined,
            videos: videoIds.length ? videoIds : undefined,
          });
        }
        for (const item of media) URL.revokeObjectURL(item.previewUrl);
        router.refresh();
        onClose();
      } catch {
        setError(t("submitFailed"));
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[min(90dvh,52rem)] w-[calc(100%-2rem)] max-w-xl overflow-x-hidden overflow-y-auto border-marketplace-border-subtle bg-marketplace-surface p-5 sm:p-7"
        aria-labelledby={`review-form-title-${fileInputId}`}
        aria-describedby={`review-form-description-${fileInputId}`}
      >
        <DialogHeader className="flex flex-col items-start justify-between gap-4 space-y-0 text-left sm:flex-row">
          <div>
            <DialogTitle
              id={`review-form-title-${fileInputId}`}
              className="font-display text-xl font-semibold text-marketplace-brand"
            >
              {target.mode === "create" ? t("writeReview") : t("editReview")}
            </DialogTitle>
            <DialogDescription
              id={`review-form-description-${fileInputId}`}
              className="sr-only"
            >
              {productLabel ?? t("productFallback")}
            </DialogDescription>
            {productLabel ? (
              <p className="mt-1 text-sm text-marketplace-muted-foreground">
                {productLabel}
              </p>
            ) : null}
          </div>
          <ol
            className="flex items-center gap-2 text-xs font-medium"
            aria-label={t("reviewSteps")}
          >
            {[1, 2].map((number) => (
              <li
                key={number}
                aria-current={step === number ? "step" : undefined}
                className={`flex items-center gap-1.5 ${step === number ? "text-marketplace-brand" : "text-marketplace-muted-foreground"}`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full border ${step === number ? "border-marketplace-brand bg-marketplace-brand text-white" : "border-marketplace-border-subtle"}`}
                >
                  {number}
                </span>
                <span className="hidden sm:inline">
                  {number === 1 ? t("formStepRating") : t("formStepDetails")}
                </span>
              </li>
            ))}
          </ol>
        </DialogHeader>

        {target.mode === "create" ? (
          <div className="mt-5 flex items-center gap-4 rounded-md bg-marketplace-surface-warm/70 p-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-marketplace-surface">
              <ProductImage
                src={target.purchase.thumbnail_url}
                alt={productLabel ?? ""}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold text-marketplace-foreground">
                {productLabel}
              </p>
              {target.purchase.order_number ? (
                <p className="mt-1 text-xs text-marketplace-muted-foreground">
                  {t("orderNumber", { number: target.purchase.order_number })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="mt-5 space-y-6">
            <section className="rounded-md bg-marketplace-surface-warm/60 p-4 sm:p-5">
              <p className="mb-3 text-sm font-semibold text-marketplace-foreground">
                {t("ratingLabel")}{" "}
                <span aria-hidden="true" className="text-red-600">
                  *
                </span>
              </p>
              <StarRatingInput
                value={rating}
                onChange={setRating}
                label={t("ratingLabel")}
                disabled={pending || uploading}
              />
            </section>
            <fieldset>
              <legend className="text-sm font-semibold text-marketplace-foreground">
                {t("recommendPrompt")}{" "}
                <span aria-hidden="true" className="text-red-600">
                  *
                </span>
              </legend>
              <div className="mt-3 inline-flex rounded-full bg-marketplace-surface-warm p-1">
                {([true, false] as const).map((answer) => (
                  <label
                    key={String(answer)}
                    htmlFor={`${recommendGroupId}-${answer ? "yes" : "no"}`}
                    className={`inline-flex h-10 min-w-24 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marketplace-brand ${recommended === answer ? "bg-marketplace-brand text-white" : "text-marketplace-foreground hover:bg-marketplace-surface"}`}
                  >
                    <input
                      id={`${recommendGroupId}-${answer ? "yes" : "no"}`}
                      type="radio"
                      name={recommendGroupId}
                      value={String(answer)}
                      checked={recommended === answer}
                      disabled={pending || uploading}
                      onChange={() => setRecommended(answer)}
                      className="sr-only"
                    />
                    {recommended === answer ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : null}
                    {answer ? t("recommendYes") : t("recommendNo")}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <fieldset className="space-y-1 rounded-md bg-marketplace-surface-warm/60 p-4 sm:p-5">
              <legend className="sr-only">{t("ratingLabel")}</legend>
              <div className="divide-y divide-marketplace-border-subtle">
                <div className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p
                    id={`${ratingGroupId}-quality`}
                    className="text-sm font-semibold text-marketplace-foreground"
                  >
                    {t("itemQualityRating")}{" "}
                    <span aria-hidden="true" className="text-red-600">
                      *
                    </span>
                  </p>
                  <StarRatingInput
                    value={itemQualityRating}
                    onChange={setItemQualityRating}
                    label={t("itemQualityRating")}
                    disabled={pending || uploading}
                  />
                </div>
                <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p
                    id={`${ratingGroupId}-shipping`}
                    className="text-sm font-semibold text-marketplace-foreground"
                  >
                    {t("shippingRating")}{" "}
                    <span aria-hidden="true" className="text-red-600">
                      *
                    </span>
                  </p>
                  <StarRatingInput
                    value={shippingRating}
                    onChange={setShippingRating}
                    label={t("shippingRating")}
                    disabled={pending || uploading}
                  />
                </div>
                <div className="flex flex-col gap-2 py-3 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p
                    id={`${ratingGroupId}-service`}
                    className="text-sm font-semibold text-marketplace-foreground"
                  >
                    {t("customerServiceRating")}{" "}
                    <span aria-hidden="true" className="text-red-600">
                      *
                    </span>
                  </p>
                  <StarRatingInput
                    value={customerServiceRating}
                    onChange={setCustomerServiceRating}
                    label={t("customerServiceRating")}
                    disabled={pending || uploading}
                  />
                </div>
              </div>
            </fieldset>
            {attributeDefinitions.length > 0 ? (
              <ReviewAttributeQuestions
                definitions={attributeDefinitions}
                answers={attributeAnswers}
                onChange={setAttributeAnswers}
                disabled={pending || uploading}
                legend={t("categoryQuestionsLegend")}
              />
            ) : null}
            <div>
              <label
                htmlFor={titleInputId}
                className="text-sm font-semibold text-marketplace-foreground"
              >
                {t("titleOptional")}{" "}
                <span aria-hidden="true" className="text-red-600">
                  *
                </span>
              </label>
              <Input
                id={titleInputId}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
                className="mt-2"
              />
            </div>
            <div>
              <label
                htmlFor={bodyInputId}
                className="text-sm font-semibold text-marketplace-foreground"
              >
                {t("bodyLabel")}{" "}
                <span aria-hidden="true" className="text-red-600">
                  *
                </span>
              </label>
              <div className="mt-2 overflow-hidden rounded-lg border border-marketplace-border-subtle bg-marketplace-surface transition-colors focus-within:border-marketplace-brand focus-within:ring-2 focus-within:ring-marketplace-brand/15">
                <Textarea
                  id={bodyInputId}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={5}
                  required
                  maxLength={5000}
                  className="min-h-32 resize-y rounded-none border-0 bg-transparent px-3 py-3 shadow-none focus:border-0 focus:outline-none focus-visible:ring-0"
                />
                {existingImages.length > 0 ||
                existingVideos.length > 0 ||
                media.length > 0 ? (
                  <ul className="flex flex-wrap gap-2 px-3 pb-3">
                    {existingImages.map((image) => (
                      <li key={image.id}>
                        <a href={image.url} target="_blank" rel="noreferrer">
                          <ProductImage
                            src={image.url}
                            alt={image.filename}
                            width={64}
                            height={64}
                            className="size-16 rounded-md border border-marketplace-border-subtle object-cover"
                          />
                        </a>
                      </li>
                    ))}
                    {existingVideos.map((video) => (
                      <li key={video.id}>
                        {/* biome-ignore lint/a11y/useMediaCaption: Review uploads do not include separate caption-track files. */}
                        <video
                          src={video.url}
                          controls
                          aria-label={video.filename}
                          className="h-16 w-28 rounded-md border border-marketplace-border-subtle bg-black object-cover"
                        />
                      </li>
                    ))}
                    {media.map((item) => (
                      <li key={item.key} className="relative">
                        {item.kind === "image" ? (
                          // biome-ignore lint/performance/noImgElement: Local blob previews are not available to Next Image optimization.
                          <img
                            src={item.previewUrl}
                            alt={item.filename}
                            className="size-16 rounded-md border border-marketplace-border-subtle object-cover"
                          />
                        ) : (
                          // biome-ignore lint/a11y/useMediaCaption: Review uploads do not include separate caption-track files.
                          <video
                            src={item.previewUrl}
                            controls
                            aria-label={item.filename}
                            className="h-16 w-28 rounded-md border border-marketplace-border-subtle bg-black object-cover"
                          />
                        )}
                        <button
                          type="button"
                          className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-marketplace-border-subtle bg-marketplace-surface text-marketplace-foreground shadow-sm"
                          onClick={() => removeMedia(item.key)}
                          aria-label={t("removeMedia", {
                            filename: item.filename,
                          })}
                        >
                          <X aria-hidden="true" className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex items-center justify-between gap-3 border-t border-marketplace-border-subtle px-3 py-2">
                  <p className="text-xs tabular-nums text-marketplace-muted-foreground">
                    {body.length}/5000
                  </p>
                  <p id={`${fileInputId}-help`} className="sr-only">
                    {t("mediaHelp")}
                  </p>
                  <input
                    ref={fileInputRef}
                    id={fileInputId}
                    type="file"
                    aria-label={t("mediaLabel")}
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    multiple
                    className="sr-only"
                    onChange={(event) => handleAddMedia(event.target.files)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={uploading ? t("uploadingMedia") : t("addMedia")}
                    aria-label={uploading ? t("uploadingMedia") : t("addMedia")}
                    aria-describedby={`${fileInputId}-help`}
                    disabled={pending || uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 -mb-5 mt-6 flex items-center justify-between gap-3 border-t border-marketplace-border-subtle bg-marketplace-surface py-4 sm:-mb-7">
          <Button
            type="button"
            variant="ghost"
            onClick={step === 1 ? onClose : () => setStep(1)}
            disabled={pending || uploading}
          >
            {step === 1 ? (
              t("cancel")
            ) : (
              <>
                <ArrowLeft aria-hidden="true" />
                {t("back")}
              </>
            )}
          </Button>
          {step === 1 ? (
            <Button
              type="button"
              disabled={!canContinueFromRating}
              onClick={() => setStep(2)}
            >
              {t("continue")}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {pending ? t("submitting") : t("submit")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
