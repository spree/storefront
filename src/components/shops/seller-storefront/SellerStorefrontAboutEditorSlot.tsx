"use client";

import { type ReactNode, useEffect, useState } from "react";
import { SellerShopEditorAboutFocusBridge } from "./SellerShopEditorAboutFocusBridge";

const parentSource = "spree-shop-editor-parent";

export function SellerStorefrontAboutEditorSlot({
  initialEditActive,
  preview,
  edit,
}: {
  initialEditActive: boolean;
  preview: ReactNode;
  edit: ReactNode;
}) {
  const [editActive, setEditActive] = useState(initialEditActive);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data as {
        source?: string;
        action?: string;
        enabled?: boolean;
      };
      if (message?.source !== parentSource) return;
      if (message.action === "shop-content-edit") {
        setEditActive(Boolean(message.enabled));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <>
      {editActive ? <SellerShopEditorAboutFocusBridge enabled /> : null}
      {editActive ? edit : preview}
    </>
  );
}
