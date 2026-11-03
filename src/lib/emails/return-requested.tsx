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

interface RequestedLine {
  name: string;
  options_text?: string | null;
  quantity: number;
  /** For an exchange: what comes out instead. */
  replacement?: string | null;
}

interface ReturnRequestedEmailProps {
  kind: "return" | "exchange";
  requestNumber: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  lines: RequestedLine[];
  reason?: string | null;
  note?: string | null;
  /** The account's order page. */
  orderUrl: string;
  /** "Find your order" with the number filled in, for a guest. */
  findUrl: string;
  policyUrl: string;
  storeName?: string;
  storeUrl?: string;
}

/**
 * Confirms a return or exchange request the moment it is opened. The EU
 * Consumer Rights Directive (Art. 11(3)) asks a trader to acknowledge a
 * withdrawal sent through their website, without delay, on a durable medium,
 * so this restates what the customer asked for.
 */
export function ReturnRequestedEmail({
  kind,
  requestNumber,
  orderNumber,
  orderDate,
  customerName,
  lines,
  reason,
  note,
  orderUrl,
  findUrl,
  policyUrl,
  storeName = getStoreName(),
  storeUrl = getStoreUrl(),
}: ReturnRequestedEmailProps) {
  const firstName = customerName.split(" ")[0] || "there";
  const noun = kind === "return" ? "return" : "exchange";

  return (
    <Html>
      <Head />
      <Preview>
        We have received your {noun} request {requestNumber} - {storeName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            We have received your {noun} request
          </Heading>
          <Text style={paragraph}>
            Hi {firstName}, your {noun} request <strong>{requestNumber}</strong>{" "}
            for order <strong>{orderNumber}</strong>, placed on {orderDate}, has
            reached us. This email is your confirmation.
          </Text>

          <Section>
            {lines.map((line) => (
              <Text
                key={`${line.name}-${line.options_text ?? ""}`}
                style={item}
              >
                {line.quantity} × {line.name}
                {line.options_text ? ` (${line.options_text})` : ""}
                {line.replacement ? ` → ${line.replacement}` : ""}
              </Text>
            ))}
          </Section>

          {reason && <Text style={paragraph}>Reason: {reason}</Text>}
          {note && <Text style={paragraph}>Your note: {note}</Text>}

          <Section style={buttonSection}>
            <Button href={orderUrl} style={button}>
              View your request
            </Button>
          </Section>

          <Text style={disclaimer}>
            Checked out as a guest?{" "}
            <Link href={findUrl} style={footerLink}>
              Get a link to your order
            </Link>
            .
          </Text>

          <Text style={paragraph}>
            We will review your request and email you where to send the items.
            {kind === "return"
              ? " Your refund goes back to the payment method you used, within 14 days of us receiving the items or proof that you sent them."
              : " Your replacements ship once the items arrive."}
          </Text>

          <Hr style={hr} />

          <Text style={disclaimer}>
            <Link href={policyUrl} style={footerLink}>
              Read our return policy
            </Link>
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

const item: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#111827",
  margin: "4px 0",
};

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
