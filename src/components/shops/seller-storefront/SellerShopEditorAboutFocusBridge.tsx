"use client";

import { useEffect } from "react";

const parentMessageSource = "spree-shop-editor-parent";

export function SellerShopEditorAboutFocusBridge({
  enabled,
}: {
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    function scrollAboutIntoView() {
      const target = document.getElementById("shop-about");
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (message?.source !== parentMessageSource) return;
      if (message.action === "focus-about" || message.action === "refresh") {
        requestAnimationFrame(scrollAboutIntoView);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [enabled]);

  return null;
}
