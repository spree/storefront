import { redirect } from "next/navigation";

interface WishlistRedirectPageProps {
  params: Promise<{
    country: string;
    locale: string;
  }>;
}

export default async function WishlistRedirectPage({
  params,
}: WishlistRedirectPageProps) {
  const { country, locale } = await params;
  redirect(`/${country}/${locale}/account/wishlist`);
}
