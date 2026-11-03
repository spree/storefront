import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import {
  EMPTY_RECIPIENT_DRAFT,
  GiftCardRecipientFields,
  isRecipientDraftComplete,
  recipientFromDraft,
} from "../GiftCardRecipientFields";

describe("recipientFromDraft", () => {
  it("sends no recipient when the shopper keeps the card", () => {
    expect(recipientFromDraft(EMPTY_RECIPIENT_DRAFT)).toBeUndefined();
  });

  it("trims what was typed and drops empty fields", () => {
    expect(
      recipientFromDraft({
        ...EMPTY_RECIPIENT_DRAFT,
        sendToSomeoneElse: true,
        email: " friend@example.com ",
        name: "  ",
        message: "Happy birthday!",
      }),
    ).toEqual({
      email: "friend@example.com",
      name: undefined,
      message: "Happy birthday!",
      send_at: undefined,
    });
  });

  it("sends a chosen day as the start of that day where the shopper is", () => {
    const recipient = recipientFromDraft({
      ...EMPTY_RECIPIENT_DRAFT,
      sendToSomeoneElse: true,
      email: "friend@example.com",
      sendOn: "2026-12-24",
    });

    expect(recipient?.send_at).toBe(
      new Date("2026-12-24T00:00:00").toISOString(),
    );
  });
});

describe("isRecipientDraftComplete", () => {
  it("needs an email only when the card goes to someone else", () => {
    expect(isRecipientDraftComplete(EMPTY_RECIPIENT_DRAFT)).toBe(true);
    expect(
      isRecipientDraftComplete({
        ...EMPTY_RECIPIENT_DRAFT,
        sendToSomeoneElse: true,
      }),
    ).toBe(false);
  });
});

describe("GiftCardRecipientFields", () => {
  it("asks for the recipient only once the shopper chooses to send it", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <GiftCardRecipientFields
        draft={EMPTY_RECIPIENT_DRAFT}
        onChange={onChange}
      />,
    );

    expect(screen.queryByLabelText("recipientEmail")).toBeNull();
    fireEvent.click(screen.getByLabelText("sendToSomeoneElse"));
    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_RECIPIENT_DRAFT,
      sendToSomeoneElse: true,
    });

    rerender(
      <GiftCardRecipientFields
        draft={{ ...EMPTY_RECIPIENT_DRAFT, sendToSomeoneElse: true }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("recipientEmail")).toBeTruthy();
  });
});
