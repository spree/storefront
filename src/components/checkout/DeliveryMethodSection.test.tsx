import type { Cart, Fulfillment } from "@spree/sdk";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeliveryMethodSection } from "./DeliveryMethodSection";

vi.mock("next-intl", () => ({
  useLocale: () => "en-US",
  useTranslations:
    () => (key: string, values?: Record<string, string | number>) =>
      values ? `${key} ${values.date}` : key,
}));

function renderDeliveryMethod(
  estimatedDeliveryDate: string | null,
  estimatedDeliveryDateMax: string | null = estimatedDeliveryDate,
) {
  const fulfillment = {
    id: "fulfillment_1",
    items: [],
    delivery_rates: [
      {
        id: "rate_1",
        name: "Standard shipping",
        selected: true,
        display_cost: "$8.00",
        estimated_delivery_date: estimatedDeliveryDate,
        estimated_delivery_date_min: estimatedDeliveryDate,
        estimated_delivery_date_max: estimatedDeliveryDateMax,
      },
    ],
  } as unknown as Fulfillment;

  return render(
    <DeliveryMethodSection
      fulfillments={[fulfillment]}
      items={[] as NonNullable<Cart["items"]>}
      onDeliveryRateSelect={vi.fn(async () => {})}
      processing={false}
    />,
  );
}

describe("DeliveryMethodSection estimated delivery", () => {
  it("shows the carrier estimate with the seller's shipping option", () => {
    renderDeliveryMethod("2026-11-19");

    expect(screen.getByText("estimatedDelivery Nov 19")).toBeInTheDocument();
  });

  it("does not invent a delivery date when the shipping rate has no estimate", () => {
    renderDeliveryMethod(null);

    expect(screen.queryByText(/estimatedDelivery/)).not.toBeInTheDocument();
  });

  it("shows the full seller delivery window when the rate has a range", () => {
    renderDeliveryMethod("2026-11-19", "2026-11-24");

    expect(
      screen.getByText("estimatedDelivery Nov 19–Nov 24"),
    ).toBeInTheDocument();
  });
});
