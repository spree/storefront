"use client";

import type { LineItem } from "@spree/sdk";
import { MessageCircle, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ButtonHTMLAttributes, useState } from "react";
import { CartEditItemSheet } from "@/components/cart/CartEditItemSheet";
import { QuantityPickerField } from "@/components/cart/QuantityPickerField";
import { PrePurchaseMessageComposer } from "@/components/messages/PrePurchaseMessageComposer";
import {
  type PersonalizationFileRef,
  PersonalizationSnapshot,
} from "@/components/products/PersonalizationSnapshot";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductImage } from "@/components/ui/product-image";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { buildAccountLoginHref } from "@/lib/utils/account-redirect";
import { groupLineItemsBySeller } from "@/lib/utils/group-line-items-by-seller";

interface CartLineItemsProps {
  items: LineItem[];
  basePath: string;
  updating?: boolean;
  compact?: boolean;
  customerNote?: string | null;
  shippingFree?: boolean;
  shippingAmount?: string | null;
  shippingPending?: boolean;
  onClose?: () => void;
  onRemove: (item: LineItem) => void | Promise<void>;
  onSaveForLater?: (item: LineItem) => void | Promise<void>;
  onUpdateQuantity: (itemId: string, quantity: number) => void | Promise<void>;
  onSaveCustomerNote?: (
    note: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

function sellerLogoUrl(item: LineItem): string | null {
  const seller = item.seller;
  if (!seller) return null;
  return seller.square_logo_url?.trim() || seller.logo_url?.trim() || null;
}

function optionPills(optionsText: string | null | undefined): string[] {
  if (!optionsText?.trim()) return [];
  return optionsText
    .split(/\s*(?:\/|,|;|\|)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function ActionLink({
  children,
  onClick,
  disabled,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-sm font-medium text-marketplace-foreground underline-offset-2 transition-colors duration-150 ease-out hover:underline disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CartLineItems({
  items,
  basePath,
  updating = false,
  compact = false,
  customerNote = null,
  shippingFree = false,
  shippingAmount = null,
  shippingPending = false,
  onClose,
  onRemove,
  onSaveForLater,
  onUpdateQuantity,
  onSaveCustomerNote,
}: CartLineItemsProps) {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const tMessages = useTranslations("messages");
  const { isAuthenticated } = useAuth();
  const { refreshCart } = useCart();
  const groups = groupLineItemsBySeller(items, t("marketplaceSeller"));
  const [contactSellerSlug, setContactSellerSlug] = useState<string | null>(
    null,
  );
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(customerNote ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const openNoteDialog = () => {
    setNoteDraft(customerNote ?? "");
    setNoteError(null);
    setNoteOpen(true);
  };

  const saveNote = async () => {
    if (!onSaveCustomerNote) return;
    setNoteSaving(true);
    setNoteError(null);
    try {
      const result = await onSaveCustomerNote(noteDraft.trim());
      if (!result.success) {
        setNoteError(result.error || t("orderNoteFailed"));
        return;
      }
      setNoteOpen(false);
    } finally {
      setNoteSaving(false);
    }
  };

  if (compact) {
    return (
      <CompactCartLineItems
        groups={groups}
        basePath={basePath}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group, groupIndex) => {
        const logo = sellerLogoUrl(group.items[0]);
        const showMenu = Boolean(group.sellerSlug || onSaveCustomerNote);
        const showShippingFooter = groupIndex === 0;

        return (
          <section
            key={group.key}
            data-theme-cart-seller-group
            className="overflow-hidden rounded-xl border border-marketplace-border bg-marketplace-surface"
          >
            <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                {logo ? (
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-marketplace-surface-warm ring-1 ring-marketplace-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="" className="size-full object-cover" />
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marketplace-surface-warm text-xs font-semibold text-marketplace-muted-foreground ring-1 ring-marketplace-border"
                  >
                    {group.sellerName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <h2 className="truncate text-[15px] font-bold text-marketplace-foreground">
                  {group.sellerSlug ? (
                    <Link
                      href={`${basePath}/sellers/${group.sellerSlug}`}
                      className="hover:underline"
                      onClick={onClose}
                    >
                      {group.sellerName}
                    </Link>
                  ) : (
                    group.sellerName
                  )}
                </h2>
              </div>

              {showMenu ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 rounded-full text-marketplace-muted-foreground hover:bg-marketplace-surface-warm hover:text-marketplace-foreground"
                      aria-label={t("shopActions")}
                    >
                      <MoreHorizontal className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {group.sellerSlug ? (
                      isAuthenticated ? (
                        <DropdownMenuItem
                          onSelect={() =>
                            setContactSellerSlug(group.sellerSlug)
                          }
                        >
                          <MessageCircle className="size-4" aria-hidden />
                          {t("contactShop")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem asChild>
                          <Link href={buildAccountLoginHref(basePath)}>
                            <MessageCircle className="size-4" aria-hidden />
                            {t("contactShop")}
                          </Link>
                        </DropdownMenuItem>
                      )
                    ) : null}
                    {onSaveCustomerNote ? (
                      <DropdownMenuItem onSelect={openNoteDialog}>
                        <Plus className="size-4" aria-hidden />
                        {customerNote?.trim()
                          ? t("editOrderNote")
                          : t("addOrderNote")}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </header>

            <ul className="border-t border-marketplace-border">
              {group.items.map((item) => {
                const lineItem = item as LineItem & {
                  personalization_snapshot?: Array<
                    Record<string, unknown>
                  > | null;
                  proof_required?: boolean;
                  personalization_files?: unknown;
                };
                const onSale =
                  !!item.compare_at_amount &&
                  item.price != null &&
                  parseFloat(item.compare_at_amount) > parseFloat(item.price);
                const pills = optionPills(item.options_text);

                return (
                  <li
                    key={item.id}
                    className="border-b border-marketplace-border px-4 py-5 last:border-b-0 sm:px-5"
                    data-theme-cart-line-item
                  >
                    <div className="flex gap-4 sm:gap-5">
                      <Link
                        href={`${basePath}/products/${item.slug}`}
                        className="relative size-[6.75rem] shrink-0 overflow-hidden rounded-lg bg-marketplace-surface-warm sm:size-[7.5rem]"
                        onClick={onClose}
                      >
                        <ProductImage
                          src={item.thumbnail_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <Link
                            href={`${basePath}/products/${item.slug}`}
                            className="min-w-0 text-[15px] leading-snug text-marketplace-foreground hover:underline"
                            onClick={onClose}
                          >
                            {item.name}
                          </Link>
                          <div className="shrink-0 text-right text-[15px] font-bold tabular-nums text-marketplace-foreground">
                            {onSale ? (
                              <span className="flex flex-col items-end gap-0.5">
                                <span className="text-marketplace-sale">
                                  {item.display_price}
                                </span>
                                <span className="text-xs font-medium text-marketplace-muted-foreground line-through">
                                  {item.display_compare_at_amount}
                                </span>
                              </span>
                            ) : (
                              item.display_price
                            )}
                          </div>
                        </div>

                        {pills.length > 0 ? (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {pills.map((pill) => (
                              <span
                                key={pill}
                                className="inline-flex max-w-full truncate rounded-full bg-marketplace-surface-subtle px-2.5 py-1 text-xs text-marketplace-foreground"
                              >
                                {pill}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <PersonalizationSnapshot
                          snapshot={lineItem.personalization_snapshot}
                          proofRequired={lineItem.proof_required}
                          files={
                            lineItem.personalization_files as
                              | PersonalizationFileRef[]
                              | null
                              | undefined
                          }
                          compact
                          className="mt-2"
                        />

                        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="w-[3.75rem]">
                            <QuantityPickerField
                              quantity={item.quantity}
                              onQuantityChange={(quantity) =>
                                onUpdateQuantity(item.id, quantity)
                              }
                              disabled={updating}
                              variant="dropdown"
                              className="h-9 w-full rounded-md border border-marketplace-border bg-marketplace-surface px-2 text-sm text-marketplace-foreground focus:border-marketplace-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <ActionLink
                            onClick={() => setEditingItem(item)}
                            disabled={updating}
                          >
                            {tc("edit")}
                          </ActionLink>
                          {onSaveForLater ? (
                            <ActionLink
                              onClick={() => onSaveForLater(item)}
                              disabled={updating}
                            >
                              {t("saveForLater")}
                            </ActionLink>
                          ) : null}
                          <ActionLink
                            onClick={() => onRemove(item)}
                            disabled={updating}
                            aria-label={t("removeItemLabel", {
                              name: item.name,
                            })}
                          >
                            {tc("remove")}
                          </ActionLink>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {showShippingFooter ? (
              <div className="border-t border-marketplace-border px-4 py-3.5 text-sm sm:px-5">
                <span className="font-bold text-marketplace-foreground">
                  {tc("shipping")}:
                </span>{" "}
                {shippingPending ? (
                  <span className="text-marketplace-muted-foreground">
                    {t("shippingEstimateLoading")}
                  </span>
                ) : shippingFree ? (
                  <span className="font-bold text-emerald-600">
                    {t("shippingFree")}
                  </span>
                ) : shippingAmount ? (
                  <span className="font-medium text-marketplace-foreground">
                    {shippingAmount}
                  </span>
                ) : (
                  <span className="text-marketplace-muted-foreground">
                    {t("shippingCalculatedAtCheckout")}
                  </span>
                )}
              </div>
            ) : null}
          </section>
        );
      })}

      {contactSellerSlug ? (
        <PrePurchaseMessageComposer
          basePath={basePath}
          sellerSlug={contactSellerSlug}
          title={tMessages("contactSellerTitle")}
          onClose={() => setContactSellerSlug(null)}
        />
      ) : null}

      <CartEditItemSheet
        item={editingItem}
        open={!!editingItem}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingItem(null);
        }}
        onSaved={refreshCart}
      />

      {onSaveCustomerNote ? (
        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("orderNoteTitle")}</DialogTitle>
            </DialogHeader>
            <Textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder={t("orderNotePlaceholder")}
              rows={4}
              className="mt-2"
            />
            {noteError ? (
              <p className="mt-2 text-sm text-marketplace-danger">
                {noteError}
              </p>
            ) : null}
            <DialogFooter className="mt-4 gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNoteOpen(false)}
                disabled={noteSaving}
              >
                {tc("cancel")}
              </Button>
              <Button type="button" onClick={saveNote} disabled={noteSaving}>
                {noteSaving ? tc("saving") : t("saveOrderNote")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function CompactCartLineItems({
  groups,
  basePath,
  onClose,
}: {
  groups: ReturnType<typeof groupLineItemsBySeller>;
  basePath: string;
  onClose?: () => void;
}) {
  return (
    <ul className="divide-y divide-marketplace-border-subtle">
      {groups.flatMap((group) =>
        group.items.map((item) => {
          const lineItem = item as LineItem & {
            personalization_snapshot?: Array<Record<string, unknown>> | null;
            proof_required?: boolean;
            personalization_files?: unknown;
          };

          return (
            <li key={item.id} className="p-4" data-theme-cart-line-item>
              <div className="flex gap-3">
                <Link
                  href={`${basePath}/products/${item.slug}`}
                  className="relative size-[5.5rem] shrink-0 overflow-hidden rounded-xl bg-marketplace-surface-warm"
                  onClick={onClose}
                >
                  <ProductImage
                    src={item.thumbnail_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="88px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`${basePath}/products/${item.slug}`}
                    className="line-clamp-2 text-sm leading-5 text-marketplace-foreground"
                    onClick={onClose}
                  >
                    {item.name}
                  </Link>
                  {item.display_total || item.display_price ? (
                    <p className="mt-1.5 text-sm font-semibold text-marketplace-foreground">
                      {item.display_total || item.display_price}
                    </p>
                  ) : null}
                  {item.options_text ? (
                    <p className="mt-1 text-sm text-marketplace-muted-foreground">
                      {item.options_text}
                    </p>
                  ) : null}
                  <PersonalizationSnapshot
                    snapshot={lineItem.personalization_snapshot}
                    proofRequired={lineItem.proof_required}
                    files={
                      lineItem.personalization_files as
                        | PersonalizationFileRef[]
                        | null
                        | undefined
                    }
                    compact
                  />
                </div>
              </div>
            </li>
          );
        }),
      )}
    </ul>
  );
}
