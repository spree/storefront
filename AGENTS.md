# Engineering Guide for the Next.js Spree Storefront

This file tells any coding agent how this project is built, tested, and styled.

## Project Overview

This is a headless e-commerce storefront built with Next.js 16 and React 19, using the Spree Commerce API v3 via `@spree/sdk`.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **React:** 19 (with new features like `use()`, Actions, improved Suspense)
- **Styling:** Tailwind CSS
- **API Client:** `@spree/sdk`
- **Language:** TypeScript

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   └── [country]/[locale]/       # Internationalized routes
│       ├── (checkout)/           # Checkout route group (minimal layout)
│       └── (storefront)/         # Storefront route group (full layout)
├── components/                   # Reusable UI components
├── contexts/                     # React Context providers
├── lib/
│   └── data/                     # Server Actions for data fetching
└── types/                        # TypeScript type definitions
```

## React 19 Best Practices

### Avoid Unnecessary useEffect

React 19 provides better patterns for many cases where `useEffect` was previously required. Follow https://react.dev/learn/you-might-not-need-an-effect

#### Don't Use useEffect For:

**1. Transforming data for rendering**
```typescript
// ❌ Bad - useEffect for derived state
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Good - compute during render
const fullName = `${firstName} ${lastName}`;

// ✅ Good - useMemo for expensive calculations
const sortedProducts = useMemo(
  () => products.sort((a, b) => a.price - b.price),
  [products]
);
```

**2. Resetting state when props change**
```typescript
// ❌ Bad - useEffect to reset state
useEffect(() => {
  setSelectedVariant(null);
}, [productId]);

// ✅ Good - use key to reset component state
<ProductDetails key={productId} product={product} />

// ✅ Good - compute initial state from props
const [selectedVariant, setSelectedVariant] = useState(() => {
  return product.default_variant || product.variants[0];
});
```

**3. Fetching data in response to user events**
```typescript
// ❌ Bad - useEffect triggered by state
const [query, setQuery] = useState("");
useEffect(() => {
  fetchResults(query);
}, [query]);

// ✅ Good - fetch in event handler
const handleSearch = async (searchQuery: string) => {
  setQuery(searchQuery);
  const results = await fetchResults(searchQuery);
  setResults(results);
};

// ✅ Better - use Server Actions
const [results, searchAction] = useActionState(searchProducts, []);
```

**4. Initializing the application**
```typescript
// ❌ Bad - useEffect for one-time init
useEffect(() => {
  loadAnalytics();
}, []);

// ✅ Good - module-level initialization
if (typeof window !== "undefined") {
  loadAnalytics();
}

// ✅ Good - check if already initialized
let didInit = false;
function App() {
  if (!didInit) {
    didInit = true;
    loadAnalytics();
  }
  return null;
}
```

#### When useEffect IS Appropriate:

- **Synchronizing with external systems** (DOM APIs, third-party widgets, network)
- **Setting up subscriptions** (WebSocket, event listeners)
- **Browser-only effects** (focus management, scroll position)
- **Intersection Observer, Resize Observer**

### Use Server Components by Default

```typescript
// ✅ Good - Server Component (default, no "use client")
// src/app/[country]/[locale]/(storefront)/products/page.tsx
import { getProducts } from "@/lib/data/products";

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductList products={products} />;
}
```

Only add `"use client"` when you need:
- Event handlers (onClick, onChange, etc.)
- useState, useReducer, useEffect, useContext
- Browser-only APIs
- Custom hooks that use state/effects

### Use Server Actions for Mutations

```typescript
// src/lib/data/cart.ts
"use server";

export async function addToCart(variantId: string, quantity: number) {
  const cart = await getOrCreateCart();
  const client = await getSpreeClient();

  return client.orders.lineItems.create(
    cart.id,
    { variant_id: variantId, quantity },
    { orderToken: cart.token }
  );
}

// Component usage
import { addToCart } from "@/lib/data/cart";

