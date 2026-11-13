import "@spree/sdk";

declare module "@spree/sdk" {
  interface DeliveryRate {
    estimated_delivery_date_min: string | null;
    estimated_delivery_date_max: string | null;
  }
}
