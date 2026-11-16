"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { followSeller, unfollowSeller } from "@/lib/data/follows";
import { cn } from "@/lib/utils";
import { buildAccountLoginHref } from "@/lib/utils/account-redirect";
import { extractBasePath } from "@/lib/utils/path";

interface FollowShopButtonProps {
  sellerId: string;
  sellerSlug?: string;
  initialFollowing?: boolean;
  returnTo?: string;
  /** Etsy-style solid follow on shop pages. */
  prominent?: boolean;
  /** Heart-only control for featured shop cards. */
  iconOnly?: boolean;
  className?: string;
  followLabel?: string;
  followingLabel?: string;
}

export function FollowShopButton({
  sellerId,
  sellerSlug,
  initialFollowing = false,
  returnTo,
  prominent = false,
  iconOnly = false,
  className,
  followLabel,
  followingLabel,
}: FollowShopButtonProps) {
  const t = useTranslations("sellers");
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  if (!isAuthenticated) {
    const loginHref = buildAccountLoginHref(
      extractBasePath(pathname),
      returnTo ?? pathname,
    );
    if (iconOnly) {
      return (
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "size-9 rounded-full border border-marketplace-border-subtle bg-marketplace-surface text-marketplace-foreground shadow-[var(--marketplace-shadow-card)] hover:bg-marketplace-surface-subtle",
            className,
          )}
          asChild
        >
          <Link href={loginHref} aria-label={t("follow")}>
            <Heart className="size-4" aria-hidden />
          </Link>
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          prominent
            ? "h-9 rounded-full px-4 font-medium shadow-sm transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2"
            : "rounded-[var(--marketplace-radius-sm)]",
          className,
        )}
        style={prominent ? sellerActionStyle : undefined}
        asChild
      >
        <Link href={loginHref} className="inline-flex items-center gap-1.5">
          <Heart className="size-4" aria-hidden />
          {followLabel ?? t("follow")}
        </Link>
      </Button>
    );
  }

  const variant = "outline";

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "size-9 rounded-full border border-marketplace-border-subtle bg-marketplace-surface text-marketplace-foreground shadow-sm hover:bg-marketplace-surface-subtle",
          className,
        )}
        disabled={pending}
        aria-pressed={following}
        aria-label={following ? t("following") : t("follow")}
        onClick={() => {
          const next = !following;
          startTransition(async () => {
            try {
              const result = next
                ? await followSeller(sellerId)
                : await unfollowSeller(sellerId);
              if (!result.success) {
                toast.error(
                  result.error || t(next ? "followFailed" : "unfollowFailed"),
                );
                return;
              }
              setFollowing(next);
              window.dispatchEvent(
                new CustomEvent("seller-follow-change", {
                  detail: {
                    sellerId,
                    sellerSlug,
                    delta: next ? 1 : -1,
                  },
                }),
              );
              router.refresh();
            } catch {
              toast.error(t(next ? "followFailed" : "unfollowFailed"));
            }
          });
        }}
      >
        <Heart
          className={`size-4 ${following ? "fill-current" : ""}`}
          aria-hidden
        />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={cn(
        "inline-flex items-center gap-1.5",
        prominent
          ? "h-9 rounded-full px-4 font-medium shadow-sm transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2"
          : "rounded-[var(--marketplace-radius-sm)]",
        className,
      )}
      style={prominent ? sellerActionStyle : undefined}
      disabled={pending}
      aria-pressed={following}
      aria-busy={pending}
      onClick={() => {
        const next = !following;
        startTransition(async () => {
          try {
            const result = next
              ? await followSeller(sellerId)
              : await unfollowSeller(sellerId);
            if (!result.success) {
              toast.error(
                result.error || t(next ? "followFailed" : "unfollowFailed"),
              );
              return;
            }
            setFollowing(next);
            window.dispatchEvent(
              new CustomEvent("seller-follow-change", {
                detail: {
                  sellerId,
                  sellerSlug,
                  delta: next ? 1 : -1,
                },
              }),
            );
            router.refresh();
          } catch {
            toast.error(t(next ? "followFailed" : "unfollowFailed"));
          }
        });
      }}
    >
      <Heart
        className={`size-4 ${following ? "fill-current" : ""}`}
        aria-hidden
      />
      {following
        ? (followingLabel ?? t("following"))
        : (followLabel ?? t("follow"))}
    </Button>
  );
}

const sellerActionStyle = {
  backgroundColor: "var(--marketplace-seller-action-bg, #243b36)",
  borderColor: "var(--marketplace-seller-action-border, #243b36)",
  color: "var(--marketplace-seller-action-text, #fff)",
} as CSSProperties;
