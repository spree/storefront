> [!IMPORTANT]
>
> Work in progress, please check our progress here: https://github.com/orgs/spree/projects/3

# Spree Next.js Storefront

A modern, headless e-commerce storefront built with Next.js 16, React 19, and the Spree Commerce API v3.

## Tech Stack

- **Next.js 16** - App Router, Server Actions, Turbopack
- **React 19** - Latest React with improved Server Components
- **Tailwind CSS 4** - Utility-first styling
- **TypeScript 5** - Full type safety
- **Sentry** - Error tracking and performance monitoring with source maps
- [@spree/sdk](https://github.com/spree/spree/tree/main/packages/sdk) - Official Spree Commerce SDK
- [@spree/next](https://github.com/spree/spree/tree/main/packages/next) - Server actions, caching, and cookie-based auth

## Features

- **Server-First Architecture** - All API calls happen server-side using Next.js Server Actions
- **Secure Authentication** - JWT tokens stored in httpOnly cookies (not localStorage)
- **Product Catalog** - Browse, search, filter products by categories and with faceted navigation
- **Product Details** - View product information with variant selection and images
- **Shopping Cart** - Add, update, and remove items with server-side state
- **Multi-Step Checkout** - Guest visitors and signed in users supported, multi-shipments supported natively, Coupon Codes, Gift Cards, Store Credit
- **Stripe payments** - native Stripe payment support with Stripe SDKs, PCI-Compliant, 3DS-Secure, use Credit Cards, Apple Pay, Google Pay, Klarna, Affirm, SEPA payments and all other payment methods provided by [Spree Stripe integration](https://github.com/spree/spree_stripe)
- **Google Tag Mananager** and **Google Analytics 4 Ecommerce events** tracking supported natively
- **Customer Account** - Full account management:
  - Profile management
  - Order history with detailed order view
  - Address book (create, edit, delete)
  - Gift Cards and Store Credit
  - Saved payment methods
- **Multi-Region Support** - Country and currency switching via URL segments
- **Responsive Design** - Mobile-first Tailwind CSS styling
- **Error Tracking** - Sentry integration for both server-side and client-side error monitoring with source maps

## Architecture

This starter follows a **server-first pattern**:

1. **Server Actions** (`src/lib/data/`) - All API calls are made server-side
2. **httpOnly Cookies** - Auth tokens and cart tokens are stored securely
3. **No Client-Side API Calls** - The Spree API key is never exposed to the browser
4. **Cache Revalidation** - Uses Next.js cache tags for efficient updates

```
Browser → Server Action → Spree API
         (with httpOnly cookies)
```

## Getting Started

### Prerequisites

- Node.js 20+ (required for Next.js 16)
- A running Spree Commerce 5.4+

### Installation

1. Install dependencies:

```bash
npm install
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

#### Optional variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GTM_ID` | Google Tag Manager container ID (e.g. `GTM-XXXXXXX`) | _(disabled)_ |
| `SENTRY_DSN` | Sentry DSN for error tracking (e.g. `https://key@o0.ingest.sentry.io/0`) | _(disabled)_ |
| `SENTRY_ORG` | Sentry organization slug (for source map uploads) | _(none)_ |
| `SENTRY_PROJECT` | Sentry project slug (for source map uploads) | _(none)_ |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (for source map uploads in CI) | _(none)_ |
| `SENTRY_SEND_DEFAULT_PII` | Send PII (IP addresses, cookies, user data) to Sentry server-side | `false` |
| `NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII` | Send PII to Sentry client-side | `false` |

> **Privacy note:** PII collection is disabled by default. Only set `SENTRY_SEND_DEFAULT_PII` / `NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII` to `true` if you have appropriate user consent or a privacy policy covering this data.

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   └── [country]/[locale]/     # Localized routes
│       ├── account/            # Customer account pages
│       │   ├── addresses/      # Address management
│       │   ├── credit-cards/   # Saved payment methods
│       │   ├── orders/         # Order history
│       │   │   └── [id]/       # Order details
│       │   └── profile/        # Profile settings
│       ├── cart/               # Shopping cart
│       ├── products/           # Product listing
│       │   └── [slug]/         # Product details
│       ├── t/[...permalink]/   # Taxon/category pages
│       └── taxonomies/         # Category overview
├── components/
│   ├── layout/                 # Header, Footer, CountrySwitcher
│   ├── products/               # ProductCard, ProductGrid, Filters
│   └── search/                 # SearchBar
├── contexts/
│   └── CartContext.tsx         # Client-side cart state sync
└── lib/
    ├── spree.ts                # SDK client configuration
    └── data/                   # Server Actions
        ├── addresses.ts        # Address CRUD operations
        ├── cart.ts             # Cart operations
        ├── cookies.ts          # Auth token management
        ├── countries.ts        # Countries/regions list
        ├── credit-cards.ts     # Payment methods
        ├── customer.ts         # Auth & profile
        ├── orders.ts           # Order history
        ├── products.ts         # Product queries
        ├── store.ts            # Store configuration
        └── taxonomies.ts       # Categories/taxons
```

## Server Actions

All data fetching is done through server actions in `src/lib/data/`:

```typescript
// Products
import { getProducts, getProduct, getProductFilters } from '@/lib/data/products'

const products = await getProducts({ per_page: 12 })
const product = await getProduct('product-slug', { includes: 'variants,images' })
const filters = await getProductFilters({ taxon_id: 'txn_xxx' })

// Cart
import { getCart, addToCart, updateCartItem, removeCartItem } from '@/lib/data/cart'

const cart = await getCart()
await addToCart('var_xxx', 1)
await updateCartItem('li_xxx', 2)
await removeCartItem('li_xxx')

// Authentication
import { login, register, logout, getCustomer } from '@/lib/data/customer'

const result = await login('user@example.com', 'password')
const customer = await getCustomer()
await logout()

// Addresses
import { getAddresses, createAddress, updateAddress, deleteAddress } from '@/lib/data/addresses'

const addresses = await getAddresses()
await createAddress({ firstname: 'John', ... })
```

## Authentication Flow

1. User submits login form
2. Server action calls Spree API with credentials
3. JWT token is stored in an httpOnly cookie
4. Subsequent requests include the token automatically
5. Token is never accessible to client-side JavaScript

```typescript
// src/lib/data/cookies.ts
export async function setAuthToken(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('_spree_jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })
}
```

## Multi-Region Support

The storefront supports multiple countries and currencies via URL segments:

```
/us/en/products          # US store, English
/de/de/products          # German store, German
/uk/en/products          # UK store, English
```

Use the `CountrySwitcher` component to change regions.

## Customization

### Styling

The storefront uses Tailwind CSS. Customize the design by modifying:

- `tailwind.config.ts` - Theme configuration
- `src/app/globals.css` - Global styles

### Components

All components are in `src/components/` and can be customized or replaced as needed.

### Data Layer

To customize API behavior, modify the server actions in `src/lib/data/`.

## Deploy on Vercel

The easiest way to deploy is using [Vercel](https://vercel.com/new):

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables:
   - `SPREE_API_URL` and `SPREE_PUBLISHABLE_KEY` (required)
   - `GTM_ID` (optional — Google Tag Manager)
   - `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (optional — for error tracking with readable stack traces)
4. Deploy

## License

BSD-3-Clause
