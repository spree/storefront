"use client";

import { Camera, Pencil, Trash2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AddRowButton,
  DETAIL_FIELDS,
  EtsySaveCancel,
  EtsyTextSaveCancel,
  FAQ_PRESET_IDS,
  type FaqEditDraft,
  faqDraftFromQuestion,
  faqQuestionFromDraft,
  fieldClassName,
  LINK_PLATFORMS,
  memberInitial,
  type UpdateDraft,
} from "./SellerStorefrontAboutEtsyFields";
import {
  SHOP_CONTENT_PICK_FILE_RESULT_ACTION,
  type ShopContentInlineDraft,
} from "./shop-content-inline-draft-types";

type MemberDraft = ShopContentInlineDraft["memberBios"][number];
const editorSource = "spree-shop-editor";
const parentSource = "spree-shop-editor-parent";

export function SectionRow({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-current/20 pt-8 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-8">
      <div>
        <h3 className="text-sm font-semibold leading-snug">{title}</h3>
      </div>
      <div className="min-w-0 space-y-3">
        {aside}
        {children}
      </div>
    </section>
  );
}

export function InlineHeadlineStory({
  draft,
  showHeadline,
  showStory,
  mutedColor,
  onShowHeadline,
  onHideHeadline,
  onShowStory,
  onHideStory,
  updateDraft,
}: {
  draft: ShopContentInlineDraft;
  showHeadline: boolean;
  showStory: boolean;
  mutedColor: string;
  onShowHeadline: () => void;
  onHideHeadline: () => void;
  onShowStory: () => void;
  onHideStory: () => void;
  updateDraft: UpdateDraft;
}) {
  const t = useTranslations("sellers.shopEditorInline");
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [editingStory, setEditingStory] = useState(false);
  const headlineBeforeEdit = useRef<string | null>(null);
  const storyBeforeEdit = useRef<string | null>(null);

  function beginHeadlineEdit() {
    headlineBeforeEdit.current = draft.storyHeadline;
    setEditingHeadline(true);
    onShowHeadline();
  }

  function cancelHeadlineEdit() {
    const original = headlineBeforeEdit.current ?? "";
    updateDraft((current) => ({ ...current, storyHeadline: original }));
    setEditingHeadline(false);
    if (!original.trim()) onHideHeadline();
  }

  function beginStoryEdit() {
    storyBeforeEdit.current = draft.about;
    setEditingStory(true);
    onShowStory();
  }

  function cancelStoryEdit() {
    const original = storyBeforeEdit.current ?? "";
    updateDraft((current) => ({ ...current, about: original }));
    setEditingStory(false);
    if (!original.trim()) onHideStory();
  }

  function editButton(onClick: () => void) {
    return (
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
        onClick={onClick}
      >
        <Pencil className="size-3.5" />
        {t("edit")}
      </button>
    );
  }

  return (
    <>
      {showHeadline && (editingHeadline || !draft.storyHeadline.trim()) ? (
        <div className="mb-3">
          <label
            className="text-xs font-semibold"
            htmlFor="shop-story-headline"
          >
            {t("headlineLabel")}
          </label>
          <input
            id="shop-story-headline"
            className={`${fieldClassName()} mt-1`}
            value={draft.storyHeadline}
            maxLength={140}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                storyHeadline: event.target.value,
              }))
            }
          />
          <EtsySaveCancel
            onSave={() => setEditingHeadline(false)}
            onCancel={cancelHeadlineEdit}
          />
        </div>
      ) : showHeadline ? (
        <div className="flex min-w-0 items-center gap-3">
          <p className="min-w-0 flex-1 text-sm font-semibold">
            {draft.storyHeadline}
          </p>
          {editButton(beginHeadlineEdit)}
        </div>
      ) : (
        <AddRowButton label={t("addHeadline")} onClick={beginHeadlineEdit} />
      )}
      {showStory && (editingStory || !draft.about.trim()) ? (
        <div className="mb-8">
          <label className="text-xs font-semibold" htmlFor="shop-about-story">
            {t("storyLabel")}
          </label>
          <textarea
            id="shop-about-story"
            className={`${fieldClassName()} mt-1 min-h-[8rem] resize-y`}
            value={draft.about}
            maxLength={5000}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                about: event.target.value,
              }))
            }
          />
          <EtsySaveCancel
            onSave={() => setEditingStory(false)}
            onCancel={cancelStoryEdit}
          />
        </div>
      ) : showStory ? (
        <div className="mb-8 flex min-w-0 items-start gap-3">
          <p
            className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: mutedColor }}
          >
            {draft.about}
          </p>
          {editButton(beginStoryEdit)}
        </div>
      ) : (
        <div className="mb-8 flex flex-col items-start gap-1">
          <AddRowButton label={t("addStory")} onClick={beginStoryEdit} />
          <p className="pl-3 text-xs" style={{ color: mutedColor }}>
            {t("addStoryHelp")}
          </p>
        </div>
      )}
    </>
  );
}