function AddToCartButton({ variantId }: { variantId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await addToCart(variantId, 1);
    });
  };

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? "Adding..." : "Add to Cart"}
    </button>
  );
}
```

### Use React 19 `use()` for Promises

```typescript
// ✅ Good - use() with Suspense
import { use, Suspense } from "react";

interface ProductDetailsProps {
  productPromise: Promise<Product>;
}

function ProductDetails({ productPromise }: ProductDetailsProps) {
  const product = use(productPromise);
  return <div>{product.name}</div>;
}

// Parent component
function ProductPage({ id }: { id: string }) {
  const productPromise = getProduct(id); // Don't await here

  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetails productPromise={productPromise} />
    </Suspense>
  );
}
```

### Prefer useActionState for Forms

```typescript
// ✅ Good - useActionState for form handling
"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/data/customer";

function ProfileForm({ user }: { user: User }) {
  const [state, formAction, isPending] = useActionState(updateProfile, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction}>
      <input name="firstName" defaultValue={user.first_name} />
      <input name="lastName" defaultValue={user.last_name} />
      <button disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
      {state.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
```

### Use useOptimistic for Instant UI Updates

```typescript
// ✅ Good - optimistic updates
import { useOptimistic } from "react";

interface CartItemProps {
  item: LineItem;
  onUpdate: (id: string, quantity: number) => Promise<void>;
}

function CartItem({ item, onUpdate }: CartItemProps) {
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(item.quantity);

  const handleQuantityChange = async (newQuantity: number) => {
    setOptimisticQuantity(newQuantity);
    await onUpdate(item.id, newQuantity);
  };

  return (
    <div>
      <span>{item.name}</span>
      <span>Qty: {optimisticQuantity}</span>
      <button onClick={() => handleQuantityChange(optimisticQuantity + 1)}>+</button>
    </div>
  );
}
```

## Next.js 16 Best Practices

### Use Route Groups for Layouts

```
app/[country]/[locale]/
├── (checkout)/              # Minimal layout for checkout
│   ├── layout.tsx
│   └── checkout/[id]/page.tsx
├── (storefront)/            # Full layout with header/footer
│   ├── layout.tsx
│   ├── page.tsx
│   └── products/
└── layout.tsx               # Shared locale/currency provider
```

### Parallel Data Fetching

```typescript
// ✅ Good - parallel fetches
interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [product, relatedProducts, reviews] = await Promise.all([
    getProduct(slug),
    getRelatedProducts(slug),
    getProductReviews(slug),
  ]);

  return (
    <>
      <ProductDetails product={product} />
      <RelatedProducts products={relatedProducts} />
      <Reviews reviews={reviews} />
    </>
  );
}
```

### Use Loading UI and Streaming

```typescript
// app/products/loading.tsx
export default function Loading() {
  return <ProductGridSkeleton />;
}

// Or use Suspense boundaries for more granular loading
export default async function Page() {
  return (
    <div>
      <Suspense fallback={<ProductInfoSkeleton />}>
        <ProductInfo />
      </Suspense>
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews />
      </Suspense>
    </div>
  );
}
```

### Dynamic Params and generateStaticParams

```typescript
// For static generation with dynamic routes
export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product) => ({ slug: product.slug }));
}

// For dynamic rendering when needed
export const dynamic = "force-dynamic";
```

### Metadata API

```typescript
import type { Metadata } from "next";

interface MetadataProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  return {
    title: product.meta_title || product.name,
    description: product.meta_description,
    openGraph: {
      images: product.images.map((img) => img.url),
    },
  };
}
```

## Spree SDK Usage

### Server-Side Data Fetching

```typescript
// src/lib/data/products.ts
"use server";

import { getSpreeClient } from "@/lib/spree";

export async function getProducts(params?: ProductListParams) {
  const client = await getSpreeClient();

  return client.products.list({
    per_page: 12,
    includes: "images,default_variant",
    ...params,
  });
}
```

### Authentication Pattern

```typescript
// src/lib/data/auth.ts
"use server";

