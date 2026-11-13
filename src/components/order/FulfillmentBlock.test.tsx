import type { Address, Fulfillment } from "@spree/sdk";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { FulfillmentBlock } from "./FulfillmentBlock";

const messages = {
  orders: {
    shipment: "Shipment",
    shippedFrom: "Shipped from {location}",
    delivered: "Delivered",
    canceled: "Canceled",
    noTrackingInfo: "No tracking information present.",
    trackItems: "Track Items",
  },
};

describe("FulfillmentBlock", () => {
  it("does not label a delivered shipment canceled or show a disabled tracking action", () => {
    const fulfillment = {
      id: "ful_1",
      status: "delivered",
      delivery_method: null,
      stock_location: null,
      tracking: null,
      tracking_url: null,
      items: [],
    } as unknown as Fulfillment;

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <FulfillmentBlock
          fulfillment={fulfillment}
          shipAddress={null as Address | null}
          basePath="/us/en"
          lineItems={[]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Shipment")).toBeInTheDocument();
    expect(screen.getByText("delivered")).toBeInTheDocument();
    expect(screen.queryByText("Canceled")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Track Items" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("No tracking information present."),
    ).toBeInTheDocument();
  });
});
