import type { Metadata } from "next";

// A guest's order address carries the order token, so it is never passed on
// as a referrer, and the page is kept out of search results.
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function GuestOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
