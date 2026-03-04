import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * Detects whether a hidden measurement element's natural width exceeds
 * the available space in the header container.
 *
 * How it works:
 * 1. After items load, caches the measurement nav's `scrollWidth` (= total nav width).
 * 2. Observes the header flex container with ResizeObserver.
 * 3. On every resize, measures sibling widths (logo, search, actions)
 *    and compares remaining space against the cached nav width.
 *
 * This avoids the chicken-and-egg problem: the measurement nav is always
 * in the DOM (absolute + invisible), so its width is stable regardless of
 * whether the real nav is shown or hidden.
 */
export function useOverflowDetection(
  measureRef: RefObject<HTMLElement | null>,
  itemCount: number,
): boolean {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const minWidthRef = useRef(0);

  useEffect(() => {
    const measure = measureRef.current;
    if (!measure || itemCount === 0) {
      setIsOverflowing(false);
      return;
    }

    minWidthRef.current = measure.scrollWidth;

    const headerContainer = measure.closest(
      "[data-header-container]",
    ) as HTMLElement | null;
    if (!headerContainer) return;

    const check = () => {
      let siblingsWidth = 0;
      for (const child of headerContainer.children) {
        if (child.contains(measure)) continue;
        if (getComputedStyle(child).display === "none") continue;
        siblingsWidth += child.getBoundingClientRect().width;
      }

      const available = headerContainer.clientWidth - siblingsWidth - 16;
      setIsOverflowing(minWidthRef.current > available);
    };

    const observer = new ResizeObserver(check);
    observer.observe(headerContainer);
    check();

    return () => observer.disconnect();
  }, [itemCount, measureRef]);

  return isOverflowing;
}
