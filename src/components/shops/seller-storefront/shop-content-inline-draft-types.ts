export type InlinePhotoDraft = {
  id?: number;
  url?: string | null;
  previewUrl?: string | null;
  signedId?: string | null;
  caption: string;
  cleared: boolean;
};

export type ShopContentInlineDraft = {
  storyHeadline: string;
  about: string;
  links: Array<{ label: string; url: string }>;
  memberBios: Array<{
    name: string;
    role: string;
    bio: string;
    photoSignedId?: string | null;
    photoPreviewUrl?: string | null;
    photoUrl?: string | null;
    removePhoto?: boolean;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  sellerDetailsPublic: boolean;
  sellerDetails: Record<string, string>;
  photos: InlinePhotoDraft[];
  videoSignedId: string | null;
  videoPreviewUrl: string | null;
  videoUrl: string | null;
  videoCleared: boolean;
  videoCaption: string;
};

export const SHOP_CONTENT_PICK_FILE_RESULT_ACTION =
  "shop-content-pick-file-result";
export const SHOP_CONTENT_UPLOAD_STATUS_ACTION = "shop-content-upload-status";
