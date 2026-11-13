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
import { FALLBACK_STORE_NAME, getStoreUrl } from "@/lib/store";

interface PasswordResetEmailProps {
  resetUrl: string;
  storeName?: string;
  storeUrl?: string;
}

export function PasswordResetEmail({
  resetUrl,
  storeName = FALLBACK_STORE_NAME,
  storeUrl = getStoreUrl(),
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password - {storeName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={paragraph}>
            We received a request to reset your password. Click the button below
            to choose a new one.
          </Text>

          <Section style={buttonSection}>
            <Button href={resetUrl} style={button}>
              Reset Password
            </Button>
          </Section>

          <Text style={paragraph}>
            If the button doesn't work, copy and paste this link into your
            browser:
          </Text>
          <Text style={linkText}>{resetUrl}</Text>

          <Hr style={hr} />

          <Text style={disclaimer}>
            This link will expire shortly. If you didn't request a password
            reset, you can safely ignore this email.
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
