import type { WebhookEvent } from "@spree/sdk/webhooks";
import type { ReactElement } from "react";
import { render } from "react-email";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/emails/send", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendEmail } from "@/lib/emails/send";
import {
  handleOrderCanceled,
  handleOrderFulfilled,
  handleOrderGroupCompleted,
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

  describe("handleOrderGroupCompleted", () => {
    let groupSeq = 0;

    function orderGroup(overrides: Record<string, unknown> = {}) {
      groupSeq += 1;
      return {
        id: `ogrp_${groupSeq}`,
        number: "R1001",
        email: "customer@example.com",
        currency: "USD",
        display_item_total: "$360.00",
        display_total: "$374.97",
        shipping_address: { full_name: "Jane Doe", address1: "1 Main St" },
        billing_address: null,
        orders: [
          {
            ...order,
            id: "or_1",
            number: "R1001-1",
            display_total: "$50.67",
            items: [
              {
                id: "li_1",
                name: "Spree Tote Bag",
                quantity: 1,
                display_price: "$45.00",
                display_total: "$45.00",
              },
            ],
            fulfillments: [{ id: "ful_1", delivery_method: { name: "UPS" } }],
          },
          {
            ...order,
            id: "or_2",
            number: "R1001-2",
            display_total: "$324.30",
            items: [
              {
                id: "li_2",
                name: "Seller Jacket",
                quantity: 2,
                display_price: "$150.00",
                display_total: "$300.00",
              },
            ],
          },
        ],
        ...overrides,
      };
    }

    it("sends one confirmation listing every order of the group", async () => {
      await handleOrderGroupCompleted(
        event("order_group.completed", orderGroup()),
      );

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      const [{ to, subject, react }] = mockSendEmail.mock.calls[0];
      expect(to).toBe("customer@example.com");
      expect(subject).toContain("Order Confirmation #R1001");

      const html = await render(react as ReactElement);
      expect(html).toContain("placed as <!-- -->2<!-- --> orders");
      expect(html).toContain("R1001-1");
      expect(html).toContain("R1001-2");
      expect(html).toContain("Spree Tote Bag");
      expect(html).toContain("Seller Jacket");
      expect(html).toContain("$50.67");
      expect(html).toContain("$324.30");
      expect(html).toContain("$374.97");
      expect(html).toContain("Delivery: <!-- -->UPS");
    });

    it("skips the email when notify_customer is false", async () => {
      await handleOrderGroupCompleted(
        event("order_group.completed", orderGroup({ notify_customer: false })),
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("skips the email when the group has no email", async () => {
      await handleOrderGroupCompleted(
        event("order_group.completed", orderGroup({ email: null })),
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("sends once when a replayed completion re-publishes the event", async () => {
      const group = orderGroup();
      await handleOrderGroupCompleted(event("order_group.completed", group));
      await handleOrderGroupCompleted(event("order_group.completed", group));

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
    });

    it("sends again after a failed send is retried", async () => {
      const group = orderGroup();
      const retried = event("order_group.completed", group);
      mockSendEmail.mockRejectedValueOnce(new Error("provider down"));

      await expect(handleOrderGroupCompleted(retried)).rejects.toThrow();
      await handleOrderGroupCompleted(retried);

      expect(mockSendEmail).toHaveBeenCalledTimes(2);
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
