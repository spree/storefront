"use client";

import type { Order, OrderProof } from "@spree/sdk";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { OrderProofPanel } from "@/components/order/OrderProofPanel";
import { PersonalizationSnapshot } from "@/components/products/PersonalizationSnapshot";
import { LineItemReviewActions } from "@/components/reviews/LineItemReviewActions";
import { ProductImage } from "@/components/ui/product-image";
import type { LineItemReviewState } from "@/lib/reviews/line-item-review-state";

interface LineItemCardProps {
  item: Order["items"][number];
  basePath: string;
  orderId?: string;
  proofs?: OrderProof[];
  reviewState?: LineItemReviewState;
}

export function LineItemCard({
  item,
  basePath,
  orderId,
  proofs = [],
  reviewState,
}: LineItemCardProps) {
  const t = useTranslations("orders");
  return (
    <div className="flex min-w-0 gap-3 sm:gap-4">
      <Link
        href={`${basePath}/products/${item.slug}`}
        className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-md bg-marketplace-surface-warm sm:size-24"
      >
        <ProductImage
          src={item.thumbnail_url}
          alt={item.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`${basePath}/products/${item.slug}`}
            className="line-clamp-2 min-w-0 text-sm font-medium text-marketplace-foreground transition-colors hover:text-marketplace-brand"
          >
            {item.name}
          </Link>
          {reviewState?.kind === "write" ? (
            <LineItemReviewActions state={reviewState} />
          ) : null}
        </div>
        {item.options_text && (
          <p className="mt-1 text-xs text-marketplace-muted-foreground">
            {item.options_text}
          </p>
        )}
        <PersonalizationSnapshot
          snapshot={item.personalization_snapshot}
          proofRequired={item.proof_required}
          files={item.personalization_files}
        />
        {orderId ? (
          <OrderProofPanel
            orderId={orderId}
            lineItemId={item.id}
            proofRequired={item.proof_required}
            proofs={proofs}
          />
        ) : null}
        <p className="mt-1 text-xs text-marketplace-muted-foreground">
          {t("qty", { quantity: item.quantity })}
        </p>
        <Link
          href={`${basePath}/products/${item.slug}`}
          className="mt-2 inline-block text-sm font-medium text-marketplace-brand hover:underline"
        >
          {t("orderAgain")}
        </Link>
        {reviewState && reviewState.kind !== "write" ? (
          <LineItemReviewActions state={reviewState} />
        ) : null}
      </div>

      <div className="shrink-0 text-sm font-semibold text-marketplace-foreground">
        {item.display_total}
      </div>
    </div>
  );
}
