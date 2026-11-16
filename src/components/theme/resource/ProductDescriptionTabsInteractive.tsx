"use client";

import { Tabs } from "radix-ui";

export function ProductDescriptionTabsInteractive({
  descriptionLabel,
  detailsLabel,
  reviewsLabel,
  descriptionHtml,
  details,
  reviewCount,
}: {
  descriptionLabel: string;
  detailsLabel: string;
  reviewsLabel: string;
  descriptionHtml: string;
  details: string[];
  reviewCount: number;
}) {
  const tabs = [
    { id: "description", label: descriptionLabel },
    { id: "details", label: detailsLabel },
    { id: "reviews", label: `${reviewsLabel} (${reviewCount})` },
  ];

  return (
    <section
      className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      data-theme-product-description-tabs
    >
      <Tabs.Root defaultValue="description">
        <Tabs.List
          aria-label="Product information"
          className="flex flex-wrap gap-2 border-b border-marketplace-border"
        >
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="min-h-11 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-marketplace-muted-foreground hover:text-marketplace-foreground data-[state=active]:border-marketplace-brand data-[state=active]:text-marketplace-foreground"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content
          value="description"
          className="py-5 text-sm text-marketplace-foreground"
        >
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </Tabs.Content>
        <Tabs.Content
          value="details"
          className="py-5 text-sm text-marketplace-foreground"
        >
          {details.length ? (
            <ul className="space-y-2">
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : (
            <p>No additional details.</p>
          )}
        </Tabs.Content>
        <Tabs.Content
          value="reviews"
          className="py-5 text-sm text-marketplace-foreground"
        >
          <a href="#reviews" className="underline">
            Read customer reviews
          </a>
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}
