"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { FollowShopButton } from "@/components/shops/FollowShopButton";

export type MeetTheMakerFollowerSample = {
  id: string;
  label: string;
};

type ProductPageMeetTheMakerAsideProps = {
  sellerId: string;
  sellerSlug: string;
  initialFollowing: boolean;
  initialFollowersCount: number;
  followerSamples: MeetTheMakerFollowerSample[];
  inline?: boolean;
  afterFollow?: ReactNode;
};

const AVATAR_COLORS = ["#d4a574", "#8b9dc3", "#c9a0a0", "#7eb09b", "#b8a0c9"];

function followerInitial(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export function ProductPageMeetTheMakerAside({
  sellerId,
  sellerSlug,
  initialFollowing,
  initialFollowersCount,
  followerSamples,
  inline = false,
  afterFollow,
}: ProductPageMeetTheMakerAsideProps) {
  const tProducts = useTranslations("products");
  const tSellers = useTranslations("sellers");
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);

  useEffect(() => {
    setFollowersCount(initialFollowersCount);
  }, [initialFollowersCount]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sellerId: string; delta: number }>)
        .detail;
      if (!detail || detail.sellerId !== sellerId) return;
      setFollowersCount((count) => Math.max(0, count + detail.delta));
    };
    window.addEventListener("seller-follow-change", handler);
    return () => window.removeEventListener("seller-follow-change", handler);
  }, [sellerId]);

  return (
    <div
      className={
        inline
          ? "flex w-full min-w-0 flex-row flex-wrap items-center justify-center gap-2 md:w-auto"
          : "flex w-full flex-col lg:max-w-[min(100%,22rem)] lg:shrink-0"
      }
    >
      <FollowShopButton
        sellerId={sellerId}
        sellerSlug={sellerSlug}
        initialFollowing={initialFollowing}
        followLabel={tProducts("followMaker")}
        followingLabel={tProducts("followingMaker")}
        className={
          inline
            ? "!h-11 !w-auto !min-w-40 !justify-center gap-2 !rounded-full !border !border-[#39343c] !bg-white !px-5 !text-xs !font-semibold !text-[#39343c] !shadow-none hover:!bg-[#f7f4f1] [&_svg]:size-3.5"
            : "!h-11 !w-full !justify-center gap-2 !rounded-full !border !border-[#1a1a1a] !bg-[#f4efe6] !px-6 !text-[11px] !font-bold !uppercase !text-[#1a1a1a] !shadow-none hover:!brightness-[0.98] [&_svg]:size-3.5"
        }
        prominent={false}
      />
      {afterFollow}
      {followersCount > 0 ? (
        <div
          className={`mt-2 flex items-center justify-center gap-2 ${inline ? "w-full" : "lg:justify-end"}`}
        >
          <div className="flex -space-x-2" aria-hidden>
            {followerSamples.slice(0, 3).map((sample, index) => (
              <span
                key={sample.id}
                className="flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white"
                style={{
                  backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                }}
                title={sample.label}
              >
                {followerInitial(sample.label)}
              </span>
            ))}
          </div>
          <p className="text-xs text-[#6b6560]">
            {tSellers("followersCount", { count: followersCount })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
