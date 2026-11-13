"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Lets the seller panel push live preview patches once the iframe has mounted. */
export function SellerShopEditorReadyBeacon() {
  const router = useRouter();

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;
      if (
        event.data?.source === "spree-shop-editor-parent" &&
        event.data?.action === "refresh"
      ) {
        router.refresh();
      }
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage(
      { source: "spree-shop-editor", action: "ready" },
      "*",
    );
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
