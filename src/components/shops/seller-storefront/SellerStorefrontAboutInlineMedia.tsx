"use client";

import {
  Camera,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  Video,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import type {
  InlinePhotoDraft,
  ShopContentInlineDraft,
} from "./shop-content-inline-draft-types";
import {
  SHOP_CONTENT_PICK_FILE_RESULT_ACTION as uploadResultAction,
  SHOP_CONTENT_UPLOAD_STATUS_ACTION as uploadStatusAction,
} from "./shop-content-inline-draft-types";

const editorSource = "spree-shop-editor";
const pickAction = "shop-content-pick-file";

function requestUpload(kind: "photo" | "video", requestId: string) {
  window.parent.postMessage(
    { source: editorSource, action: pickAction, payload: { kind, requestId } },
    "*",
  );
}

type PendingUpload = {
  kind: "photo" | "video";
  requestId: string;
  phase: "choosing" | "uploading";
};

function UploadProgress({ label }: { label: string }) {
  return (
    <div
      className="mt-2 flex min-w-0 items-center gap-2 text-xs font-medium text-[#514b53]"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        className="size-4 shrink-0 animate-spin text-[var(--marketplace-seller-action-background,#766b63)]"
        aria-hidden="true"
      />
      <span>{label}</span>
      <span
        className="ml-auto h-1 w-20 shrink-0 overflow-hidden rounded-full bg-black/10"
        aria-hidden="true"
      >
        <span
          className="block h-full w-1/3 rounded-full bg-[var(--marketplace-seller-action-background,#766b63)]"
          style={{
            animation:
              "seller-media-upload-progress 1.25s ease-in-out infinite",
          }}
        />
      </span>
    </div>
  );
}

export function SellerStorefrontAboutInlineMedia({
  draft,
  onDraftChange,
  publish,
}: {
  draft: ShopContentInlineDraft;
  onDraftChange: (next: ShopContentInlineDraft) => void;
  publish: (next: ShopContentInlineDraft) => void;
}) {
  const t = useTranslations("sellers.shopEditorInline");
  const baseId = useId();
  const activePhotos = draft.photos.filter((photo) => !photo.cleared);
  const videoPresent =
    !draft.videoCleared &&
    Boolean(draft.videoSignedId || draft.videoPreviewUrl || draft.videoUrl);
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>(
    {},
  );
  const [captionOpen, setCaptionOpen] = useState<Record<string, boolean>>({});
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(
    null,
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (message?.source !== "spree-shop-editor-parent") return;
      const requestId = message.payload?.requestId;
      if (!requestId || requestId !== pendingUpload?.requestId) return;

      if (message.action === uploadStatusAction) {
        setPendingUpload((current) =>
          current ? { ...current, phase: "uploading" } : current,
        );
      } else if (message.action === uploadResultAction) {
        setPendingUpload(null);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pendingUpload?.requestId]);

  function beginUpload(kind: "photo" | "video", requestId: string) {
    setPendingUpload({ kind, requestId, phase: "choosing" });
    requestUpload(kind, requestId);
  }

  const patch = useCallback(
    (updater: (current: ShopContentInlineDraft) => ShopContentInlineDraft) => {
      onDraftChange(updater(draft));
      publish(updater(draft));
    },
    [draft, onDraftChange, publish],
  );

  function photoKey(photo: InlinePhotoDraft, index: number) {
    return String(photo.id ?? photo.signedId ?? `new-${index}`);
  }

  return (
    <section className="mb-8 rounded-xl border border-[#e8e2dc] bg-[#fffdfa] p-4 text-[#29252d] shadow-sm sm:p-6">
      <div className="mb-5 border-b border-[#e8e2dc] pb-4">
        <h3 className="text-sm font-semibold">{t("mediaTitle")}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#6f6862]">
          {t("mediaSubtitle")}
        </p>
      </div>

      {videoPresent ? (
        <div className="grid gap-4 border-b border-[#e8e2dc] pb-5 sm:grid-cols-[10.25rem_minmax(0,1fr)] sm:gap-5">
          <div className="relative aspect-[164/100] max-w-[10.25rem] overflow-hidden rounded-lg border border-[#e8e2dc] bg-[#f2eee8]">
            {/* biome-ignore lint/a11y/useMediaCaption: captions are optional seller-provided content and can be added with the caption control below. */}
            <video
              className="size-full object-cover"
              src={draft.videoPreviewUrl ?? draft.videoUrl ?? undefined}
              controls
              preload="metadata"
            />
            <button
              type="button"
              aria-label={t("removeVideo")}
              className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-white text-[#29252d] shadow-sm transition hover:bg-[#f2eee8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#29252d]"
              onClick={() =>
                patch((current) => ({
                  ...current,
                  videoCleared: true,
                  videoSignedId: null,
                  videoPreviewUrl: null,
                  videoCaption: "",
                }))
              }
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-w-0 space-y-3 text-sm">
            {captionOpen.video ? (
              <>
                <textarea
                  className="w-full rounded-lg border border-[#d8d0c8] bg-[var(--marketplace-seller-field-background,#fff)] px-3 py-2.5 text-sm text-[#29252d] outline-none transition placeholder:text-[#817a73] focus:border-[#655c55] focus:ring-2 focus:ring-[#655c55]/15"
                  rows={3}
                  maxLength={500}
                  value={captionDrafts.video ?? draft.videoCaption}
                  onChange={(e) =>
                    setCaptionDrafts((c) => ({ ...c, video: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-[var(--marketplace-seller-action-background,#302a33)] px-4 py-2 text-xs font-semibold text-[var(--marketplace-seller-action-foreground,#fff)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#302a33]/40"
                    onClick={() => {
                      const caption = (
                        captionDrafts.video ?? draft.videoCaption
                      ).trim();
                      patch((current) => ({
                        ...current,
                        videoCaption: caption,
                      }));
                      setCaptionOpen((o) => ({ ...o, video: false }));
                    }}
                  >
                    {t("save")}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[#d8d0c8] bg-white px-4 py-2 text-xs font-semibold text-[#39333c] transition hover:bg-[#f7f3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#655c55]/30"
                    onClick={() => {
                      setCaptionDrafts((c) => ({
                        ...c,
                        video: draft.videoCaption,
                      }));
                      setCaptionOpen((o) => ({ ...o, video: false }));
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
                <p className="text-xs text-[#6f6862]">{t("captionHelp")}</p>
              </>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md py-1 font-semibold text-[#302a33] underline underline-offset-4 decoration-[#b9a99b] transition hover:decoration-[#302a33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#655c55]/30"
                onClick={() => setCaptionOpen((o) => ({ ...o, video: true }))}
              >
                <Plus className="size-4" />
                {draft.videoCaption ? t("editCaption") : t("addCaption")}
              </button>
            )}
            <button
              type="button"
              className="flex w-fit items-center rounded-md text-xs font-medium text-[#a5442a] underline underline-offset-4 decoration-[#d9a28e] transition hover:text-[#78331f] hover:decoration-[#78331f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a5442a]/30"
              disabled={pendingUpload?.kind === "video"}
              onClick={() => beginUpload("video", `${baseId}-replace`)}
            >
              {pendingUpload?.kind === "video" &&
              pendingUpload.phase === "uploading"
                ? t("uploadingVideo")
                : t("replaceVideo")}
            </button>
            {pendingUpload?.kind === "video" &&
            pendingUpload.phase === "uploading" ? (
              <UploadProgress label={t("uploadingVideo")} />
            ) : null}
            <p className="text-xs leading-relaxed text-[#6f6862]">
              {t("replaceVideoHelp")}
            </p>
          </div>
        </div>
      ) : (
        <div className="border-b border-[#e8e2dc] pb-5">
          <button
            type="button"
            className="grid w-full gap-3 text-left sm:grid-cols-[10.25rem_minmax(0,1fr)] sm:gap-5"
            disabled={pendingUpload?.kind === "video"}
            aria-busy={pendingUpload?.kind === "video"}
            onClick={() => beginUpload("video", `${baseId}-video`)}
          >
            <span className="flex aspect-[164/100] max-w-[10.25rem] items-center justify-center rounded-lg border border-dashed border-[#cfc5bc] bg-[#f7f3ee] transition hover:border-[#9d8979] hover:bg-[#f2ece5]">
              <span className="flex size-11 items-center justify-center rounded-full bg-[var(--marketplace-seller-action-background,#766b63)] text-[var(--marketplace-seller-action-foreground,#fff)]">
                {pendingUpload?.kind === "video" ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <Video className="size-5" />
                )}
              </span>
            </span>
            <span className="self-center text-sm">
              <span className="block font-semibold underline underline-offset-4 decoration-[#b9a99b]">
                {pendingUpload?.kind === "video" &&
                pendingUpload.phase === "uploading"
                  ? t("uploadingVideo")
                  : t("addVideo")}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-[#6f6862]">
                {t("addVideoHelp")}
              </span>
            </span>
          </button>
          {pendingUpload?.kind === "video" &&
          pendingUpload.phase === "uploading" ? (
            <UploadProgress label={t("uploadingVideo")} />
          ) : null}
        </div>
      )}

      <ul className="space-y-4">
        {activePhotos.map((photo, index) => {
          const key = photoKey(photo, index);
          const src = photo.previewUrl ?? photo.url ?? "";
          const matchesPhoto = (item: InlinePhotoDraft, itemIndex: number) =>
            photoKey(item, itemIndex) === key;
          return (
            <li
              key={key}
              className="grid gap-4 border-b border-[#e8e2dc] pb-4 sm:grid-cols-[10.25rem_minmax(0,1fr)] sm:gap-5"
            >
              <div className="relative flex aspect-[164/100] max-w-[10.25rem] items-center justify-center overflow-hidden rounded-lg border border-[#e8e2dc] bg-[#f2eee8]">
                {src ? (
                  // biome-ignore lint/performance/noImgElement: seller-uploaded preview URLs are ephemeral and not in the Next image allowlist.
                  <img src={src} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-7 text-[#8b8178]" />
                )}
                <button
                  type="button"
                  aria-label={t("removePhoto")}
                  className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-white text-[#29252d] shadow-sm transition hover:bg-[#f2eee8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#29252d]"
                  onClick={() =>
                    patch((current) => ({
                      ...current,
                      photos: current.photos.map((item, itemIndex) =>
                        matchesPhoto(item, itemIndex)
                          ? { ...item, cleared: true }
                          : item,
                      ),
                    }))
                  }
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-w-0 pt-1 text-sm">
                {captionOpen[key] ? (
                  <>
                    <textarea
                      className="w-full rounded-lg border border-[#d8d0c8] bg-[var(--marketplace-seller-field-background,#fff)] px-3 py-2.5 text-sm text-[#29252d] outline-none transition placeholder:text-[#817a73] focus:border-[#655c55] focus:ring-2 focus:ring-[#655c55]/15"
                      rows={3}
                      maxLength={500}
                      value={captionDrafts[key] ?? photo.caption}
                      onChange={(e) =>
                        setCaptionDrafts((c) => ({
                          ...c,
                          [key]: e.target.value,
                        }))
                      }
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-[var(--marketplace-seller-action-background,#302a33)] px-4 py-2 text-xs font-semibold text-[var(--marketplace-seller-action-foreground,#fff)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#302a33]/40"
                        onClick={() => {
                          const caption = (
                            captionDrafts[key] ?? photo.caption
                          ).trim();
                          patch((current) => ({
                            ...current,
                            photos: current.photos.map((item, itemIndex) =>
                              matchesPhoto(item, itemIndex)
                                ? { ...item, caption }
                                : item,
                            ),
                          }));
                          setCaptionOpen((o) => ({ ...o, [key]: false }));
                        }}
                      >
                        {t("save")}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-[#d8d0c8] bg-white px-4 py-2 text-xs font-semibold text-[#39333c] transition hover:bg-[#f7f3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#655c55]/30"
                        onClick={() => {
                          setCaptionDrafts((c) => ({
                            ...c,
                            [key]: photo.caption,
                          }));
                          setCaptionOpen((o) => ({ ...o, [key]: false }));
                        }}
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md py-1 font-semibold text-[#302a33] underline underline-offset-4 decoration-[#b9a99b] transition hover:decoration-[#302a33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#655c55]/30"
                    onClick={() =>
                      setCaptionOpen((o) => ({ ...o, [key]: true }))
                    }
                  >
                    <Plus className="size-4" />
                    {photo.caption ? t("editCaption") : t("addCaption")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {activePhotos.length < 5 ? (
        <div className="w-full max-w-[10.25rem]">
          <button
            type="button"
            disabled={pendingUpload?.kind === "photo"}
            aria-busy={pendingUpload?.kind === "photo"}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[color-mix(in_srgb,var(--marketplace-seller-accent,#cfc5bc)_55%,#ffffff)] bg-[var(--marketplace-seller-field-background,#f7f3ee)] py-6 text-[var(--marketplace-seller-accent-text,#39333c)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#655c55]/30 disabled:cursor-wait"
            onClick={() =>
              beginUpload("photo", `${baseId}-photo-${activePhotos.length}`)
            }
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-[var(--marketplace-seller-action-background,#766b63)] text-[var(--marketplace-seller-action-foreground,#fff)]">
              {pendingUpload?.kind === "photo" ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <Camera className="size-5" />
              )}
            </span>
            <span className="text-xs font-semibold underline underline-offset-4 decoration-[#b9a99b]">
              {pendingUpload?.kind === "photo" &&
              pendingUpload.phase === "uploading"
                ? t("uploadingPhoto")
                : t("addPhoto")}
            </span>
          </button>
          {pendingUpload?.kind === "photo" &&
          pendingUpload.phase === "uploading" ? (
            <UploadProgress label={t("uploadingPhoto")} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
