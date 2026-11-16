import { revalidatePath, revalidateTag } from "next/cache";

export interface CmsPageRevalidateInput {
  slug?: string;
  id?: string;
}

export function revalidateCmsPageCache({
  slug,
  id,
}: CmsPageRevalidateInput): void {
  const slugValue = slug?.trim();
  const idValue = id?.trim();

  revalidateTag("cms-pages", { expire: 0 });
  if (slugValue) {
    revalidateTag(`cms-page:${slugValue}`, { expire: 0 });
    revalidatePath(`/[country]/[locale]/pages/${slugValue}`, "page");
  }
  if (idValue) {
    revalidateTag(`cms-page-id:${idValue}`, { expire: 0 });
  }
  revalidatePath("/[country]/[locale]/pages/[slug]", "page");
  revalidatePath("/[country]/[locale]/pages/preview/[token]", "page");
}
