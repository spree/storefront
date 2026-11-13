import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { StorefrontAnalyticsConsent } from "@/components/layout/StorefrontAnalyticsConsent";
import { localeDirection } from "@/i18n/locales";

const spreeApiOrigin = (() => {
  try {
    return process.env.SPREE_API_URL
      ? new URL(process.env.SPREE_API_URL).origin
      : undefined;
  } catch {
    return undefined;
  }
})();

/** Geist Sans — bundled via the `geist` package (Vercel OFL). */
const geist = localFont({
  src: "../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist",
  display: "swap",
  weight: "100 900",
});

/** Playfair Display — @fontsource-variable (SIL OFL). */
const playfair = localFont({
  src: "../../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2",
  variable: "--font-playfair",
  display: "swap",
  weight: "400 900",
});

interface DocumentShellProps {
  children: React.ReactNode;
  locale: string;
}

/** Shared document markup for each root layout. */
export function DocumentShell({ children, locale }: DocumentShellProps) {
  return (
    <html lang={locale} dir={localeDirection(locale)} suppressHydrationWarning>
      {/* biome-ignore lint/style/noHeadElement: this shell is used only by Next.js root layouts */}
      <head>
        {spreeApiOrigin && (
          <>
            <link rel="preconnect" href={spreeApiOrigin} />
            <link rel="dns-prefetch" href={spreeApiOrigin} />
          </>
        )}
      </head>
      <body
        className={`${geist.variable} ${playfair.variable} antialiased min-h-screen flex flex-col bg-white text-foreground`}
        suppressHydrationWarning
      >
        <StorefrontAnalyticsConsent />
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
