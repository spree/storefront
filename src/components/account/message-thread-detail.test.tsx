import "@testing-library/jest-dom/vitest";
import type { Message, MessageThread } from "@spree/sdk";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageThreadDetail } from "./MessageThreadDetail";

const threadDefaults = {
  status: "open",
  opens_at: "2026-10-02T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
  closes_at: null,
  subject_id: "",
  seller_id: "sel_test",
  seller_slug: "shop",
  last_message_product_name: null,
  last_message_preview: null,
  last_message_sender_type: null,
  unread: false,
} as const;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/data/communication-blocks", () => ({
  blockSeller: vi.fn(),
  unblockSeller: vi.fn(),
}));

vi.mock("@/lib/data/messages", () => ({
  markMessageThreadRead: vi.fn(),
  sendMessageThreadReply: vi.fn(),
  uploadMessageImage: vi.fn(),
}));

describe("MessageThreadDetail", () => {
  it("renders HTML-like message bodies as plain text", () => {
    const thread: MessageThread = {
      ...threadDefaults,
      id: "msgth_test",
      subject_type: "general",
      writable: true,
      seller_name: "Shop",
      communication_block_id: null,
    } as const;

    const messages: Message[] = [
      {
        id: "msg_1",
        metadata: null,
        product_id: null,
        product_name: null,
        product_slug: null,
        product_thumbnail_url: null,
        message_thread_id: "msgth_test",
        sender_type: "seller",
        body: '<script>alert(1)</script>Hello <a href="https://evil.example">link</a>',
        created_at: new Date().toISOString(),
        images: [],
      },
    ];

    const { container } = render(
      <MessageThreadDetail
        thread={thread}
        messages={[...messages]}
        basePath=""
      />,
    );

    const body = screen.getByText(/<script>alert\(1\)<\/script>/);
    expect(body.tagName).toBe("P");
    expect(container.querySelector("script")).toBeNull();
    expect(body.querySelector("a")).toBeNull();
  });

  it("shows messaging unavailable when the thread is not writable", () => {
    const thread: MessageThread = {
      ...threadDefaults,
      id: "msgth_blocked",
      subject_type: "general",
      writable: false,
      seller_name: "Shop",
      communication_block_id: "mcb_1",
    } as const;

    render(<MessageThreadDetail thread={thread} messages={[]} basePath="" />);

    expect(screen.getByText("messagingUnavailable")).toBeInTheDocument();
  });
});
