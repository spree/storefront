import type { Metadata } from "next";

// The page's address carries the confirmation token, so it is never passed on
// as a referrer.
export const metadata: Metadata = { referrer: "no-referrer" };

export default function ConfirmDataRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