import { cookies } from "next/headers";
import { getSpreeClient } from "@/lib/spree";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function login(email: string, password: string) {
  const client = await getSpreeClient();
  const { token, user } = await client.auth.login({ email, password });

  const cookieStore = await cookies();
  cookieStore.set("spree_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SEVEN_DAYS,
  });

  return user;
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get("spree_token")?.value;
}
```

### Cart Token Management

```typescript
// Guest carts use order tokens stored in cookies
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function getCartToken() {
  const cookieStore = await cookies();
  return cookieStore.get("spree_cart_token")?.value;
}

export async function setCartToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("spree_cart_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: THIRTY_DAYS,
  });
}
```

## State Management

### Use Context Sparingly

Only use Context for truly global state that many components need:
- `CartContext` - Cart state and actions
- `AuthContext` - Authentication state
- `StoreContext` - Current store, locale, currency

For component-local state, prefer:
1. `useState` for simple state
2. URL search params for filter/sort state (shareable, bookmarkable)
3. Server state via Server Components

### URL State for Filters

```typescript
// ✅ Good - filters in URL
"use client";

import { useSearchParams, useRouter } from "next/navigation";

function ProductFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      value={searchParams.get("sort") || ""}
      onChange={(e) => updateFilter("sort", e.target.value)}
    >
      <option value="">Default</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
    </select>
  );
}
```

## TypeScript

### Use SDK Types

```typescript
import type {
  StoreProduct,
  StoreVariant,
  StoreOrder,
  StoreLineItem,
  PaginatedResponse,
} from "@spree/sdk";

interface ProductCardProps {
  product: StoreProduct;
  basePath: string;
}
```

### Strict Type Checking

The project uses strict TypeScript. Always:
- Define explicit return types for functions
- Use `satisfies` for type checking object literals
- Avoid `any`, use `unknown` if type is truly unknown

## Performance

### Image Optimization

```typescript
import Image from "next/image";

interface ProductImageProps {
  image: StoreImage;
}

function ProductImage({ image }: ProductImageProps) {
  return (
    <Image
      src={image.url}
      alt={image.alt || ""}
      width={800}
      height={800}
      className="object-cover"
      priority={false}
      placeholder="blur"
      blurDataURL={image.thumbnail_url}
    />
  );
}
```

### Lazy Loading Components

```typescript
import dynamic from "next/dynamic";

const ProductReviews = dynamic(
  () => import("./ProductReviews"),
  { loading: () => <ReviewsSkeleton /> }
);
```

## Testing

- Use Playwright for E2E tests
- Use React Testing Library for component tests
- Test Server Actions independently

## Code Style

- Use functional components only
- Prefer named exports for components
- Use absolute imports (`@/components/...`)
- Follow Tailwind CSS conventions for styling
- Keep components small and focused

## Code Quality with Biome

This project uses [Biome](https://biomejs.dev/) for linting and formatting (not ESLint).

### Available Commands

```bash
# Lint the codebase
pnpm run lint

# Format all files
pnpm run format

# Run both lint and format checks
pnpm run check
```

Always use `pnpm run check` before committing changes and fix any issues with `pnpm run format`.

### Configuration

Biome is configured in `biome.json` using default formatting rules:

- **Formatter:** 2-space indentation, double quotes, semicolons
- **Linter:** Recommended rules with project-specific adjustments

### Template Literals

```typescript
// ✅ Good - use template literals for string interpolation
const message = `Hello, ${name}!`;
const path = `${basePath}/products/${slug}`;

// ❌ Bad - string concatenation
const message = "Hello, " + name + "!";
const path = basePath + "/products/" + slug;
```

### Unused Variables

Biome warns about unused variables and imports. Remove them or prefix with underscore if intentionally unused:

```typescript
// ✅ Good - remove unused imports
import { useState } from "react";

// ✅ Good - prefix intentionally unused params
const handleClick = (_event: MouseEvent) => {
  // event not needed but required by type
};

// ❌ Bad - unused import
import { useState, useEffect } from "react"; // useEffect not used
```
