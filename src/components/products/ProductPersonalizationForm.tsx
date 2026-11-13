"use client";

import type { ProductPersonalizationField } from "@spree/sdk";
import { Loader2, Plus, Upload, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { uploadPersonalizationFile } from "@/lib/data/personalization-uploads";
import {
  estimatePersonalizationUnitSurcharge,
  type PersonalizationAnswer,
  type PersonalizationAnswers,
  type PersonalizationFieldError,
  sortPersonalizationChoices,
  sortPersonalizationFields,
  visiblePersonalizationFields,
} from "@/lib/personalization";
import { cn } from "@/lib/utils";
import { extractBasePath } from "@/lib/utils/path";

type Props = {
  fields: ProductPersonalizationField[];
  answers: PersonalizationAnswers;
  onChange: (answers: PersonalizationAnswers) => void;
  errors?: PersonalizationFieldError[];
  disabled?: boolean;
  /** Base unit display amount string from variant/product, e.g. "$50.00". */
  baseDisplayPrice?: string | null;
  /** Currency code for estimate formatting. */
  currency?: string;
  /** Base unit amount in major units for estimate math. */
  baseUnitAmount?: number | null;
  uploadingChange?: (uploading: boolean) => void;
  compact?: boolean;
};

function errorFor(
  errors: PersonalizationFieldError[] | undefined,
  fieldId: string,
): PersonalizationFieldError | undefined {
  return errors?.find((e) => e.fieldId === fieldId);
}

function formatMoney(amount: number, currency?: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

function RequiredMark() {
  return (
    <span className="text-red-600" aria-hidden="true">
      *
    </span>
  );
}

export function ProductPersonalizationForm({
  fields,
  answers,
  onChange,
  errors,
  disabled,
  baseDisplayPrice,
  currency,
  baseUnitAmount,
  uploadingChange,
  compact = false,
}: Props) {
  const t = useTranslations("personalization");
  const ordered = sortPersonalizationFields(fields);
  const visible = visiblePersonalizationFields(ordered, answers);

  if (ordered.length === 0) return null;

  const setAnswer = (fieldId: string, patch: PersonalizationAnswer) => {
    onChange({
      ...answers,
      [fieldId]: { ...answers[fieldId], ...patch },
    });
  };

  const clearAnswer = (fieldId: string) => {
    const next = { ...answers };
    delete next[fieldId];
    onChange(next);
  };

  const surcharge = estimatePersonalizationUnitSurcharge(ordered, answers);
  const showEstimate =
    baseUnitAmount != null && Number.isFinite(baseUnitAmount) && surcharge > 0;

  return (
    <div
      className={
        compact
          ? "space-y-4"
          : "mt-7 space-y-5 rounded-[var(--marketplace-radius-md)] border border-marketplace-border bg-marketplace-surface-subtle/50 p-4 sm:p-5"
      }
    >
      {!compact ? (
        <div>
          <h2 className="text-lg font-medium text-marketplace-foreground">
            {t("personalizeTitle")}
          </h2>
          <p className="mt-1 text-sm text-marketplace-muted-foreground">
            {t("personalizeHelp")}
          </p>
        </div>
      ) : null}

      <div className={compact ? "space-y-4" : "space-y-5"}>
        {visible.map((field) => (
          <PersonalizationFieldControl
            key={field.id}
            field={field}
            answer={answers[field.id]}
            error={errorFor(errors, field.id)}
            disabled={disabled}
            onChange={(patch) => setAnswer(field.id, patch)}
            onClear={() => clearAnswer(field.id)}
            uploadingChange={uploadingChange}
            compact={compact}
          />
        ))}
      </div>

      {showEstimate && (
        <div className="rounded-[var(--marketplace-radius-sm)] border border-marketplace-border bg-marketplace-surface p-4 text-sm">
          <p className="font-medium text-marketplace-foreground">
            {t("estimatedTotal")}
          </p>
          <p className="mt-1 text-xs text-marketplace-muted-foreground">
            {t("estimatedTotalHelp")}
          </p>
          <dl className="mt-3 space-y-1">
            <div className="flex justify-between gap-4">
              <dt className="text-marketplace-muted-foreground">
                {t("basePrice")}
              </dt>
              <dd className="text-marketplace-foreground">
                {baseDisplayPrice ?? formatMoney(baseUnitAmount ?? 0, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-marketplace-muted-foreground">
                {t("personalizationAdjustments")}
              </dt>
              <dd className="text-marketplace-foreground">
                +{formatMoney(surcharge, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-marketplace-border pt-2 font-medium">
              <dt className="text-marketplace-foreground">
                {t("estimatedUnitTotal")}
              </dt>
              <dd className="text-marketplace-foreground">
                {formatMoney((baseUnitAmount ?? 0) + surcharge, currency)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

function PersonalizationFieldControl({
  field,
  answer,
  error,
  disabled,
  onChange,
  onClear,
  uploadingChange,
  compact,
}: {
  field: ProductPersonalizationField;
  answer?: PersonalizationAnswer;
  error?: PersonalizationFieldError;
  disabled?: boolean;
  onChange: (patch: PersonalizationAnswer) => void;
  onClear: () => void;
  uploadingChange?: (uploading: boolean) => void;
  compact: boolean;
}) {
  const t = useTranslations("personalization");
  const id = useId();
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  const errorMessage = error
    ? t(`errors.${error.code}`, {
        min: field.min_length ?? 0,
        max: field.max_length ?? 0,
      })
    : null;

  const label = (
    <FieldLabel htmlFor={id}>
      {field.name}
      {field.required ? (
        <>
          {" "}
          <RequiredMark />
          <span className="sr-only">({t("required")})</span>
        </>
      ) : (
        <span className="ml-1 text-xs font-normal text-marketplace-muted-foreground">
          ({t("optional")})
        </span>
      )}
    </FieldLabel>
  );

  const instructions = field.instructions ? (
    <FieldDescription id={helpId}>{field.instructions}</FieldDescription>
  ) : null;

  if (field.field_type === "info") {
    return (
      <div className="rounded-md border border-dashed border-marketplace-border-subtle bg-marketplace-surface-warm/60 p-3 text-sm text-marketplace-muted-foreground">
        <p className="font-medium text-marketplace-foreground">{field.name}</p>
        {field.instructions ? (
          <p className="mt-1 whitespace-pre-wrap">{field.instructions}</p>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "long_text") {
    const value = String(answer?.value ?? "");
    return (
      <Field data-invalid={!!errorMessage || undefined}>
        {label}
        {instructions}
        <Textarea
          id={id}
          value={value}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
          aria-invalid={!!errorMessage}
          aria-describedby={
            [helpId, errorMessage ? errorId : null].filter(Boolean).join(" ") ||
            undefined
          }
          onChange={(e) => onChange({ value: e.target.value })}
          rows={4}
        />
        {field.max_length != null && (
          <p className="text-xs text-marketplace-muted-foreground">
            {t("charactersRemaining", {
              count: Math.max(0, field.max_length - value.length),
            })}
          </p>
        )}
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </Field>
    );
  }

  if (field.field_type === "short_text") {
    const value = String(answer?.value ?? "");
    return (
      <Field data-invalid={!!errorMessage || undefined}>
        {label}
        {instructions}
        <Input
          id={id}
          value={value}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
          maxLength={field.max_length ?? undefined}
          aria-invalid={!!errorMessage}
          aria-describedby={
            [helpId, errorMessage ? errorId : null].filter(Boolean).join(" ") ||
            undefined
          }
          onChange={(e) => onChange({ value: e.target.value })}
        />
        {field.max_length != null && (
          <p className="text-xs text-marketplace-muted-foreground">
            {t("charactersRemaining", {
              count: Math.max(0, field.max_length - value.length),
            })}
          </p>
        )}
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </Field>
    );
  }

  if (
    field.field_type === "boolean" ||
    (field.field_type === "checkbox" && !field.choices?.length)
  ) {
    const checked = answer?.value === true || answer?.value === "true";
    return (
      <Field data-invalid={!!errorMessage || undefined}>
        <div className="flex items-start gap-3">
          <Checkbox
            id={id}
            checked={checked}
            disabled={disabled}
            aria-invalid={!!errorMessage}
            onCheckedChange={(next) => {
              if (next) onChange({ value: true });
              else onClear();
            }}
          />
          <div className="space-y-1">
            <Label htmlFor={id} className="font-medium">
              {field.name}
              {field.required ? (
                <>
                  {" "}
                  <RequiredMark />
                </>
              ) : null}
            </Label>
            {instructions}
            {Number.parseFloat(field.price_adjustment || "0") > 0 ? (
              <p className="text-xs text-marketplace-muted-foreground">
                +{field.price_adjustment}
              </p>
            ) : null}
            {errorMessage ? (
              <FieldError id={errorId}>{errorMessage}</FieldError>
            ) : null}
          </div>
        </div>
      </Field>
    );
  }

  if (field.field_type === "dropdown") {
    const choices = sortPersonalizationChoices(field.choices);
    const selected = answer?.choice_ids?.[0] ?? "";
    return (
      <Field data-invalid={!!errorMessage || undefined}>
        {label}
        {instructions}
        <NativeSelect
          className="w-full [&_[data-slot=native-select]]:h-12 [&_[data-slot=native-select]]:rounded-lg [&_[data-slot=native-select]]:border-[#b6a99e] [&_[data-slot=native-select]]:bg-[#fbf9f7] [&_[data-slot=native-select]]:px-3.5 [&_[data-slot=native-select]]:text-sm"
          id={id}
          value={selected}
          disabled={disabled}
          aria-invalid={!!errorMessage}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) onClear();
            else onChange({ choice_ids: [value] });
          }}
        >
          <option value="">{t("selectOption")}</option>
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.name}
              {Number.parseFloat(choice.price_adjustment || "0") > 0
                ? ` (+${choice.price_adjustment})`
                : ""}
            </option>
          ))}
        </NativeSelect>
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </Field>
    );
  }

  if (field.field_type === "radio" || field.field_type === "swatch") {
    const choices = sortPersonalizationChoices(field.choices);
    const selected = answer?.choice_ids?.[0] ?? "";
    return (
      <Field
        data-invalid={!!errorMessage || undefined}
        role="group"
        aria-labelledby={`${id}-legend`}
      >
        <p
          id={`${id}-legend`}
          className="text-sm font-medium text-marketplace-foreground"
        >
          {field.name}
          {field.required ? (
            <>
              {" "}
              <RequiredMark />
            </>
          ) : null}
        </p>
        {instructions}
        <RadioGroup
          value={selected}
          disabled={disabled}
          onValueChange={(value) => onChange({ choice_ids: [value] })}
          className={
            field.field_type === "swatch" ? "flex flex-wrap gap-2" : "space-y-2"
          }
        >
          {choices.map((choice) => (
            <div key={choice.id} className="flex items-center gap-2">
              {field.field_type === "swatch" ? (
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
                    selected === choice.id
                      ? "border-marketplace-foreground ring-1 ring-marketplace-foreground"
                      : "border-marketplace-border",
                  )}
                >
                  <RadioGroupItem
                    value={choice.id}
                    id={`${id}-${choice.id}`}
                    className="sr-only"
                  />
                  <span
                    className="inline-block size-5 rounded-full border border-gray-300"
                    style={{
                      backgroundColor: choice.swatch_value || "#e5e7eb",
                    }}
                    aria-hidden="true"
                  />
                  <span>
                    {choice.name}
                    {Number.parseFloat(choice.price_adjustment || "0") > 0
                      ? ` (+${choice.price_adjustment})`
                      : ""}
                  </span>
                </label>
              ) : (
                <>
                  <RadioGroupItem value={choice.id} id={`${id}-${choice.id}`} />
                  <Label htmlFor={`${id}-${choice.id}`} className="font-normal">
                    {choice.name}
                    {Number.parseFloat(choice.price_adjustment || "0") > 0
                      ? ` (+${choice.price_adjustment})`
                      : ""}
                  </Label>
                </>
              )}
            </div>
          ))}
        </RadioGroup>
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </Field>
    );
  }

  if (field.field_type === "multi_select" || field.field_type === "checkbox") {
    const choices = sortPersonalizationChoices(field.choices);
    const selected = new Set(answer?.choice_ids ?? []);
    return (
      <Field
        data-invalid={!!errorMessage || undefined}
        role="group"
        aria-labelledby={`${id}-legend`}
      >
        <p
          id={`${id}-legend`}
          className="text-sm font-medium text-marketplace-foreground"
        >
          {field.name}
          {field.required ? (
            <>
              {" "}
              <RequiredMark />
            </>
          ) : null}
        </p>
        {instructions}
        <div className="space-y-2">
          {choices.map((choice) => {
            const checked = selected.has(choice.id);
            return (
              <div key={choice.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${id}-${choice.id}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(next) => {
                    const nextIds = new Set(selected);
                    if (next) nextIds.add(choice.id);
                    else nextIds.delete(choice.id);
                    const ids = [...nextIds];
                    if (ids.length === 0) onClear();
                    else onChange({ choice_ids: ids });
                  }}
                />
                <Label htmlFor={`${id}-${choice.id}`} className="font-normal">
                  {choice.name}
                  {Number.parseFloat(choice.price_adjustment || "0") > 0
                    ? ` (+${choice.price_adjustment})`
                    : ""}
                </Label>
              </div>
            );
          })}
        </div>
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </Field>
    );
  }

  if (field.field_type === "file") {
    return (
      <FileField
        field={field}
        answer={answer}
        errorMessage={errorMessage}
        disabled={disabled}
        onChange={onChange}
        onClear={onClear}
        uploadingChange={uploadingChange}
        label={label}
        instructions={instructions}
        helpId={helpId}
        errorId={errorId}
        inputId={id}
        compact={compact}
      />
    );
  }

  return null;
}

function FileField({
  field,
  answer,
  errorMessage,
  disabled,
  onChange,
  onClear,
  uploadingChange,
  label,
  instructions,
  helpId,
  errorId,
  inputId,
  compact,
}: {
  field: ProductPersonalizationField;
  answer?: PersonalizationAnswer;
  errorMessage: string | null;
  disabled?: boolean;
  onChange: (patch: PersonalizationAnswer) => void;
  onClear: () => void;
  uploadingChange?: (uploading: boolean) => void;
  label: React.ReactNode;
  instructions: React.ReactNode;
  helpId: string;
  errorId: string;
  inputId: string;
  compact: boolean;
}) {
  const t = useTranslations("personalization");
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const signInHref = `${basePath}/account?redirect=${encodeURIComponent(pathname)}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const filename = answer?.file_names?.[0];
  const hasFile = (answer?.signed_ids?.length ?? 0) > 0;

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    uploadingChange?.(busy);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isAuthenticated) {
      setUploadError(t("signInToUpload"));
      return;
    }
    setUploadError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadPersonalizationFile(formData);
      onChange({
        signed_ids: [result.signedId],
        file_names: [result.filename],
      });
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    } catch {
      setUploadError(t("errors.uploadFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Field data-invalid={!!errorMessage || undefined}>
      {label}
      {!compact ? instructions : null}
      {!isAuthenticated ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
          {t("signInToUpload")}{" "}
          <Link
            href={signInHref}
            className="font-medium underline underline-offset-2"
          >
            {t("signIn")}
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={cn(
              compact
                ? "flex min-h-16 w-full cursor-pointer items-center gap-4 rounded-md border border-dashed border-marketplace-border bg-transparent px-4 py-3 text-sm font-medium text-marketplace-foreground transition-colors hover:bg-marketplace-surface-warm"
                : "inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50",
              (disabled || uploading) && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : compact ? (
              <Plus className="size-6" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
            <span className="flex flex-col items-start">
              <span>
                {uploading
                  ? t("uploading")
                  : hasFile
                    ? t("replaceFile")
                    : t("uploadFile")}
              </span>
              {compact && !hasFile ? (
                <span className="mt-0.5 text-xs font-normal text-marketplace-muted-foreground">
                  {t("uploadFileHelp")}
                </span>
              ) : null}
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              className="sr-only"
              disabled={disabled || uploading}
              aria-invalid={!!errorMessage}
              aria-describedby={
                [helpId, errorMessage ? errorId : null]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </label>
          {hasFile && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              disabled={disabled || uploading}
              onClick={() => {
                onClear();
                setPreviewUrl(null);
              }}
            >
              <X className="size-4" aria-hidden="true" />
              {t("removeFile")}
            </button>
          )}
        </div>
      )}
      {filename ? (
        <p className="text-sm text-marketplace-muted-foreground">
          {t("uploadedFile", { name: filename })}
        </p>
      ) : null}
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={filename ?? field.name}
          className="mt-2 h-24 w-24 rounded-md object-cover border border-gray-200"
        />
      ) : null}
      {uploadError ? <FieldError>{uploadError}</FieldError> : null}
      {errorMessage ? (
        <FieldError id={errorId}>{errorMessage}</FieldError>
      ) : null}
    </Field>
  );
}