export function InlineLinksSection({
  draft,
  draftLink,
  setDraftLink,
  updateDraft,
}: {
  draft: ShopContentInlineDraft;
  draftLink: { label: string; url: string } | null;
  setDraftLink: (value: { label: string; url: string } | null) => void;
  updateDraft: UpdateDraft;
}) {
  const t = useTranslations("sellers.shopEditorInline");

  function commitDraftLink() {
    if (!draftLink?.label.trim() || !draftLink.url.trim()) return;
    updateDraft((current) => ({
      ...current,
      links: [
        ...current.links,
        { label: draftLink.label.trim(), url: draftLink.url.trim() },
      ],
    }));
    setDraftLink(null);
  }

  return (
    <SectionRow title={t("shopLinksTitle")}>
      <p className="text-xs" style={{ color: "var(--muted-inline, #514b53)" }}>
        {t("linksHttpsNote")}
      </p>
      {draft.links.map((link, index) => (
        <div
          key={`${link.label}-${link.url}-${index}`}
          className="flex items-center justify-between gap-3 border-b border-current/15 py-2"
        >
          <span className="text-sm font-medium">{link.label}</span>
          <button
            type="button"
            aria-label={t("removeLink")}
            className="rounded-sm p-1 hover:bg-black/10"
            onClick={() =>
              updateDraft((current) => ({
                ...current,
                links: current.links.filter(
                  (_, itemIndex) => itemIndex !== index,
                ),
              }))
            }
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      {draftLink ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-[9rem] flex-1">
            <label className="text-xs font-semibold">
              {t("linkPlatformLabel")}
            </label>
            <select
              className={`${fieldClassName()} mt-1`}
              value={draftLink.label}
              onChange={(event) =>
                setDraftLink({
                  ...draftLink,
                  label: event.target.value || "Website",
                })
              }
            >
              {LINK_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-[2]">
            <label className="text-xs font-semibold">{t("linkUrlLabel")}</label>
            <input
              type="url"
              placeholder={t("linkUrlPlaceholder")}
              className={`${fieldClassName()} mt-1`}
              value={draftLink.url}
              onChange={(event) =>
                setDraftLink({ ...draftLink, url: event.target.value })
              }
            />
          </div>
          <EtsyTextSaveCancel
            onCancel={() => setDraftLink(null)}
            onSave={commitDraftLink}
          />
        </div>
      ) : (
        <AddRowButton
          label={t("addLink")}
          onClick={() => setDraftLink({ label: "Website", url: "" })}
        />
      )}
    </SectionRow>
  );
}

export function InlineFaqsSection({
  draft,
  marketplaceName,
  mutedColor,
  editingFaqIndex,
  setEditingFaqIndex,
  faqDraft,
  setFaqDraft,
  updateDraft,
}: {
  draft: ShopContentInlineDraft;
  marketplaceName: string;
  mutedColor: string;
  editingFaqIndex: number | "new" | null;
  setEditingFaqIndex: (value: number | "new" | null) => void;
  faqDraft: FaqEditDraft | null;
  setFaqDraft: (value: FaqEditDraft | null) => void;
  updateDraft: UpdateDraft;
}) {
  const t = useTranslations("sellers.shopEditorInline");

  function questionForPreset(id: (typeof FAQ_PRESET_IDS)[number]) {
    return t(`faqPresets.${id}`);
  }

  function startEditFaq(index: number) {
    const item = draft.faqs[index];
    if (!item) return;
    setEditingFaqIndex(index);
    setFaqDraft(
      faqDraftFromQuestion(item.question, item.answer, questionForPreset),
    );
  }

  function startNewFaq() {
    setEditingFaqIndex("new");
    setFaqDraft({ presetId: "custom_orders", customQuestion: "", answer: "" });
  }

  function cancelFaqDraft() {
    setEditingFaqIndex(null);
    setFaqDraft(null);
  }

  function commitFaqDraft() {
    if (!faqDraft) return;
    const question = faqQuestionFromDraft(faqDraft, questionForPreset);
    const answer = faqDraft.answer.trim();
    if (!question || !answer) return;
    updateDraft((current) => {
      const faqs = [...current.faqs];
      if (editingFaqIndex === "new") faqs.push({ question, answer });
      else if (typeof editingFaqIndex === "number")
        faqs[editingFaqIndex] = { question, answer };
      return { ...current, faqs };
    });
    cancelFaqDraft();
  }

  const faqAside = (
    <p className="text-xs leading-relaxed" style={{ color: mutedColor }}>
      {t("faqDisclaimer", { marketplace: marketplaceName })}
    </p>
  );

  return (
    <SectionRow title={t("faqsTitle")} aside={faqAside}>
      {draft.faqs.map((faq, index) =>
        editingFaqIndex === index ? null : (
          <div
            key={`${faq.question}-${index}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 border-b border-current/15 pb-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{faq.question}</p>
              <p
                className="mt-1 line-clamp-2 text-xs"
                style={{ color: mutedColor }}
              >
                {faq.answer}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4 disabled:opacity-40"
                disabled={editingFaqIndex !== null}
                onClick={() => startEditFaq(index)}
              >
                <Pencil className="size-3.5" />
                {t("edit")}
              </button>
              <button
                type="button"
                aria-label={t("removeFaq")}
                className="rounded-sm p-1 hover:bg-black/10 disabled:opacity-40"
                disabled={editingFaqIndex !== null}
                onClick={() =>
                  updateDraft((current) => ({
                    ...current,
                    faqs: current.faqs.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ),
      )}
      {faqDraft && editingFaqIndex !== null ? (
        <div className="max-w-xl space-y-3 pt-1">
          <div>
            <label className="text-xs font-semibold">
              {t("faqQuestionLabel")}
            </label>
            <select
              className={`${fieldClassName()} mt-1`}
              value={faqDraft.presetId}
              onChange={(event) =>
                setFaqDraft({
                  ...faqDraft,
                  presetId: event.target.value as FaqEditDraft["presetId"],
                  customQuestion: "",
                })
              }
            >
              {FAQ_PRESET_IDS.map((presetId) => (
                <option key={presetId} value={presetId}>
                  {questionForPreset(presetId)}
                </option>
              ))}
            </select>
          </div>
          {faqDraft.presetId === "custom" ? (
            <div>
              <label className="text-xs font-semibold">
                {t("faqCustomQuestionLabel")}
              </label>
              <input
                className={`${fieldClassName()} mt-1`}
                maxLength={250}
                value={faqDraft.customQuestion}
                onChange={(event) =>
                  setFaqDraft({
                    ...faqDraft,
                    customQuestion: event.target.value,
                  })
                }
              />
            </div>
          ) : null}
          <div>
            <label className="text-xs font-semibold">
              {t("faqAnswerLabel")}
            </label>
            <textarea
              className={`${fieldClassName()} mt-1 min-h-[9rem] resize-y`}
              maxLength={2000}
              value={faqDraft.answer}
              onChange={(event) =>
                setFaqDraft({ ...faqDraft, answer: event.target.value })
              }
              placeholder={t("faqAnswerPlaceholder")}
            />
          </div>
          <EtsySaveCancel onCancel={cancelFaqDraft} onSave={commitFaqDraft} />
        </div>
      ) : (
        <AddRowButton label={t("addFaq")} onClick={startNewFaq} />
      )}
    </SectionRow>
  );
}

export function InlineMembersSection({
  draft,
  mutedColor,
  updateDraft,
}: {
  draft: ShopContentInlineDraft;
  mutedColor: string;
  updateDraft: UpdateDraft;
}) {
  const t = useTranslations("sellers.shopEditorInline");
  const id = useId();
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null);
  const [uploadRequestId, setUploadRequestId] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (
        message?.source !== parentSource ||
        message.action !== SHOP_CONTENT_PICK_FILE_RESULT_ACTION
      )
        return;
      const payload = message.payload as {
        kind?: string;
        requestId?: string;
        signedId?: string;
        previewUrl?: string;
        error?: string;
      };
      if (
        payload.kind !== "member-photo" ||
        payload.requestId !== uploadRequestId
      )
        return;
      setUploadRequestId(null);
      if (payload.error || !payload.signedId) return;
      setMemberDraft((current) =>
        current
          ? {
              ...current,
              photoSignedId: payload.signedId,
              photoPreviewUrl: payload.previewUrl ?? null,
              removePhoto: false,
            }
          : current,
      );
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [uploadRequestId]);

  function beginEdit(index: number | "new") {
    const existing = typeof index === "number" ? draft.memberBios[index] : null;
    setMemberDraft(
      existing
        ? { ...existing }
        : {
            name: "",
            role: "",
            bio: "",
            photoSignedId: null,
            photoPreviewUrl: null,
            photoUrl: null,
            removePhoto: false,
          },
    );
    setEditingIndex(index);
  }

  function closeEditor() {
    setEditingIndex(null);
    setMemberDraft(null);
    setUploadRequestId(null);
  }

  function saveMember() {
    if (!memberDraft) return;
    updateDraft((current) => {
      const memberBios = [...current.memberBios];
      if (editingIndex === "new") memberBios.push(memberDraft);
      else if (typeof editingIndex === "number")
        memberBios[editingIndex] = memberDraft;
      return { ...current, memberBios };
    });
    closeEditor();
  }

  function choosePhoto() {
    const requestId = `${id}-member-photo-${Date.now()}`;
    setUploadRequestId(requestId);
    window.parent.postMessage(
      {
        source: editorSource,
        action: "shop-content-pick-file",
        payload: { kind: "member-photo", requestId },
      },
      "*",
    );
  }

  return (
    <SectionRow title={t("membersTitle")}>
      {draft.memberBios.map((member, index) => {
        return (
          <div
            key={`member-${index}`}
            className="space-y-3 border-b border-current/15 pb-5"
          >
            <div className="flex gap-4">
              {member.photoPreviewUrl ||
              (!member.removePhoto && member.photoUrl) ? (
                // biome-ignore lint/performance/noImgElement: seller images are already delivered as responsive CDN URLs.
                <img
                  src={member.photoPreviewUrl ?? member.photoUrl ?? ""}
                  alt=""
                  className="size-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#222] text-lg font-semibold text-white">
                  {memberInitial(member.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {member.name.trim() || t("unnamedMember")}
                </p>
                <p className="text-sm" style={{ color: mutedColor }}>
                  {member.role.trim() || t("defaultRole")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
                onClick={() => beginEdit(index)}
              >
                <Pencil className="size-4" />
                {t("edit")}
              </button>
              <button
                type="button"
                aria-label={t("removeMember")}
                className="rounded-sm p-1 hover:bg-black/10"
                onClick={() =>
                  updateDraft((current) => {
                    return {
                      ...current,
                      memberBios: current.memberBios.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    };
                  })
                }
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
      <AddRowButton label={t("addMember")} onClick={() => beginEdit("new")} />
      <Dialog
        open={editingIndex !== null}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent
          className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg gap-0 overflow-y-auto rounded-xl bg-[#fffdfa] p-0 text-[#29252d]"
          aria-describedby="shop-member-modal-description"
        >
          <DialogHeader className="border-b border-[#e8e2dc] px-6 py-5">
            <DialogTitle className="text-base font-semibold">
              {t("editShopMemberTitle")}
            </DialogTitle>
            <DialogDescription
              id="shop-member-modal-description"
              className="sr-only"
            >
              {t("memberPhotoHelp")}
            </DialogDescription>
          </DialogHeader>
          {memberDraft ? (
            <div className="space-y-5 px-6 py-6">
              <div className="flex items-center gap-3">
                {memberDraft.photoPreviewUrl ||
                (!memberDraft.removePhoto && memberDraft.photoUrl) ? (
                  // biome-ignore lint/performance/noImgElement: uploaded previews are local blob URLs until saved.
                  <img
                    src={
                      memberDraft.photoPreviewUrl ?? memberDraft.photoUrl ?? ""
                    }
                    alt=""
                    className="size-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#f2eee8] text-[#6f6862]">
                    <UserRound className="size-6" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={choosePhoto}
                  disabled={Boolean(uploadRequestId)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#655c55] px-4 py-2.5 text-sm font-semibold transition hover:bg-[#f2eee8] disabled:opacity-60"
                >
                  <Camera className="size-4" />
                  {uploadRequestId
                    ? t("uploadingMemberPhoto")
                    : t("chooseMemberPhoto")}
                </button>
              </div>
              <p className="-mt-3 pl-[3.75rem] text-xs leading-relaxed text-[#6f6862]">
                {t("memberPhotoHelp")}
              </p>
              <div>
                <label
                  htmlFor={`${id}-member-name`}
                  className="text-xs font-semibold"
                >
                  {t("memberNamePlaceholder")}
                </label>
                <input
                  id={`${id}-member-name`}
                  className={`${fieldClassName()} mt-1`}
                  maxLength={140}
                  value={memberDraft.name}
                  onChange={(event) =>
                    setMemberDraft({ ...memberDraft, name: event.target.value })
                  }
                />
                <p className="mt-1 text-right text-xs text-[#6f6862]">
                  {memberDraft.name.length}/140
                </p>
              </div>
              <div>
                <label
                  htmlFor={`${id}-member-role`}
                  className="text-xs font-semibold"
                >
                  {t("memberRolePlaceholder")}
                </label>
                <input
                  id={`${id}-member-role`}
                  className={`${fieldClassName()} mt-1`}
                  maxLength={100}
                  value={memberDraft.role}
                  onChange={(event) =>
                    setMemberDraft({ ...memberDraft, role: event.target.value })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor={`${id}-member-bio`}
                  className="text-xs font-semibold"
                >
                  {t("memberBioPlaceholder")}
                </label>
                <textarea
                  id={`${id}-member-bio`}
                  className={`${fieldClassName()} mt-1 min-h-28 resize-y`}
                  maxLength={250}
                  rows={4}
                  value={memberDraft.bio}
                  onChange={(event) =>
                    setMemberDraft({ ...memberDraft, bio: event.target.value })
                  }
                />
                <p className="mt-1 text-right text-xs text-[#6f6862]">
                  {memberDraft.bio.length}/250
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-[#e8e2dc] px-6 py-4">
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-full bg-[#f2eee8] px-5 py-3 text-sm font-semibold hover:bg-[#e9e3dc]"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={saveMember}
              disabled={
                !memberDraft?.name.trim() ||
                !memberDraft.bio.trim() ||
                Boolean(uploadRequestId)
              }
              className="rounded-full bg-[#29252d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#403746] disabled:opacity-50"
            >
              {t("save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </SectionRow>
  );
}

export function InlineSellerDetailsSection({
  draft,
  mutedColor,
  editing,
  setEditing,
  updateDraft,
}: {
  draft: ShopContentInlineDraft;
  mutedColor: string;
  editing: boolean;
  setEditing: (value: boolean) => void;
  updateDraft: UpdateDraft;
}) {
  const t = useTranslations("sellers.shopEditorInline");
  const beforeEdit = useRef<{
    sellerDetailsPublic: boolean;
    sellerDetails: ShopContentInlineDraft["sellerDetails"];
  } | null>(null);
  const hasContent =
    draft.sellerDetailsPublic ||
    DETAIL_FIELDS.some(([key]) => Boolean(draft.sellerDetails[key]?.trim()));

  function beginEdit() {
    beforeEdit.current = {
      sellerDetailsPublic: draft.sellerDetailsPublic,
      sellerDetails: { ...draft.sellerDetails },
    };
    setEditing(true);
  }

  function cancelEdit() {
    const original = beforeEdit.current;
    if (original) {
      updateDraft((current) => ({
        ...current,
        sellerDetailsPublic: original.sellerDetailsPublic,
        sellerDetails: { ...original.sellerDetails },
      }));
    }
    setEditing(false);
  }

  return (
    <SectionRow title={t("sellerDetailsTitle")}>
      {!editing && hasContent ? (
        <div className="space-y-2 text-sm">
          {draft.sellerDetailsPublic ? (
            <p className="text-xs font-medium">{t("sellerDetailsPublicOn")}</p>
          ) : null}
          {DETAIL_FIELDS.map(([key, labelKey]) => {
            const value = draft.sellerDetails[key]?.trim();
            if (!value) return null;
            return (
              <p key={key}>
                <span className="font-semibold">{t(labelKey)}: </span>
                {value}
              </p>
            );
          })}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
            onClick={beginEdit}
          >
            <Pencil className="size-4" />
            {t("edit")}
          </button>
        </div>
      ) : null}
      {!editing && !hasContent ? (
        <AddRowButton label={t("addSellerDetails")} onClick={beginEdit} />
      ) : null}
      {editing ? (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed" style={{ color: mutedColor }}>
            {t("sellerDetailsHelp")}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={draft.sellerDetailsPublic}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  sellerDetailsPublic: event.target.checked,
                }))
              }
            />
            {t("sellerDetailsPublic")}
          </label>
          {DETAIL_FIELDS.map(([key, labelKey]) => (
            <div key={key}>
              <label className="text-xs font-semibold">{t(labelKey)}</label>
              <input
                className={`${fieldClassName()} mt-1`}
                value={draft.sellerDetails[key] ?? ""}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    sellerDetails: {
                      ...current.sellerDetails,
                      [key]: event.target.value,
                    },
                  }))
                }
              />
            </div>
          ))}
          <EtsySaveCancel
            onCancel={cancelEdit}
            onSave={() => setEditing(false)}
          />
        </div>
      ) : null}
    </SectionRow>
  );
}
