import type { ThemeBuilderPreviewMessage } from "@spree/sdk";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ThemeBuilderLivePage } from "./ThemeBuilderLivePage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("updates a contextual draft in place and reuses the render after autosave", async () => {
  vi.useFakeTimers();
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const parent = iframe.contentWindow!;
  const postMessage = vi
    .spyOn(parent, "postMessage")
    .mockImplementation(() => {});
  vi.stubGlobal("parent", parent);
  const origin = "http://localhost:5296";
  const renderDraft = vi.fn(async () => ({
    status: "rendered" as const,
    content: <h1>Updated product draft</h1>,
  }));
  const { container, unmount } = render(
    <ThemeBuilderLivePage
      editorOrigin={origin}
      themeId="theme_test"
      templateType="product"
      templateKey="default"
      renderDraftAction={renderDraft}
    >
      <h1>Saved product template</h1>
    </ThemeBuilderLivePage>,
  );
  const frame = container.firstElementChild;
  const sessionId = postMessage.mock.calls.find(
    ([message]) => message.type === "THEME_BUILDER_READY",
  )?.[0].payload.sessionId;
  const emptyDocument = { sections: {}, order: [] };
  const draft: ThemeBuilderPreviewMessage = {
    type: "THEME_BUILDER_PREVIEW",
    payload: {
      themeId: "theme_test",
      templateType: "product",
      templateKey: "default",
      template: emptyDocument,
      sectionGroups: { header: emptyDocument, footer: emptyDocument },
      settings: { layout: { page_width: "wide" } },
      selection: null,
      mode: "select",
      revision: 1,
      persistedRevision: 0,
      sessionId,
      sequence: 1,
    },
  };
  const send = async (
    data: ThemeBuilderPreviewMessage,
    senderOrigin: string,
  ) => {
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: parent,
          origin: senderOrigin,
          data,
        }),
      );
      await vi.advanceTimersByTimeAsync(100);
    });
  };

  try {
    await send(draft, "http://localhost:5299");
    expect(renderDraft).not.toHaveBeenCalled();
    await send(draft, origin);
    expect(
      screen.getByRole("heading", { name: "Updated product draft" }),
    ).toBeVisible();
    expect(container.firstElementChild).toBe(frame);
    await send(
      {
        ...draft,
        payload: { ...draft.payload, persistedRevision: 1, sequence: 2 },
      },
      origin,
    );
    expect(renderDraft).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([
      "THEME_BUILDER_READY",
      "THEME_BUILDER_APPLIED",
      "THEME_BUILDER_APPLIED",
    ]);
    await send(
      {
        ...draft,
        payload: { ...draft.payload, sessionId: "old-session", sequence: 3 },
      },
      origin,
    );
    await send(draft, origin);
    expect(renderDraft).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls.at(-1)?.[0].payload.sequence).toBe(2);
  } finally {
    unmount();
    postMessage.mockRestore();
    iframe.remove();
  }
});
