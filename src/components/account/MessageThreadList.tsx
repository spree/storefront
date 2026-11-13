"use client";

import type { MessageThread } from "@spree/sdk";
import { Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EmptyStateIllustration } from "@/components/empty-states/EmptyStateIllustration";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/format";

interface MessageThreadListProps {
  threads: MessageThread[];
  basePath: string;
  locale: string;
}

export function MessageThreadList({
  threads: threadsProp,
  basePath,
  locale,
}: MessageThreadListProps) {
  const t = useTranslations("messages");
  const threads = Array.isArray(threadsProp) ? threadsProp : [];
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unreadCount = threads.filter((thread) => thread.unread).length;
  const filteredThreads = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);

    return threads.filter((thread) => {
      if (unreadOnly && !thread.unread) return false;
      if (!normalizedQuery) return true;

      return [
        thread.seller_name,
        thread.last_message_product_name,
        thread.last_message_preview,
      ].some(
        (value) =>
          typeof value === "string" &&
          value.toLocaleLowerCase(locale).includes(normalizedQuery),
      );
    });
  }, [locale, query, threads, unreadOnly]);

  if (threads.length === 0) {
    return (
      <div className="rounded-[var(--marketplace-radius-md)] border border-marketplace-border-subtle bg-marketplace-surface px-6 py-10 text-center sm:px-10 sm:py-12">
        <EmptyStateIllustration
          name="no-messages-yet"
          className="mx-auto mb-4 text-marketplace-muted-foreground"
        />
        <h3 className="mb-2 text-lg font-semibold text-marketplace-foreground">
          {t("emptyTitle")}
        </h3>
        <p className="mx-auto max-w-md text-sm text-marketplace-muted-foreground">
          {t("emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-marketplace-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="h-10 rounded-[var(--marketplace-radius-sm)] pl-9"
          />
        </label>
        <fieldset
          className="m-0 flex min-w-0 shrink-0 items-center gap-1 rounded-[var(--marketplace-radius-md)] border border-marketplace-border-subtle bg-marketplace-surface p-1"
          aria-label={t("inboxFilters")}
        >
          <button
            type="button"
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-[var(--marketplace-radius-sm)] px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand",
              !unreadOnly
                ? "bg-marketplace-brand text-marketplace-brand-foreground"
                : "text-marketplace-muted-foreground hover:bg-marketplace-muted hover:text-marketplace-foreground",
            )}
          >
            {t("allFilter")}
            <span className="text-xs opacity-75">{threads.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(true)}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-[var(--marketplace-radius-sm)] px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand",
              unreadOnly
                ? "bg-marketplace-brand text-marketplace-brand-foreground"
                : "text-marketplace-muted-foreground hover:bg-marketplace-muted hover:text-marketplace-foreground",
            )}
          >
            {t("unreadFilter")}
            <span className="text-xs opacity-75">{unreadCount}</span>
          </button>
        </fieldset>
      </div>

      {filteredThreads.length === 0 ? (
        <div className="rounded-[var(--marketplace-radius-md)] border border-marketplace-border-subtle bg-marketplace-surface px-6 py-10 text-center">
          <p className="text-sm text-marketplace-muted-foreground">
            {unreadOnly && !query.trim()
              ? t("noUnreadMessages")
              : t("noSearchResults")}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[var(--marketplace-radius-md)] border border-marketplace-border-subtle bg-marketplace-surface divide-y divide-marketplace-border-subtle">
          {filteredThreads.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`${basePath}/account/messages/${thread.id}`}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-marketplace-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marketplace-brand sm:gap-4 sm:px-5",
                  thread.unread && "bg-marketplace-surface-warm/40",
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full bg-marketplace-muted text-sm font-semibold text-marketplace-foreground"
                >
                  {(thread.seller_name || t("sellerFallback")).slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-baseline justify-between gap-3">
                    <span
                      className={cn(
                        "truncate text-sm text-marketplace-foreground",
                        thread.unread ? "font-semibold" : "font-medium",
                      )}
                    >
                      {thread.seller_name || t("sellerFallback")}
                    </span>
                    <time
                      dateTime={thread.updated_at}
                      className="shrink-0 text-xs text-marketplace-muted-foreground"
                    >
                      {formatDateTime(thread.updated_at, locale)}
                    </time>
                  </span>
                  {typeof thread.last_message_product_name === "string" ? (
                    <span className="mt-0.5 block truncate text-xs text-marketplace-muted-foreground">
                      {thread.last_message_product_name}
                    </span>
                  ) : null}
                  <span className="mt-1 block truncate text-sm text-marketplace-muted-foreground">
                    {thread.last_message_preview || t("noPreview")}
                  </span>
                </span>
                {thread.unread ? (
                  <span className="size-2.5 rounded-full bg-marketplace-sale">
                    <span className="sr-only">{t("unread")}</span>
                  </span>
                ) : (
                  <span aria-hidden="true" className="size-2.5" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
