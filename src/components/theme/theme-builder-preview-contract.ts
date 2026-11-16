import type {
  CmsTheme,
  ThemeBuilderPreviewMessage,
  ThemeTemplateDocument,
  ThemeTemplatePayload,
} from "@spree/sdk";

type PreviewPayload = ThemeBuilderPreviewMessage["payload"];

export type ThemePreviewDraft = Pick<
  PreviewPayload,
  "settings" | "template" | "sectionGroups"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDocument(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.order) &&
    value.order.every((id: unknown) => typeof id === "string") &&
    isRecord(value.sections) &&
    Object.values(value.sections).every(
      (section) =>
        isRecord(section) &&
        typeof section.type === "string" &&
        (section.settings === undefined || isRecord(section.settings)) &&
        (section.blocks === undefined || isRecord(section.blocks)) &&
        (section.block_order === undefined ||
          (Array.isArray(section.block_order) &&
            section.block_order.every(
              (id: unknown) => typeof id === "string",
            ))),
    )
  );
}

export function isThemePreviewDraft(
  value: unknown,
): value is ThemePreviewDraft {
  return (
    isRecord(value) &&
    isRecord(value.settings) &&
    isDocument(value.template) &&
    isRecord(value.sectionGroups) &&
    isDocument(value.sectionGroups.header) &&
    isDocument(value.sectionGroups.footer)
  );
}

export function isTrustedThemeBuilderMessage(
  event: Pick<MessageEvent, "origin" | "source" | "data">,
  editorOrigin: string | null,
  parent: Window,
  themeId: string,
  templateType: string,
  templateKey: string,
  sessionId?: string,
): event is MessageEvent<ThemeBuilderPreviewMessage> {
  const data = event.data;
  const payload = data?.payload;
  return (
    !!editorOrigin &&
    event.origin === editorOrigin &&
    event.source === parent &&
    data?.type === "THEME_BUILDER_PREVIEW" &&
    !!payload &&
    typeof payload === "object" &&
    payload.themeId === themeId &&
    payload.templateType === templateType &&
    payload.templateKey === templateKey &&
    (!sessionId ||
      (payload.sessionId === sessionId &&
        Number.isSafeInteger(payload.sequence) &&
        payload.sequence > 0)) &&
    isThemePreviewDraft(payload)
  );
}

export function mergeThemeBuilderPreview(
  theme: CmsTheme,
  template: ThemeTemplatePayload,
  payload: ThemePreviewDraft,
): {
  theme: CmsTheme;
  template: ThemeTemplatePayload;
  groups: { header: ThemeTemplateDocument; footer: ThemeTemplateDocument };
} {
  return {
    theme: {
      ...theme,
      settings: {
        ...theme.settings,
        ...payload.settings,
        colors: { ...theme.settings.colors, ...payload.settings.colors },
        shape: { ...theme.settings.shape, ...payload.settings.shape },
        layout: { ...theme.settings.layout, ...payload.settings.layout },
      },
    },
    template: { ...template, data: structuredClone(payload.template) },
    groups: {
      header: structuredClone(payload.sectionGroups.header),
      footer: structuredClone(payload.sectionGroups.footer),
    },
  };
}
