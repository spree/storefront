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

interface DataRequestConfirmationEmailProps {
  confirmUrl: string;
  kind: "access" | "erasure";
  storeName?: string;
  storeUrl?: string;
}

const COPY = {
  access: {
    heading: "Confirm your data request",
    body: "We received a request for a copy of the personal data we hold about you. Once you confirm it, open this link again when the file is ready to download it.",
  },
  erasure: {
    heading: "Confirm your erasure request",
    body: "We received a request to permanently erase the personal data we hold about you, including the names and addresses on your past orders. This cannot be undone.",
  },
} as const;

export function DataRequestConfirmationEmail({
  confirmUrl,
  kind,
  storeName = getStoreName(),
  storeUrl = getStoreUrl(),
}: DataRequestConfirmationEmailProps) {
  const copy = COPY[kind];

  return (
    <Html>
      <Head />
      <Preview>
        {copy.heading} - {storeName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{copy.heading}</Heading>
          <Text style={paragraph}>{copy.body}</Text>

          <Section style={buttonSection}>
            <Button href={confirmUrl} style={button}>
              Review and Confirm
            </Button>
          </Section>

          <Text style={paragraph}>
            If the button doesn't work, copy and paste this link into your
            browser:
          </Text>
          <Text style={linkText}>{confirmUrl}</Text>

          <Hr style={hr} />

          <Text style={disclaimer}>
            Confirm the request within 24 hours of making it, or this link stops
            working. If you didn't make this request, you can ignore this email
            and nothing will happen.
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
