"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SellerShopPagePayload } from "@/lib/data/seller-storefront-types";
import type { FaqEditDraft } from "./SellerStorefrontAboutEtsyFields";
import { SellerStorefrontAboutInlineMedia } from "./SellerStorefrontAboutInlineMedia";
import {
  InlineFaqsSection,
  InlineHeadlineStory,
  InlineLinksSection,
  InlineMembersSection,
  InlineSellerDetailsSection,
} from "./SellerStorefrontAboutInlineSections";
import {
  SHOP_CONTENT_PICK_FILE_RESULT_ACTION,
  type ShopContentInlineDraft,
} from "./shop-content-inline-draft-types";

const editorSource = "spree-shop-editor";
const parentSource = "spree-shop-editor-parent";
const draftAction = "shop-content-inline-draft";

function draftFromPage(
  about: string | null | undefined,
  shopPage: SellerShopPagePayload | null | undefined,
): ShopContentInlineDraft {
  return {
    storyHeadline: shopPage?.story_headline ?? "",
    about: about ?? "",
    links: [...(shopPage?.links ?? [])],
    memberBios: (shopPage?.member_bios ?? []).map((member) => ({
      name: member.name,
      role: member.role ?? "",
      bio: member.bio ?? "",
      photoSignedId: null,
      photoPreviewUrl: null,
      photoUrl: member.photo_url ?? null,
      removePhoto: false,
    })),
    faqs: [...(shopPage?.faqs ?? [])],
    sellerDetailsPublic: shopPage?.seller_details_public ?? false,
    sellerDetails: { ...(shopPage?.seller_details ?? {}) },
    photos: (shopPage?.photos ?? []).map((photo) => ({
      id: photo.id,
      url: photo.url,
      previewUrl: null,
      signedId: null,
      caption: photo.caption ?? "",
      cleared: false,
    })),
    videoSignedId: null,
    videoPreviewUrl: null,
    videoUrl: shopPage?.video_url ?? null,
    videoCleared: false,
    videoCaption: shopPage?.video_caption ?? "",
  };
}

export function SellerStorefrontAboutInlineEdit({
  about,
  shopPage,
  marketplaceName,
  mutedColor,
}: {
  about?: string | null;
  shopPage?: SellerShopPagePayload | null;
  marketplaceName: string;
  mutedColor: string;
}) {
  const [showHeadline, setShowHeadline] = useState(() =>
    Boolean((shopPage?.story_headline ?? "").trim()),
  );
  const [showStory, setShowStory] = useState(() =>
    Boolean((about ?? "").trim()),
  );
  const [draft, setDraft] = useState<ShopContentInlineDraft>(() =>
    draftFromPage(about, shopPage),
  );
  const skipPublish = useRef(false);
  const [draftLink, setDraftLink] = useState<{
    label: string;
    url: string;
  } | null>(null);
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | "new" | null>(
    null,
  );
  const [faqDraft, setFaqDraft] = useState<FaqEditDraft | null>(null);
  const [editingSellerDetails, setEditingSellerDetails] = useState(false);

  const publish = useCallback((next: ShopContentInlineDraft) => {
    window.parent.postMessage(
      {
        source: editorSource,
        action: draftAction,
        payload: next,
        dirty: true,
      },
      "*",
    );
  }, []);

  const updateDraft = useCallback(
    (updater: (current: ShopContentInlineDraft) => ShopContentInlineDraft) => {
      setDraft((current) => {
        const next = updater(current);
        if (!skipPublish.current) publish(next);
        return next;
      });
    },
    [publish],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (message?.source !== parentSource) return;
      if (message.action === "reset-shop-content-inline") {
        const baseline = draftFromPage(about, shopPage);
        skipPublish.current = true;
        setDraft(baseline);
        setDraftLink(null);
        setEditingFaqIndex(null);
        setFaqDraft(null);
        setEditingSellerDetails(false);
        skipPublish.current = false;
        return;
      }
      if (message.action !== SHOP_CONTENT_PICK_FILE_RESULT_ACTION) return;
      const payload = message.payload as {
        kind: "photo" | "video" | "member-photo";
        signedId?: string;
        previewUrl?: string;
        error?: string;
      };
      if (payload.error || !payload.signedId) return;
      updateDraft((current) => {
        if (payload.kind === "video") {
          return {
            ...current,
            videoCleared: false,
            videoSignedId: payload.signedId ?? null,
            videoPreviewUrl: payload.previewUrl ?? null,
          };
        }
        if (payload.kind !== "photo") return current;
        return {
          ...current,
          photos: [
            ...current.photos,
            {
              signedId: payload.signedId ?? null,
              previewUrl: payload.previewUrl ?? null,
              url: null,
              caption: "",
              cleared: false,
            },
          ],
        };
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [about, shopPage, updateDraft]);

  useEffect(() => {
    publish(draft);
  }, [draft, publish]);

  return (
    <div className="space-y-2" data-shop-inline-editor>
      <InlineHeadlineStory
        draft={draft}
        showHeadline={showHeadline}
        showStory={showStory}
        mutedColor={mutedColor}
        onShowHeadline={() => setShowHeadline(true)}
        onHideHeadline={() => setShowHeadline(false)}
        onShowStory={() => setShowStory(true)}
        onHideStory={() => setShowStory(false)}
        updateDraft={updateDraft}
      />
      <SellerStorefrontAboutInlineMedia
        draft={draft}
        onDraftChange={setDraft}
        publish={publish}
      />
      <InlineLinksSection
        draft={draft}
        draftLink={draftLink}
        setDraftLink={setDraftLink}
        updateDraft={updateDraft}
      />
      <InlineMembersSection
        draft={draft}
        mutedColor={mutedColor}
        updateDraft={updateDraft}
      />
      <InlineFaqsSection
        draft={draft}
        marketplaceName={marketplaceName}
        mutedColor={mutedColor}
        editingFaqIndex={editingFaqIndex}
        setEditingFaqIndex={setEditingFaqIndex}
        faqDraft={faqDraft}
        setFaqDraft={setFaqDraft}
        updateDraft={updateDraft}
      />
      <InlineSellerDetailsSection
        draft={draft}
        mutedColor={mutedColor}
        editing={editingSellerDetails}
        setEditing={setEditingSellerDetails}
        updateDraft={updateDraft}
      />
    </div>
  );
}
