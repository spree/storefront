"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ShopContentInlineDraft } from "./shop-content-inline-draft-types";

export const LINK_PLATFORMS = [
  "Facebook",
  "Twitter",
  "Instagram",
  "Pinterest",
  "Website",
  "Blog",
  "TikTok",
  "YouTube",
  "Other",
] as const;

export const FAQ_PRESET_IDS = [
  "custom_orders",
  "sizing",
  "care",
  "gift_wrapping",
  "wholesale",
  "custom",
] as const;

export type FaqPresetId = (typeof FAQ_PRESET_IDS)[number];

export type FaqEditDraft = {
  presetId: FaqPresetId;
  customQuestion: string;
  answer: string;
};

export function fieldClassName() {
  return "w-full rounded-lg border border-[#d8d0c8] bg-[var(--marketplace-seller-field-background,#fff)] px-3 py-2.5 text-sm text-[#29252d] outline-none transition placeholder:text-[#817a73] focus:border-[#655c55] focus:ring-2 focus:ring-[#655c55]/15";
}

export function pillPrimaryClassName() {
  return "rounded-full bg-[#222] px-5 py-2 text-xs font-semibold text-white";
}

export function pillSecondaryClassName() {
  return "rounded-full border border-[#d8d0c8] bg-white px-5 py-2 text-xs font-semibold text-[#39333c] transition hover:bg-[#f7f3ee]";
}

export function textActionClassName() {
  return "text-sm font-semibold underline underline-offset-4";
}

export function faqQuestionFromDraft(
  draft: FaqEditDraft,
  questionForPreset: (id: FaqPresetId) => string,
): string {
  if (draft.presetId === "custom") return draft.customQuestion.trim();
  return questionForPreset(draft.presetId);
}

export function faqDraftFromQuestion(
  question: string,
  answer: string,
  questionForPreset: (id: FaqPresetId) => string,
): FaqEditDraft {
  const trimmed = question.trim();
  for (const presetId of FAQ_PRESET_IDS) {
    if (presetId === "custom") continue;
    if (trimmed === questionForPreset(presetId)) {
      return { presetId, customQuestion: "", answer };
    }
  }
  return { presetId: "custom", customQuestion: trimmed, answer };
}

export function EtsySaveCancel({
  onSave,
  onCancel,
  saveDisabled,
}: {
  onSave: () => void;
  onCancel: () => void;
  saveDisabled?: boolean;
}) {
  const t = useTranslations("sellers.shopEditorInline");
  return (
    <div className="flex flex-wrap items-center gap-4 pt-2">
      <button
        type="button"
        className={pillPrimaryClassName()}
        disabled={saveDisabled}
        onClick={onSave}
      >
        {t("save")}
      </button>
      <button
        type="button"
        className={pillSecondaryClassName()}
        onClick={onCancel}
      >
        {t("cancel")}
      </button>
    </div>
  );
}

export function EtsyTextSaveCancel({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("sellers.shopEditorInline");
  return (
    <div className="flex shrink-0 items-center gap-4 self-end">
      <button
        type="button"
        className={textActionClassName()}
        onClick={onCancel}
      >
        {t("cancel")}
      </button>
      <button type="button" className={textActionClassName()} onClick={onSave}>
        {t("save")}
      </button>
    </div>
  );
}

export function memberInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function AddRowButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="mt-2 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-dashed border-current/25 px-3 py-2 text-sm font-semibold transition-colors hover:border-current/45 hover:bg-black/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
      onClick={onClick}
    >
      <Plus className="size-4" />
      {label}
    </button>
  );
}

export const DETAIL_FIELDS = [
  ["business_name", "sellerDetailBusinessName"],
  ["seller_type", "sellerDetailSellerType"],
  ["address", "sellerDetailAddress"],
  ["registration_number", "sellerDetailRegistration"],
] as const;

export type UpdateDraft = (
  updater: (current: ShopContentInlineDraft) => ShopContentInlineDraft,
) => void;
