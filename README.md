[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)

# Spree Storefront

A production-ready, headless ecommerce storefront for [Spree Commerce](https://spreecommerce.org), built with Next.js 16, React 19, and the [Spree REST API](https://spreecommerce.org/docs/api-reference). Open source (MIT) and free to customize.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/spree/storefront)

[Live Demo](https://demo.spreecommerce.org) | [Quickstart Docs](https://spreecommerce.org/docs/developer/storefront/nextjs/quickstart) | [TypeScript SDK](https://www.npmjs.com/package/@spree/sdk)

> **You are on `6-0-dev`.** This branch tracks the unreleased Spree 6.0 Store API and SDK, so it can break as those change. For a stable storefront to fork or deploy, use `main`. This branch merges into `main` at the 6.0 release.

## Why This Storefront

**TypeScript SDK.** [@spree/sdk](https://www.npmjs.com/package/@spree/sdk) is an official typed client for every Store API endpoint (OpenAPI 3.0 documented). Autocomplete and type safety in your editor, no codegen step to maintain.

**DTC and B2B out of the box** run both DTC and B2B (wholesale portal) from a single instance powered by [Spree Channels](https://spreecommerce.org/docs/developer/core-concepts/channels), with exclusive customer group pricing and product gating.

**Multi-region out of the box.** Country, currency, and language switching via URL segments (`/us/en/`, `/de/de/`, `/uk/en/`), powered by [Spree Markets](https://spreecommerce.org/docs/developer/core-concepts/markets). Distinct selling regions bundling geography, currency, and locale in a single store.

**One-page checkout.** Guest and authenticated users, multi-shipment, coupon codes, gift cards, and store credit. Stripe, PayPal, and Adyen via Payment Sessions. Card data never touches your server. [Swap providers](https://spreecommerce.org/docs/developer/core-concepts/payments) easily.

**Transactional emails.** Order confirmation, shipping notification, password reset. Built with react-email, sent via Resend, triggered by Spree webhooks.

**MIT licensed.** Open source and free to use.

## Performance

The live demo at [demo.spreecommerce.org](https://demo.spreecommerce.org) scores 98/100 on desktop and 88/100 on mobile for Performance on Google's Lighthouse audit, with five language versions served from the same deployment.

| Lighthouse metric | Mobile | Desktop |
|-------------------|--------|---------|
| Performance | 88 | 98 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

No external performance plugins. No edge-side rendering hacks. The architecture is Next.js 16 App Router with React 19 Server Components, server-side data fetching via `@spree/sdk`, and Tailwind CSS 4.

[Run the audit yourself on PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fdemo.spreecommerce.org)

## Features

| Feature | Details |
|---------|---------|
| **Product Catalog** | Browse, search, filter products by categories, and use faceted navigation. Optional [Meilisearch integration](https://spreecommerce.org/docs/integrations/search/meilisearch) available |
| **Product Details** | View product information with variant selection and media |
| **Shopping Cart** | Add, update, and remove items with server-side state |
| **One-page Checkout** | Guest visitors and signed-in users supported, multi-shipments supported natively, Coupon Codes, Gift Cards, Store Credit |
| **Stripe/Adyen/PayPal payments** | native Stripe/Adyen/Paypal payment support with their SDKs, PCI-Compliant, 3DS-Secure, use Credit Cards, Apple Pay, Google Pay, Klarna, Affirm, SEPA payments |
| **Customer Account** | Full account management: Profile management, Order history with detailed order view, Address book (create, edit, delete), Gift Cards and Store Credit, Saved payment methods |
| **Wholesale portal** | Storefront gating, per-customer pricing and product availability, account approval workflows |
| **Multi-Region Support** | Country, currency, and language switching via URL segments, powered by [Spree Markets](https://spreecommerce.org/docs/developer/core-concepts/markets) |
| **Responsive Design** | Mobile-first Tailwind CSS styling |
| **Google Tag Manager** and **Google Analytics 4 Ecommerce events** | tracking supported natively |
| **Store Policies** | Policy pages fetched from Spree API, with consent checkboxes on registration and guest checkout |
| **SEO-ready** | meta tags, JSON-LD, OpenGraph — all built in |
| **Error Tracking** | Sentry integration for both server-side and client-side error monitoring with source maps |

## Technology

| Technology | Role |
|------------|------|
| **Next.js 16** | App Router, Server Actions, Turbopack |
| **React 19** | Latest React with improved Server Components |
| **Tailwind CSS 4** | Utility-first styling |
| **TypeScript** | Full type safety |
| **Sentry** | Error tracking and performance monitoring with source maps |
| [@spree/sdk](https://spreecommerce.org/docs/developer/sdk/quickstart) | Official Spree Commerce SDK |

## Architecture

This starter follows a **server-first pattern**:

1. **Server-First Architecture** - All API calls happen server-side using Next.js Server Actions
2. **httpOnly Cookies** - Auth tokens and cart tokens are stored securely
3. **No Client-Side API Calls** - The Spree API key is never exposed to the browser
4. **Cache Revalidation** - Uses Next.js cache tags for efficient updates

```
Browser → Server Action → @spree/sdk → Spree API
         (with httpOnly cookies via src/lib/spree helpers)
```

Project structure, the `src/lib/data/` server actions, and the JWT-in-httpOnly-cookie auth flow are covered in the [Architecture guide](https://spreecommerce.org/docs/developer/storefront/nextjs/architecture).

## Getting Started

### Prerequisites

- Node.js 20+ (required for Next.js 16)
- A running Spree Commerce 5.4+

### Installation

**Recommended — scaffold a full project.** [`create-spree-app`](https://spreecommerce.org/docs/developer/create-spree-app/quickstart) sets up a Spree backend, this storefront, and the `spree` CLI together, with the storefront's environment wired to the backend automatically:

```bash
npx create-spree-app my-store
```

The storefront lands in `apps/storefront/`.

**Standalone.** To run the storefront on its own against an existing Spree backend, or to work on this repo directly

1. Install dependencies:

    ```bash
    pnpm install
    ```

2. Copy the environment file and configure:

    ```bash
    cp .env.local.example .env.local
    ```

3. Update `.env.local` with your Spree API credentials:

    ```env
    SPREE_API_URL=http://localhost:3000
    SPREE_PUBLISHABLE_KEY=your_publishable_api_key_here
    ```

> Note: These are server-side only variables (no `NEXT_PUBLIC_` prefix needed).

These two are all you need to boot. Optional variables cover analytics, error tracking, the wholesale portal, transactional emails, and SEO — see the [Environment Variables reference](https://spreecommerce.org/docs/developer/storefront/nextjs/environment-variables), or copy `.env.example`, which lists them all with inline comments.

### Development

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

#### Working against a local SDK

To develop against unreleased Store API features, point the storefront at a `@spree/sdk` build from a [Spree monorepo](https://github.com/spree/spree) checkout instead of the published package:

```bash
SPREE_SDK_PATH=/path/to/spree/packages/sdk pnpm install --no-frozen-lockfile
```

`.pnpmfile.cjs` redirects the dependency at the local path only when `SPREE_SDK_PATH` is set, so the default install is unaffected and nothing local ever reaches `package.json`. Two things follow from it copying the package rather than symlinking it (this project pins module resolution to its own directory, so a symlink outside it would not resolve): build the SDK first (`pnpm build` in the monorepo), and re-run the install above after each rebuild to pick the new build up. The install also rewrites `pnpm-lock.yaml` with the local path — do not commit that change.

From a Spree monorepo worktree, `pnpm wt:storefront` does all of this for you, including the API URL and publishable key.

#### HTTPS Development (Apple Pay / Google Pay)

Testing Apple Pay / Google Pay locally needs a public HTTPS URL (Stripe verifies the payment method domain from the internet). See [Wallet Payments in Development](https://spreecommerce.org/docs/developer/storefront/nextjs/wallet-payments) for the Cloudflare Tunnel setup.

### Production Build

```bash
pnpm run build
pnpm start
```

### Testing

Unit and integration tests run through Vitest (`pnpm test`); end-to-end tests run through Playwright against a real Spree backend in Docker (`pnpm run e2e:up && pnpm run test:e2e`). See the [Testing guide](https://spreecommerce.org/docs/developer/storefront/nextjs/testing) for the full E2E setup, Stripe test keys, CI, and running against your own backend.

## Multi-Region

Multiple countries, currencies, and languages from one deployment via `/{country}/{locale}` URL segments and edge middleware. See the [Multi-Region guide](https://spreecommerce.org/docs/developer/storefront/nextjs/multi-region).

## Customization

The storefront ships in your project — restyle with Tailwind CSS, swap components in `src/components/`, and adjust the server actions in `src/lib/data/`. See the [Customization guide](https://spreecommerce.org/docs/developer/storefront/nextjs/customization).

## Transactional Emails

The storefront can render and send its own order, shipment, and account emails with [react-email](https://react.email) and [Resend](https://resend.com), driven by Spree webhooks. See the [Transactional Emails guide](https://spreecommerce.org/docs/developer/storefront/nextjs/emails).

## Deployment

Deploy to Vercel, Docker (a multi-stage `Dockerfile` ships at the repo root), or any Node.js host. See the [Deployment guide](https://spreecommerce.org/docs/developer/storefront/nextjs/deployment).

## License

MIT
