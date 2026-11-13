"use client";

import { useEffect } from "react";

/** Reports the end of the buyer-visible content before About to the editor host. */
export function SellerShopEditorInlineAboutAnchor() {
  useEffect(() => {
    const sendHeight = () => {
      const anchor = document.getElementById("shop-editor-inline-about-anchor");
      const height = Math.ceil(
        anchor
          ? anchor.getBoundingClientRect().top + window.scrollY
          : document.documentElement.scrollHeight,
      );
      window.parent.postMessage(
        { source: "spree-shop-editor", action: "inline-about-height", height },
        "*",
      );
    };

    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
    window.addEventListener("resize", sendHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sendHeight);
    };
  }, []);

  return (
    <div
      id="shop-editor-inline-about-anchor"
      aria-hidden="true"
      className="h-0"
    />
  );
}
