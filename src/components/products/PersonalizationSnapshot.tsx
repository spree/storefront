"use client";

import type { ProductPersonalizationField } from "@spree/sdk";
import { useTranslations } from "next-intl";
import {
  formatPersonalizationSnapshot,
  type SnapshotEntry,
} from "@/lib/personalization";
import { cn } from "@/lib/utils";

export type PersonalizationFileRef = {
  id: string;
  url: string;
  filename: string;
  content_type?: string;
};

type Props = {
  snapshot: Array<Record<string, unknown>> | null | undefined;
  proofRequired?: boolean;
  className?: string;
  /** Compact density for cart drawer / checkout summary. */
  compact?: boolean;
  proofNoticeVariant?: "default" | "quiet";
  title?: string;
  /** Authorized private file refs from the line item serializer. */
  files?: PersonalizationFileRef[] | null;
};

function SnapshotRows({
  entries,
  yesLabel,
  noLabel,
  compact,
  files,
}: {
  entries: SnapshotEntry[];
  yesLabel: string;
  noLabel: string;
  compact?: boolean;
  files?: PersonalizationFileRef[] | null;
}) {
  if (entries.length === 0 && !files?.length) return null;

  return (
    <dl className={cn("space-y-1", compact ? "mt-1" : "mt-2")}>
      {entries.map((entry) => {
        let display = entry.value;
        if (entry.value === "true") display = yesLabel;
        if (entry.value === "false") display = noLabel;

        const matchedFiles =
          entry.attachmentIds?.length && files?.length
            ? files.filter((file) =>
                entry.attachmentIds?.some(
                  (signedId) =>
                    file.id === signedId ||
                    file.url.includes(signedId) ||
                    file.filename
                      .toLowerCase()
                      .includes(signedId.toLowerCase()),
                ),
              )
            : [];
        const filesForEntry =
          matchedFiles.length > 0
            ? matchedFiles
            : entry.attachmentIds?.length && files?.length
              ? files
              : [];

        return (
          <div
            key={`${entry.label}-${display}`}
            className={cn(
              "grid gap-x-2",
              compact
                ? "grid-cols-[auto_1fr] text-xs"
                : "grid-cols-[minmax(0,8rem)_1fr] text-sm",
            )}
          >
            <dt className="text-gray-500 shrink-0">{entry.label}</dt>
            <dd className="text-gray-900 min-w-0 break-words">
              {filesForEntry.length > 0 ? (
                <ul className="space-y-1">
                  {filesForEntry.map((file) => (
                    <li key={file.id}>
                      <a
                        href={file.url}
                        className="underline underline-offset-2"
                        rel="noopener noreferrer"
                      >
                        {file.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                display
              )}
            </dd>
          </div>
        );
      })}
      {files?.length && entries.every((e) => !e.attachmentIds?.length) ? (
        <div
          className={cn(
            "grid gap-x-2",
            compact
              ? "grid-cols-[auto_1fr] text-xs"
              : "grid-cols-[minmax(0,8rem)_1fr] text-sm",
          )}
        >
          <dt className="text-gray-500 shrink-0">Files</dt>
          <dd className="min-w-0 break-words">
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.id}>
                  <a
                    href={file.url}
                    className="underline underline-offset-2"
                    rel="noopener noreferrer"
                  >
                    {file.filename}
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

export function PersonalizationSnapshot({
  snapshot,
  proofRequired,
  className,
  compact,
  proofNoticeVariant = "default",
  title,
  files,
}: Props) {
  const t = useTranslations("personalization");
  const entries = formatPersonalizationSnapshot(snapshot);

  if (entries.length === 0 && !proofRequired && !files?.length) return null;

  return (
    <div className={cn(compact ? "mt-1" : "mt-2", className)}>
      {!compact && (
        <p className="text-sm font-medium text-gray-900">
          {title ?? t("title")}
        </p>
      )}
      {compact && (entries.length > 0 || !!files?.length) && (
        <p className="text-xs font-medium text-gray-600">
          {title ?? t("title")}
        </p>
      )}
      <SnapshotRows
        entries={entries}
        yesLabel={t("yes")}
        noLabel={t("no")}
        compact={compact}
        files={files}
      />
      {proofRequired ? (
        proofNoticeVariant === "quiet" ? (
          <p className="mt-1 inline-block w-fit max-w-[16rem] rounded-md bg-amber-50/70 px-2 py-1 text-[11px] leading-4 text-amber-800/90">
            {t("proofRequiredShort")}
          </p>
        ) : (
          <p
            className={cn(
              "text-amber-800 bg-amber-50 border border-amber-100 rounded-md",
              compact ? "mt-1 px-2 py-1 text-xs" : "mt-2 px-3 py-2 text-sm",
            )}
          >
            {t("proofRequiredShort")}
          </p>
        )
      ) : null}
    </div>
  );
}

/** Seller/admin-facing helper when the host already localized the heading. */
export function personalizationSnapshotEntries(
  snapshot: Array<Record<string, unknown>> | null | undefined,
): SnapshotEntry[] {
  return formatPersonalizationSnapshot(snapshot);
}

export function fieldHasChoices(field: ProductPersonalizationField): boolean {
  return (field.choices?.length ?? 0) > 0;
}
