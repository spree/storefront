"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAboutProduct, contactSeller } from "@/lib/data/messages";

interface PrePurchaseMessageComposerProps {
  basePath: string;
  onClose: () => void;
  sellerSlug?: string;
  productId?: string;
  productName?: string;
  title: string;
}

export function PrePurchaseMessageComposer({
  basePath,
  onClose,
  sellerSlug,
  productId,
  productName,
  title,
}: PrePurchaseMessageComposerProps) {
  const t = useTranslations("messages");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSubmit() {
    const text = body.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const thread = productId
          ? await askAboutProduct({ product_id: productId, body: text })
          : await contactSeller({ seller_id: sellerSlug!, body: text });
        if (!thread?.id) {
          throw new Error("missing_thread");
        }
        onClose();
        router.push(`${basePath}/account/messages/${thread.id}`);
      } catch {
        setError(t("sendFailed"));
      }
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={t("cancel")}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pre-purchase-message-title"
        className="relative z-[201] w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-lg"
      >
        <h2
          id="pre-purchase-message-title"
          className="text-lg font-semibold text-gray-900"
        >
          {title}
        </h2>
        {productName ? (
          <p className="text-sm text-gray-600">
            {t("regardingProduct", { name: productName })}
          </p>
        ) : null}
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          placeholder={t("placeholder")}
          autoFocus
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            disabled={!body.trim() || pending}
            onClick={handleSubmit}
          >
            {t("send")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
