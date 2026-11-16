import type { CmsTheme, ThemeTemplateDocument } from "@spree/sdk";
import { ThemeTemplateRenderer } from "@/components/theme/ThemeTemplateRenderer";
import type { ThemeRenderContext } from "@/lib/theme/types";

export async function ThemeSectionGroupRenderer({
  data,
  context,
  theme,
  groupKey,
  editorMode = false,
  livePreview = false,
}: {
  data: ThemeTemplateDocument;
  context: ThemeRenderContext;
  theme?: CmsTheme | null;
  groupKey: "header" | "footer";
  editorMode?: boolean;
  livePreview?: boolean;
}) {
  if (!data?.order?.length) return null;

  return (
    <div data-theme-section-group={editorMode ? groupKey : undefined}>
      <ThemeTemplateRenderer
        data={data}
        context={context}
        theme={theme}
        editorMode={editorMode}
        livePreview={livePreview}
      />
    </div>
  );
}
