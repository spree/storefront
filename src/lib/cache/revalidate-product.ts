import { revalidatePath, revalidateTag } from "next/cache";

export interface ProductRevalidateInput {
  slug?: string;
  id?: string;
}

export function revalidateProductCache({
  slug,
  id,
}: ProductRevalidateInput): void {
  const slugValue = slug?.trim();
  const idValue = id?.trim();

  for (const tag of ["products", "products-wholesale"]) {
    revalidateTag(tag, { expire: 0 });
  }
  if (slugValue) {
    revalidateTag(`product:${slugValue}`, { expire: 0 });
    revalidateTag(`product:${slugValue}-wholesale`, { expire: 0 });
  }
  if (idValue) {
    revalidateTag(`product:${idValue}`, { expire: 0 });
    revalidateTag(`product:${idValue}-wholesale`, { expire: 0 });
  }
  revalidatePath("/[country]/[locale]/products/[slug]", "page");
}
