import { revalidateTag } from "next/cache";

/**
 * Handle `store.updated` — a merchant saved Spree Admin → Settings → Store.
 * Expire the cached store in every locale so the name, SEO metadata, logo,
 * social accounts and support email change on the next request instead of
 * after the hourly revalidation. The webhook endpoint must be subscribed to
 * `store.updated` in Spree Admin → Settings → Developers → Webhooks.
 */
export async function handleStoreUpdated(): Promise<void> {
  revalidateTag("store", { expire: 0 });
}
