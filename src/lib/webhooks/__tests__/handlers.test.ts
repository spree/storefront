import type { WebhookEvent } from "@spree/sdk/webhooks";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/emails/send", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendEmail } from "@/lib/emails/send";
import {
  handleOrderCanceled,
  handleOrderFulfilled,
  handleOrderPlaced,
} from "@/lib/webhooks/handlers";

const mockSendEmail = vi.mocked(sendEmail);

let eventSeq = 0;

function event(name: string, data: Record<string, unknown>): WebhookEvent<any> {
  eventSeq += 1;
  return {
    id: `evt_${eventSeq}`,
    name,
    created_at: new Date().toISOString(),
    data,
    metadata: {},
  } as unknown as WebhookEvent<never>;
}

const order = {
  id: "or_1",
  number: "R100",
  email: "customer@example.com",
  items: [],
  fulfillments: [],
};

describe("webhook handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleOrderPlaced", () => {
    it("sends the order confirmation", async () => {
      await handleOrderPlaced(event("order.placed", order));

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "customer@example.com",
          subject: expect.stringContaining("Order Confirmation #R100"),
        }),
      );
    });

    it("skips the email when notify_customer is false", async () => {
      await handleOrderPlaced(
        event("order.placed", { ...order, notify_customer: false }),
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("handleOrderCanceled", () => {
    it("skips the email when notify_customer is false", async () => {
      await handleOrderCanceled(
        event("order.canceled", { ...order, notify_customer: false }),
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("handleOrderFulfilled", () => {
    it("sends the shipment email for fulfilled fulfillments", async () => {
      await handleOrderFulfilled(
        event("order.fulfilled", {
          ...order,
          fulfillments: [
            {
              id: "ful_1",
              number: "H100",
              status: "fulfilled",
              tracking: "1Z999",
              tracking_url: null,
              delivery_method: { name: "UPS" },
              display_cost: "$5.00",
              items: [],
            },
          ],
        }),
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("Shipment Notification #R100"),
        }),
      );
    });

    it("skips the email when nothing was handed over", async () => {
      await handleOrderFulfilled(
        event("order.fulfilled", {
          ...order,
          fulfillments: [{ id: "ful_1", status: "unfulfilled", items: [] }],
        }),
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
