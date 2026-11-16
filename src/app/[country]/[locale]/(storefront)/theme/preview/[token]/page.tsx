import { SpreeError } from "@spree/sdk";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { CmsPage } from "@/components/cms/types";
import {
  type DraftRenderResult,
  ThemeBuilderLivePage,
} from "@/components/theme/ThemeBuilderLivePage";
import { ThemePageRenderer } from "@/components/theme/ThemePageRenderer";
import {
  isThemePreviewDraft,
  mergeThemeBuilderPreview,
} from "@/components/theme/theme-builder-preview-contract";
import { ThemeSettingsProvider } from "@/contexts/ThemeSettingsContext";
import { getCachedProduct, PRODUCT_PAGE_EXPAND } from "@/lib/data/cached";
import { getCategory } from "@/lib/data/categories";
import { getCollection } from "@/lib/data/collections";
import { resolveCurrency } from "@/lib/data/markets";
import { getMerchandisingPlacementsForPreview } from "@/lib/data/merchandising";
import { getSellerStorefront } from "@/lib/data/sellers";
import { getClient } from "@/lib/spree";
import { editorialStorefrontEnabled } from "@/lib/theme/flags";
import type { ThemeRenderContext } from "@/lib/theme/types";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const instant = false;

interface Props {
  params: Promise<{ country: string; locale: string; token: string }>;
}

type ThemePreviewPayload = {
  theme: Parameters<typeof ThemePageRenderer>[0]["theme"];
  template: Parameters<typeof ThemePageRenderer>[0]["template"] | null;
  editor_origin: string | null;
  resource?: { type: string; id: string; slug?: string } | null;
};

async function getRuntimePreview(
  token: string,
): Promise<ThemePreviewPayload | null> {
  try {
    const response = await getClient().request<{ data: ThemePreviewPayload }>(
      "GET",
      `/theme/previews/${encodeURIComponent(token)}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof SpreeError && error.status === 404) return null;
    throw error;
  }
}

function DraftView({
  theme,
  template,
  context,
}: Pick<
  Parameters<typeof ThemePageRenderer>[0],
  "theme" | "template" | "context"
>) {
  return (
    <ThemeSettingsProvider
      settings={theme.settings}
      editorial={editorialStorefrontEnabled()}
    >
      <ThemePageRenderer
        theme={theme}
        template={template}
        context={context}
        chrome="full"
        editorMode
        livePreview
      />
    </ThemeSettingsProvider>
  );
}

async function resourceContext(
  preview: ThemePreviewPayload,
  base: Pick<ThemeRenderContext, "basePath" | "locale" | "country"> & {
    currency?: string;
  },
): Promise<ThemeRenderContext | null> {
  const resource = preview.resource;
  if (!resource) return null;
  const identifier = resource.slug || resource.id;

  try {
    switch (resource.type) {
      case "Spree::Product":
        return {
          ...base,
          kind: "product",
          product: await getCachedProduct(identifier, PRODUCT_PAGE_EXPAND),
        };
      case "Spree::Collection": {
        const collection = await getCollection(identifier);
        return {
          ...base,
          kind: "collection",
          collectionId: collection.id,
          collectionName: collection.name,
          collectionSlug: collection.permalink,
        };
      }
      case "Spree::Category": {
        const category = await getCategory(identifier);
        return {
          ...base,
          kind: "category",
          categoryId: category.id,
          categoryName: category.name,
          categorySlug: category.permalink,
        };
      }
      case "Spree::Seller": {
        const seller = await getSellerStorefront(identifier);
        return {
          ...base,
          kind: "seller",
          sellerSlug: seller.seller.slug,
          seller,
        };
      }
      case "Spree::CmsPage": {
        const response = await getClient().request<{ data: CmsPage }>(
          "GET",
          `/cms/pages/${encodeURIComponent(identifier)}`,
        );
        const page = response.data;
        return {
          ...base,
          kind: "page",
          pageId: page.id,
          pageSlug: page.slug,
          pageName: page.name,
          page,
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export default async function ThemePreviewRoute({ params }: Props) {
  await connection();
  noStore();
  const { country, locale, token } = await params;
  const basePath = `/${country}/${locale}`;
  const [preview, currency, placements] = await Promise.all([
    getRuntimePreview(token),
    resolveCurrency(country),
    getMerchandisingPlacementsForPreview({ surface: "homepage" }),
  ]);
  if (!preview) notFound();

  const template = preview.template || {
    id: "preview",
    template_type: "home",
    key: "default",
    full_key: "home.default",
    name: "Preview",
    data: { sections: {}, order: [] },
  };
  const base = { basePath, locale, country, currency };
  const context: ThemeRenderContext | null =
    template.template_type === "home"
      ? { ...base, kind: "home", placements }
      : await resourceContext(preview, base);

  const initialView = context ? (
    <DraftView theme={preview.theme} template={template} context={context} />
  ) : (
    <main
      className="mx-auto max-w-2xl px-6 py-24 text-center"
      data-theme-preview-empty
    >
      <h1 className="text-xl font-semibold">
        This template needs a sample item to preview
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Select a product, collection, category, seller or page in the editor.
      </p>
    </main>
  );
  const editorOrigin = preview.editor_origin;
  if (!editorOrigin || !preview.template) return initialView;

  const themeId = preview.theme.id;
  const templateType = template.template_type;
  const templateKey = template.key;
  const resourceType = preview.resource?.type;
  const resourceId = preview.resource?.id;

  async function renderDraft(draft: unknown): Promise<DraftRenderResult> {
    "use server";

    if (!isThemePreviewDraft(draft)) return { status: "invalid" };
    // Recheck the signed Rails preview against the original theme and resource.
    const session = await getRuntimePreview(token);
    if (
      !session ||
      session.theme.id !== themeId ||
      session.editor_origin !== editorOrigin ||
      session.template?.template_type !== templateType ||
      session.template.key !== templateKey ||
      session.resource?.type !== resourceType ||
      session.resource?.id !== resourceId
    ) {
      return { status: "expired" };
    }
    if (!context) return { status: "rendered", content: initialView };

    const { theme, template, groups } = mergeThemeBuilderPreview(
      session.theme,
      session.template,
      draft,
    );
    return {
      status: "rendered",
      content: (
        <DraftView
          theme={{
            ...theme,
            section_groups: { ...theme.section_groups, ...groups },
          }}
          template={template}
          context={context}
        />
      ),
    };
  }

  const clientPreviewBridge = template.template_type === "home";

  return (
    <ThemeBuilderLivePage
      editorOrigin={editorOrigin}
      themeId={themeId}
      templateType={templateType}
      templateKey={templateKey}
      renderDraftAction={renderDraft}
      baseTheme={preview.theme}
      baseTemplate={template}
      clientPreviewBridge={clientPreviewBridge}
    >
      {initialView}
    </ThemeBuilderLivePage>
  );
}
