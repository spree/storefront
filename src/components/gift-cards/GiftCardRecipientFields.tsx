"use client";

import type { GiftCardRecipientParams } from "@spree/sdk";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface GiftCardRecipientDraft {
  sendToSomeoneElse: boolean;
  email: string;
  name: string;
  message: string;
  /** A calendar date (yyyy-mm-dd) in the shopper's own time zone. */
  sendOn: string;
}

export const EMPTY_RECIPIENT_DRAFT: GiftCardRecipientDraft = {
  sendToSomeoneElse: false,
  email: "",
  name: "",
  message: "",
  sendOn: "",
};

// Matches the API: at most 90 days ahead, a 500-character message.
const MAX_SEND_AHEAD_DAYS = 90;
const MAX_MESSAGE_LENGTH = 500;

/**
 * The recipient the cart item is added with, or undefined when the shopper
 * keeps the card — the API then emails it to the order's own address. A send
 * date is the start of that day in the shopper's time zone.
 */
export function recipientFromDraft(
  draft: GiftCardRecipientDraft,
): GiftCardRecipientParams | undefined {
  if (!draft.sendToSomeoneElse) return undefined;

  return {
    email: draft.email.trim(),
    name: draft.name.trim() || undefined,
    message: draft.message.trim() || undefined,
    send_at: draft.sendOn
      ? new Date(`${draft.sendOn}T00:00:00`).toISOString()
      : undefined,
  };
}

/** Whether the draft can be added to the cart as it stands. */
export function isRecipientDraftComplete(draft: GiftCardRecipientDraft) {
  return !draft.sendToSomeoneElse || draft.email.trim().includes("@");
}

function dateInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

interface GiftCardRecipientFieldsProps {
  draft: GiftCardRecipientDraft;
  onChange: (draft: GiftCardRecipientDraft) => void;
}

export function GiftCardRecipientFields({
  draft,
  onChange,
}: GiftCardRecipientFieldsProps) {
  const t = useTranslations("products.giftCard");
  const update = (changes: Partial<GiftCardRecipientDraft>) =>
    onChange({ ...draft, ...changes });

  const today = new Date();
  const latest = new Date(today.getTime() + MAX_SEND_AHEAD_DAYS * 86_400_000);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <Checkbox
          id="gift-card-send-to-someone-else"
          checked={draft.sendToSomeoneElse}
          onCheckedChange={(checked) =>
            update({ sendToSomeoneElse: checked === true })
          }
        />
        <Label htmlFor="gift-card-send-to-someone-else">
          {t("sendToSomeoneElse")}
        </Label>
      </div>

      {draft.sendToSomeoneElse ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gift-card-recipient-email">
              {t("recipientEmail")}
            </Label>
            <Input
              id="gift-card-recipient-email"
              type="email"
              required
              autoComplete="off"
              value={draft.email}
              onChange={(event) => update({ email: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gift-card-recipient-name">
              {t("recipientName")}
            </Label>
            <Input
              id="gift-card-recipient-name"
              autoComplete="off"
              value={draft.name}
              onChange={(event) => update({ name: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gift-card-message">{t("message")}</Label>
            <Textarea
              id="gift-card-message"
              maxLength={MAX_MESSAGE_LENGTH}
              value={draft.message}
              onChange={(event) => update({ message: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gift-card-send-on">{t("sendOn")}</Label>
            <Input
              id="gift-card-send-on"
              type="date"
              min={dateInputValue(today)}
              max={dateInputValue(latest)}
              value={draft.sendOn}
              onChange={(event) => update({ sendOn: event.target.value })}
            />
            <p className="text-xs text-gray-500">{t("sendOnHelp")}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t("sentToYou")}</p>
      )}
    </div>
  );
}
