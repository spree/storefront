import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import { getStoreName, getStoreUrl } from "@/lib/store";

interface OrderLookupEmailProps {
  orderNumber: string;
  orderUrl: string;
  storeName?: string;
  storeUrl?: string;
}

/** The link a guest asked for from "Find your order". */
export function OrderLookupEmail({
  orderNumber,
  orderUrl,
  storeName = getStoreName(),
  storeUrl = getStoreUrl(),
}: OrderLookupEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your order {orderNumber} - {storeName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Your order {orderNumber}</Heading>
          <Text style={paragraph}>
            You asked for a link to your order. Use it to follow your order and
            to return or exchange items.
          </Text>

          <Section style={buttonSection}>
            <Button href={orderUrl} style={button}>
              View your order
            </Button>
          </Section>

          <Text style={paragraph}>
            If the button doesn't work, copy and paste this link into your
            browser:
          </Text>
          <Text style={linkText}>{orderUrl}</Text>

          <Hr style={hr} />

          <Text style={disclaimer}>
            If you didn't ask for this link, you can ignore this email. Nobody
            can see your order without it.
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

const paragraph: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#6b7280",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#111827",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "500",
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
};

const linkText: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  wordBreak: "break-all" as const,
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const disclaimer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
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
