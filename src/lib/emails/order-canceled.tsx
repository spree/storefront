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
import { FALLBACK_STORE_NAME, getStoreUrl } from "@/lib/store";

interface LineItem {
  name: string;
  slug?: string;
  quantity: number;
  options_text?: string;
  display_total: string;
  thumbnail_url?: string | null;
}

interface OrderCanceledEmailProps {
  orderNumber: string;
  customerName: string;
  storeName?: string;
  storeUrl?: string;
  items: LineItem[];
  displayTotal: string;
}

export function OrderCanceledEmail({
  orderNumber,
  customerName,
  storeName = FALLBACK_STORE_NAME,
  storeUrl = getStoreUrl(),
  items,
  displayTotal,
}: OrderCanceledEmailProps) {
  const firstName = customerName.split(" ")[0] || "there";

  return (
    <Html>
      <Head />
      <Preview>
        Order {orderNumber} has been canceled - {storeName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Order Canceled</Heading>
          <Text style={paragraph}>
            Hi {firstName}, your order <strong>{orderNumber}</strong> has been
            canceled. If you paid for this order, a refund will be issued to
            your original payment method.
          </Text>

          <Hr style={hr} />

          <Heading as="h2" style={subheading}>
            Canceled Items
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
                      width={48}
                      height={48}
                      style={itemImage}
                    />
                  ) : (
                    <div style={imagePlaceholder} />
                  )}
                </Column>
                <Column style={itemDetailsCol}>
                  <Text style={itemName}>{item.name}</Text>
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

          <Row>
            <Column style={totalLabel}>Order Total</Column>
            <Column style={totalValue}>{displayTotal}</Column>
          </Row>

          <Hr style={hr} />

          <Text style={paragraph}>
            If you have any questions, please don't hesitate to contact us.
          </Text>

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
  margin: "0",
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
  color: "#6b7280",
  margin: "0",
};

const totalLabel: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#111827",
};

const totalValue: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#111827",
  textAlign: "right" as const,
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
