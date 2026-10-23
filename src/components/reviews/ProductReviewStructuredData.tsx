import type { Product, ProductReview } from "@spree/sdk";

type ProductReviewStructuredDataProps = {
  product: Product;
  reviews: ProductReview[];
};

export function ProductReviewStructuredData({
  product,
  reviews,
}: ProductReviewStructuredDataProps) {
  const count = product.reviews_count ?? 0;
  const average = product.average_rating;
  if (count <= 0 || average == null) {
    return null;
  }

  const published = reviews.filter((review) => review.status === "published");
  const reviewNodes = published.slice(0, 10).map((review) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.customer_name ?? "Verified buyer",
    },
    datePublished: review.published_at ?? review.created_at,
    reviewBody: review.body ?? undefined,
    name: review.title ?? undefined,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
  }));

  const payload = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: average,
      reviewCount: count,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviewNodes.length > 0 ? reviewNodes : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
