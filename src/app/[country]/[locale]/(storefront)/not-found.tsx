"use client";

import { useParams } from "next/navigation";
import { NotFoundContent } from "@/components/layout/NotFoundContent";

/**
 * Shown when a page calls notFound() during an in-app navigation, or when the
 * proxy's existence check could not answer. Full page loads of a missing
 * record get app/global-not-found.tsx with a real 404 status instead.
 */
export default function StorefrontNotFound(): React.JSX.Element {
  const { country, locale } = useParams<{ country: string; locale: string }>();
  return <NotFoundContent basePath={`/${country}/${locale}`} />;
}
