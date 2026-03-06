import type { RefObject } from "react";
import { useEffect } from "react";

/**
 * Dismisses an active UI element (dropdown, popover, etc.) when the user
 * clicks outside the ref element or presses the Escape key.
 *
 * The effect only attaches listeners when `isActive` is true,
 * so there's zero overhead when the element is closed.
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  isActive: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!isActive) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ref, isActive, onDismiss]);
}
