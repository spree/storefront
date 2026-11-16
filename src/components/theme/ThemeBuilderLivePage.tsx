"use client";

import type {
  CmsTheme,
  ThemeBuilderActionMessage,
  ThemeBuilderPreviewMessage,
  ThemeBuilderReadyMessage,
  ThemeBuilderSelectMessage,
  ThemeTemplatePayload,
} from "@spree/sdk";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ThemeBuilderPreviewBridge } from "./ThemeBuilderPreviewBridge";
import styles from "./theme-builder-live-page.module.css";
import {
  isTrustedThemeBuilderMessage,
  type ThemePreviewDraft,
} from "./theme-builder-preview-contract";

type PreviewPayload = ThemeBuilderPreviewMessage["payload"];
type PreviewAction = ThemeBuilderActionMessage["payload"]["action"];
export type DraftRenderResult =
  | { status: "rendered"; content: ReactNode }
  | { status: "expired" | "invalid" };

export function ThemeBuilderLivePage({
  children,
  editorOrigin,
  themeId,
  templateType,
  templateKey,
  renderDraftAction,
  baseTheme,
  baseTemplate,
  clientPreviewBridge = false,
}: {
  children: ReactNode;
  editorOrigin: string;
  themeId: string;
  templateType: string;
  templateKey: string;
  renderDraftAction: (draft: ThemePreviewDraft) => Promise<DraftRenderResult>;
  baseTheme?: CmsTheme;
  baseTemplate?: ThemeTemplatePayload;
  clientPreviewBridge?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(children);
  const [receivedDraft, setReceivedDraft] = useState(false);
  const [appliedDraft, setAppliedDraft] = useState<PreviewPayload | null>(null);
  const previewSession = useRef<string | null>(null);
  const [mode, setMode] = useState<PreviewPayload["mode"]>("interact");
  const [selection, setSelection] = useState<PreviewPayload["selection"]>(null);
  const [selectedNode, setSelectedNode] = useState<HTMLElement | null>(null);
  const [failed, setFailed] = useState(false);
  const retry = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (window.parent === window) return;
    const sessionId = crypto.randomUUID();
    previewSession.current = sessionId;
    let receivedSequence = 0;
    let active = true;
    let timer: number | undefined;
    let inFlight = false;
    let renderedKey: string | undefined;
    let pending:
      | { draft: ThemePreviewDraft; key: string; payload: PreviewPayload }
      | undefined;

    const renderPending = async () => {
      if (!pending || inFlight || pending.key === renderedKey) return;
      const request = pending;
      inFlight = true;
      setFailed(false);
      try {
        const result = await renderDraftAction(request.draft);
        if (!active || pending.key !== request.key) return;
        if (result.status === "rendered") {
          renderedKey = request.key;
          setView(result.content);
          setReceivedDraft(true);
          setAppliedDraft(pending.payload);
        } else if (result.status === "expired") {
          window.parent.postMessage(
            { type: "THEME_BUILDER_REFRESH_PREVIEW" },
            editorOrigin,
          );
          setFailed(true);
        } else {
          setFailed(true);
        }
      } catch {
        if (active && pending?.key === request.key) setFailed(true);
      } finally {
        inFlight = false;
        if (active && pending?.key !== request.key) schedule();
      }
    };

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void renderPending(), 90);
    }

    const receive = (event: MessageEvent) => {
      if (
        !isTrustedThemeBuilderMessage(
          event,
          editorOrigin,
          window.parent,
          themeId,
          templateType,
          templateKey,
          clientPreviewBridge ? undefined : sessionId,
        )
      )
        return;
      if (
        !clientPreviewBridge &&
        (event.data.payload.sequence || 0) <= receivedSequence
      )
        return;
      receivedSequence = event.data.payload.sequence || 0;
      const { mode, selection, settings, template, sectionGroups } =
        event.data.payload;
      const draft = { settings, template, sectionGroups };
      const key = JSON.stringify(draft);
      setMode(mode);
      if (clientPreviewBridge) return;
      setSelection(selection);
      const samePending = pending?.key === key;
      pending = { draft, key, payload: event.data.payload };
      if (key === renderedKey) {
        setFailed(false);
        setAppliedDraft(event.data.payload);
      } else if (samePending) return;
      else schedule();
    };

    retry.current = schedule;
    const leaving = () => {
      if (!clientPreviewBridge)
        window.parent.postMessage(
          {
            type: "THEME_BUILDER_LEAVING",
            payload: { themeId, templateType, templateKey, sessionId },
          },
          editorOrigin,
        );
    };
    window.addEventListener("message", receive);
    window.addEventListener("pagehide", leaving);
    if (!clientPreviewBridge)
      window.parent.postMessage(
        {
          type: "THEME_BUILDER_READY",
          payload: { themeId, templateType, templateKey, sessionId },
        } satisfies ThemeBuilderReadyMessage,
        editorOrigin,
      );
    return () => {
      active = false;
      retry.current = null;
      window.clearTimeout(timer);
      window.removeEventListener("message", receive);
      window.removeEventListener("pagehide", leaving);
      leaving();
    };
  }, [
    clientPreviewBridge,
    editorOrigin,
    renderDraftAction,
    templateKey,
    templateType,
    themeId,
  ]);

  useLayoutEffect(() => {
    if (clientPreviewBridge) return;
    const state = receivedDraft ? "updated" : "listening";
    root.current
      ?.querySelectorAll<HTMLElement>("[data-theme-id]")
      .forEach((node) => {
        node.dataset.themeBuilderBridge = state;
        if (appliedDraft) {
          node.dataset.themeBuilderSession = previewSession.current || "";
          node.dataset.themeBuilderSequence = String(appliedDraft.sequence);
        }
      });
    if (appliedDraft)
      window.parent.postMessage(
        {
          type: "THEME_BUILDER_APPLIED",
          payload: {
            themeId,
            templateType,
            templateKey,
            sessionId: previewSession.current,
            sequence: appliedDraft.sequence,
            revision: appliedDraft.revision,
            persistedRevision: appliedDraft.persistedRevision,
          },
        },
        editorOrigin,
      );
  }, [
    appliedDraft,
    clientPreviewBridge,
    editorOrigin,
    receivedDraft,
    templateKey,
    templateType,
    themeId,
  ]);

  const sectionId = selection?.sectionId;
  const blockId = selection?.blockId;
  // The server response may replace the selected element while keeping its ID.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebind the inspector to the committed view
  useLayoutEffect(() => {
    if (clientPreviewBridge || mode !== "select" || !sectionId) {
      setSelectedNode(null);
      return;
    }
    const node = root.current?.querySelector<HTMLElement>(
      `[data-theme-section-id="${CSS.escape(sectionId)}"]`,
    );
    const block =
      blockId &&
      node?.querySelector<HTMLElement>(
        `[data-theme-block-id="${CSS.escape(blockId)}"]`,
      );
    setSelectedNode(node ?? null);
    node?.setAttribute("data-preview-selected", "true");
    if (block) block.setAttribute("data-preview-selected", "true");
    return () => {
      node?.removeAttribute("data-preview-selected");
      if (block) block.removeAttribute("data-preview-selected");
    };
  }, [blockId, clientPreviewBridge, mode, sectionId, view]);

  function sendAction(action: PreviewAction, id: string) {
    window.parent.postMessage(
      {
        type: "THEME_BUILDER_ACTION",
        payload: {
          action,
          sectionId: id,
          sessionId: previewSession.current || undefined,
        },
      } satisfies ThemeBuilderActionMessage,
      editorOrigin,
    );
  }

  function inspectClick(event: MouseEvent<HTMLDivElement>) {
    if (clientPreviewBridge) return;
    const target = event.target;
    if (
      mode !== "select" ||
      !(target instanceof Element) ||
      target.closest("[data-theme-builder-toolbar], [data-theme-builder-error]")
    )
      return;
    const section = target.closest<HTMLElement>(
      "[data-theme-section-id], [data-theme-hidden-section-id]",
    );
    const id = section?.dataset.themeSectionId;
    const hiddenId = section?.dataset.themeHiddenSectionId;
    if (!section && !target.closest("a, button, input, select, textarea"))
      return;
    event.preventDefault();
    event.stopPropagation();
    if (hiddenId) sendAction("show", hiddenId);
    if (!id) return;
    const block = target.closest<HTMLElement>("[data-theme-block-id]");
    const blockId =
      block?.closest("[data-theme-section-id]") === section
        ? block?.dataset.themeBlockId
        : undefined;
    window.parent.postMessage(
      {
        type: "THEME_BUILDER_SELECT",
        payload: blockId
          ? {
              entity: "block",
              id: blockId,
              sectionId: id,
              blockId,
              sessionId: previewSession.current || undefined,
            }
          : {
              entity: "section",
              id,
              sectionId: id,
              sessionId: previewSession.current || undefined,
            },
      } satisfies ThemeBuilderSelectMessage,
      editorOrigin,
    );
  }

  const actions: PreviewAction[] = [
    "add_before",
    "add_after",
    "duplicate",
    "hide",
    "delete",
    "move_up",
    "move_down",
  ];

  const bridgeState = receivedDraft ? "updated" : "listening";

  return (
    <div
      ref={root}
      className={styles.preview}
      data-preview-inspect={mode === "select"}
      {...(clientPreviewBridge
        ? {}
        : { "data-theme-builder-bridge": bridgeState })}
      onClickCapture={inspectClick}
      onAuxClickCapture={inspectClick}
      onSubmitCapture={(event) => {
        if (mode === "select") event.preventDefault();
      }}
    >
      {failed && (
        <div className={styles.error} data-theme-builder-error role="alert">
          The preview could not update. Your edits are still in the editor.
          <button type="button" onClick={() => retry.current?.()}>
            Retry
          </button>
        </div>
      )}
      {view}
      {clientPreviewBridge && baseTheme && baseTemplate ? (
        <ThemeBuilderPreviewBridge
          editorOrigin={editorOrigin}
          themeId={themeId}
          templateType={templateType}
          templateKey={templateKey}
          baseTheme={baseTheme}
          baseTemplate={baseTemplate}
          previewRoot={root}
        />
      ) : null}
      {!clientPreviewBridge &&
        mode === "select" &&
        selectedNode &&
        sectionId &&
        createPortal(
          <fieldset className={styles.toolbar} data-theme-builder-toolbar>
            <legend className="sr-only">Section actions</legend>
            {actions
              .filter(
                (action) =>
                  action !== "delete" ||
                  selectedNode.dataset.themeSectionType !== "theme_header",
              )
              .map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => sendAction(action, sectionId)}
                >
                  {action.replaceAll("_", " ")}
                </button>
              ))}
          </fieldset>,
          selectedNode,
        )}
    </div>
  );
}
