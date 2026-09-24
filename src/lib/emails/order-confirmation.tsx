import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";
import { getStoreName, getStoreUrl } from "@/lib/store";

interface LineItem {
  name: string;
  slug?: string;
  quantity: number;
  options_text?: string;
  display_price: string;
  display_total: string;
  thumbnail_url?: string | null;
}

interface Address {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state_text?: string | null;
  postal_code?: string | null;
  country_name?: string | null;
  phone?: string | null;
}

interface Fee {
  id: string;
  label: string;
  display_amount: string;
}

interface OrderConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  storeName?: string;
  storeUrl?: string;
  items: LineItem[];
  displayItemTotal: string;
  displayDeliveryTotal: string;
  fees?: Fee[];
  displayDiscountTotal?: string;
  displayTaxTotal: string;
  displayTotal: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  deliveryMethodName?: string;
}

export function OrderConfirmationEmail({
  orderNumber,
  customerName,
  storeName = getStoreName(),
  storeUrl = getStoreUrl(),
  items,
  displayItemTotal,
  displayDeliveryTotal,
  fees = [],
  displayDiscountTotal,
  displayTaxTotal,
  displayTotal,
  shippingAddress,
  billingAddress,
  deliveryMethodName,
}: OrderConfirmationEmailProps) {
  const firstName = customerName.split(" ")[0] || "there";

  return (
    <Html>
      <Head />
      <Preview>
        Order {orderNumber} confirmed - {storeName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Thanks for your order, {firstName}!</Heading>
          <Text style={paragraph}>
            Your order <strong>{orderNumber}</strong> has been confirmed. We'll
            send you another email when it ships.
          </Text>

          <Hr style={hr} />

          {/* Order Items */}
          <Heading as="h2" style={subheading}>
            Order Summary
          </Heading>
          <Section>
            {items.map((item, index) => (
              <Row
                key={`${item.name}-${item.options_text ?? index}`}
                style={itemRow}
              >
                <Column style={itemImageCol}>
                  {item.thumbnail_url ? (
                    <Img
                      src={item.thumbnail_url}
                      alt={item.name}
                      width={64}
                      height={64}
                      style={itemImage}
                    />
                  ) : (
                    <div style={imagePlaceholder} />
                  )}
                </Column>
                <Column style={itemDetailsCol}>
                  {storeUrl ? (
                    <Link
                      href={
                        item.slug
                          ? `${storeUrl}/products/${item.slug}`
                          : storeUrl
                      }
                      style={itemName}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <Text style={itemName}>{item.name}</Text>
                  )}
                  {item.options_text && (
                    <Text style={itemOptions}>{item.options_text}</Text>
                  )}
                  <Text style={itemOptions}>Qty: {item.quantity}</Text>
                </Column>
                <Column style={itemPriceCol}>
                  <Text style={itemPrice}>{item.display_total}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={hr} />

          {/* Totals */}
          <Section style={totalsSection}>
            <Row>
              <Column style={totalsLabel}>Subtotal</Column>
              <Column style={totalsValue}>{displayItemTotal}</Column>
            </Row>
            <Row>
              <Column style={totalsLabel}>Shipping</Column>
              <Column style={totalsValue}>{displayDeliveryTotal}</Column>
            </Row>
            {fees.map((fee) => (
              <Row key={fee.id}>
                <Column style={totalsLabel}>{fee.label}</Column>
                <Column style={totalsValue}>{fee.display_amount}</Column>
              </Row>
            ))}
            {displayDiscountTotal &&
              Number.parseFloat(
                displayDiscountTotal.replace(/[^0-9.-]/g, ""),
              ) !== 0 && (
                <Row>
                  <Column style={totalsLabel}>Discount</Column>
                  <Column style={{ ...totalsValue, color: "#16a34a" }}>
                    {displayDiscountTotal}
                  </Column>
                </Row>
              )}
            {Number.parseFloat(displayTaxTotal.replace(/[^0-9.-]/g, "")) >
              0 && (
              <Row>
                <Column style={totalsLabel}>Tax</Column>
                <Column style={totalsValue}>{displayTaxTotal}</Column>
              </Row>
            )}
            <Row style={totalRow}>
              <Column style={totalLabel}>Total</Column>
              <Column style={totalValue}>{displayTotal}</Column>
            </Row>
          </Section>

          <Hr style={hr} />

          {/* Addresses */}
          <Section>
            <Row>
              {shippingAddress && (
                <Column style={addressCol}>
                  <Text style={addressHeading}>Shipping Address</Text>
                  <AddressBlock address={shippingAddress} />
                </Column>
              )}
              {billingAddress && (
                <Column style={addressCol}>
                  <Text style={addressHeading}>Billing Address</Text>
                  <AddressBlock address={billingAddress} />
                </Column>
              )}
            </Row>
          </Section>

          {deliveryMethodName && (
            <Section>
              <Text style={addressHeading}>Delivery Method</Text>
              <Text style={addressText}>{deliveryMethodName}</Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            {storeName}
            {storeUrl && (
              <>
                {" - "}
                <Link href={storeUrl} style={footerLink}>
                  {storeUrl.replace(/^https?:\/\//, "")}
                </Link>
              </>
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function AddressBlock({ address }: { address: Address }) {
  const name =
    address.full_name ||
    [address.first_name, address.last_name].filter(Boolean).join(" ");
  const cityLine = [
    address.city,
    [address.state_text, address.postal_code].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      {name && <Text style={addressText}>{name}</Text>}
      {address.address1 && <Text style={addressText}>{address.address1}</Text>}
      {address.address2 && <Text style={addressText}>{address.address2}</Text>}
      {cityLine && <Text style={addressText}>{cityLine}</Text>}
      {address.country_name && (
        <Text style={addressText}>{address.country_name}</Text>
      )}
    </>
  );
}

// Styles
const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
};

const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#111827",
  marginBottom: "8px",
};

const subheading: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#111827",
  marginBottom: "16px",
};

const paragraph: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#6b7280",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const itemRow: React.CSSProperties = {
  marginBottom: "16px",
};

const itemImageCol: React.CSSProperties = {
  width: "64px",
  verticalAlign: "top",
};

const itemImage: React.CSSProperties = {
  borderRadius: "8px",
  objectFit: "cover" as const,
};

const imagePlaceholder: React.CSSProperties = {
  width: "64px",
  height: "64px",
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
};

const itemDetailsCol: React.CSSProperties = {
  paddingLeft: "12px",
  verticalAlign: "top",
};

const itemName: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#111827",
  textDecoration: "none",
};

const itemOptions: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "2px 0",
};

const itemPriceCol: React.CSSProperties = {
  textAlign: "right" as const,
  verticalAlign: "top",
  width: "100px",
};

const itemPrice: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#111827",
};

const totalsSection: React.CSSProperties = {
  width: "100%",
};

const totalsLabel: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  paddingBottom: "8px",
};

const totalsValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#111827",
  textAlign: "right" as const,
  paddingBottom: "8px",
};

const totalRow: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  paddingTop: "8px",
};

const totalLabel: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#111827",
  paddingTop: "8px",
};

const totalValue: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#111827",
  textAlign: "right" as const,
  paddingTop: "8px",
};

const addressCol: React.CSSProperties = {
  verticalAlign: "top",
  width: "50%",
};

const addressHeading: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#111827",
  marginBottom: "4px",
};

const addressText: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0",
  lineHeight: "20px",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
};

const footerLink: React.CSSProperties = {
  color: "#9ca3af",
  textDecoration: "underline",
};
