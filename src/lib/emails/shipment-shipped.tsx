import {
  Body,
  Button,
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
import { FALLBACK_STORE_NAME, getStoreUrl } from "@/lib/store";

interface ShippedItem {
  name: string;
  slug?: string;
  quantity: number;
  options_text?: string;
  thumbnail_url?: string | null;
}

interface Shipment {
  number: string;
  tracking: string | null;
  tracking_url: string | null;
  delivery_method_name: string;
  display_cost: string;
  items: ShippedItem[];
}

interface ShipmentShippedEmailProps {
  orderNumber: string;
  customerName: string;
  storeName?: string;
  storeUrl?: string;
  shipments: Shipment[];
}

export function ShipmentShippedEmail({
  orderNumber,
  customerName,
  storeName = FALLBACK_STORE_NAME,
  storeUrl = getStoreUrl(),
  shipments,
}: ShipmentShippedEmailProps) {
  const firstName = customerName.split(" ")[0] || "there";

  return (
    <Html>
      <Head />
      <Preview>
        Your order {orderNumber} has shipped - {storeName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Your order is on its way!</Heading>
          <Text style={paragraph}>
            Hi {firstName}, great news! Your order{" "}
            <strong>{orderNumber}</strong> has been shipped.
          </Text>

          {shipments.map((shipment) => (
            <Section key={shipment.number}>
              <Hr style={hr} />

              <Heading as="h2" style={subheading}>
                Shipment {shipment.number}
              </Heading>

              <Text style={paragraph}>
                Shipped via {shipment.delivery_method_name}
              </Text>

              {shipment.tracking && (
                <Section style={trackingSection}>
                  <Text style={trackingLabel}>Tracking Number</Text>
                  {shipment.tracking_url ? (
                    <Button href={shipment.tracking_url} style={trackingButton}>
                      {shipment.tracking}
                    </Button>
                  ) : (
                    <Text style={trackingNumber}>{shipment.tracking}</Text>
                  )}
                </Section>
              )}

              {/* Shipped Items */}
              <Section>
                {shipment.items.map((item, index) => (
                  <Row
                    key={`${item.name}-${item.options_text ?? index}`}
                    style={itemRow}
                  >
                    <Column style={itemImageCol}>
                      {item.thumbnail_url ? (
                        <Img
                          src={item.thumbnail_url}
                          alt={item.name}
                          width={48}
                          height={48}
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
                  </Row>
                ))}
              </Section>
            </Section>
          ))}

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
  marginBottom: "8px",
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

const trackingSection: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};

const trackingLabel: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 8px 0",
};

const trackingButton: React.CSSProperties = {
  backgroundColor: "#111827",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "500",
  padding: "10px 20px",
  textDecoration: "none",
  display: "inline-block",
};

const trackingNumber: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#111827",
  margin: "0",
};

const itemRow: React.CSSProperties = {
  marginBottom: "12px",
};

const itemImageCol: React.CSSProperties = {
  width: "48px",
  verticalAlign: "top",
};

const itemImage: React.CSSProperties = {
  borderRadius: "8px",
  objectFit: "cover" as const,
};

const imagePlaceholder: React.CSSProperties = {
  width: "48px",
  height: "48px",
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

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
};

const footerLink: React.CSSProperties = {
  color: "#9ca3af",
  textDecoration: "underline",
};
