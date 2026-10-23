"use client";

import type { ProductReview } from "@spree/sdk";
import { ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markReviewHelpful, unmarkReviewHelpful } from "@/lib/data/reviews";
import { cn } from "@/lib/utils";

type ReviewHelpfulButtonProps = {
  productSlug: string;
  review: ProductReview;
};

export function ReviewHelpfulButton({
  productSlug,
  review,
}: ReviewHelpfulButtonProps) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [count, setCount] = useState(review.helpful_votes_count ?? 0);
  const [voted, setVoted] = useState(Boolean(review.helpful_voted));

  function toggle() {
    startTransition(async () => {
      try {
        if (voted) {
          const result = await unmarkReviewHelpful(productSlug, review.id);
          setCount(result.helpful_votes_count);
          setVoted(false);
        } else {
          const result = await markReviewHelpful(productSlug, review.id);
          setCount(result.helpful_votes_count);
          setVoted(true);
        }
        router.refresh();
      } catch {
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={toggle}
      className={cn(
        "h-8 gap-1.5 px-2 text-xs text-[#595959] hover:text-[#222]",
        voted && "text-[#222]",
      )}
      aria-pressed={voted}
    >
      <ThumbsUp
        className={cn("size-3.5", voted && "fill-current")}
        aria-hidden
      />
      {t("helpful")}
      <span className="tabular-nums">({count})</span>
    </Button>
  );
}
