import { createElement, type ReactElement } from "react";
import { OrderCanceledEmail } from "@/lib/emails/order-canceled";
import { OrderConfirmationEmail } from "@/lib/emails/order-confirmation";
import { PasswordResetEmail } from "@/lib/emails/password-reset";
import { ShipmentShippedEmail } from "@/lib/emails/shipment-shipped";

interface EmailFixture {
  slug: string;
  label: string;
  render: () => ReactElement;
}

export const emailFixtures: EmailFixture[] = [
  {
    slug: "order-confirmation",
    label: "Order Confirmation",
    render: () =>
      createElement(OrderConfirmationEmail, {
        orderNumber: "R987654321",
        customerName: "Jane Smith",
        items: [
          {
            name: "Classic Tote Bag",
            slug: "classic-tote-bag",
            quantity: 2,
            options_text: "Color: Black",
            display_price: "$29.99",
            display_total: "$59.98",
            thumbnail_url: null,
          },
          {
            name: "Organic Cotton T-Shirt",
            slug: "organic-cotton-t-shirt",
            quantity: 1,
            options_text: "Size: M, Color: White",
            display_price: "$24.99",
            display_total: "$24.99",
            thumbnail_url: null,
          },
          {
            name: "Leather Wallet",
            slug: "leather-wallet",
            quantity: 1,
            options_text: "",
            display_price: "$49.99",
            display_total: "$49.99",
            thumbnail_url: null,
          },
        ],
        displayItemTotal: "$134.96",
        displayDeliveryTotal: "$5.99",
        fees: [
          { id: "fee_1", label: "Gift wrapping", display_amount: "$4.00" },
        ],
        displayDiscountTotal: "-$10.00",
        displayTaxTotal: "$11.25",
        displayTotal: "$142.20",
        shippingAddress: {
          full_name: "Jane Smith",
          address1: "123 Main Street",
          address2: "Apt 4B",
          city: "New York",
          state_text: "NY",
          postal_code: "10001",
          country_name: "United States",
          phone: "+1 (555) 123-4567",
        },
        billingAddress: {
          full_name: "Jane Smith",
          address1: "123 Main Street",
          address2: "Apt 4B",
          city: "New York",
          state_text: "NY",
          postal_code: "10001",
          country_name: "United States",
        },
        deliveryMethodName: "USPS Priority Mail (2-3 days)",
      }),
  },
  {
    slug: "order-canceled",
    label: "Order Canceled",
    render: () =>
      createElement(OrderCanceledEmail, {
        orderNumber: "R987654321",
        customerName: "Jane Smith",
        items: [
          {
            name: "Classic Tote Bag",
            slug: "classic-tote-bag",
            quantity: 2,
            options_text: "Color: Black",
            display_total: "$59.98",
            thumbnail_url: null,
          },
          {
            name: "Organic Cotton T-Shirt",
            slug: "organic-cotton-t-shirt",
            quantity: 1,
            options_text: "Size: M, Color: White",
            display_total: "$24.99",
            thumbnail_url: null,
          },
        ],
        displayTotal: "$84.97",
      }),
  },
  {
    slug: "shipment-shipped",
    label: "Shipment Shipped",
    render: () =>
      createElement(ShipmentShippedEmail, {
        orderNumber: "R987654321",
        customerName: "Jane Smith",
        shipments: [
          {
            number: "H123456789",
            tracking: "1Z999AA10123456784",
            tracking_url:
              "https://tools.usps.com/go/TrackConfirmAction?tLabels=1Z999AA10123456784",
            delivery_method_name: "USPS Priority Mail",
            display_cost: "$5.99",
            items: [
              {
                name: "Classic Tote Bag",
                slug: "classic-tote-bag",
                quantity: 2,
                options_text: "Color: Black",
                thumbnail_url: null,
              },
              {
                name: "Organic Cotton T-Shirt",
                slug: "organic-cotton-t-shirt",
                quantity: 1,
                options_text: "Size: M, Color: White",
                thumbnail_url: null,
              },
            ],
          },
        ],
      }),
  },
  {
    slug: "password-reset",
    label: "Password Reset",
    render: () =>
      createElement(PasswordResetEmail, {
        resetUrl: "https://example.com/account/reset-password?token=preview",
      }),
  },
];

export function getEmailFixture(slug: string): EmailFixture | undefined {
  return emailFixtures.find((f) => f.slug === slug);
}
