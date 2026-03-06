"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { CloseIcon } from "@/components/icons";

interface DrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  maxWidth?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Reusable drawer shell with backdrop, escape key, body scroll lock,
 * focus trap, and slide-in animation.
 */
export function DrawerShell({
  isOpen,
  onClose,
  title,
  side = "right",
  maxWidth = "max-w-sm",
  headerExtra,
  children,
  footer,
}: DrawerShellProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      requestAnimationFrame(() => {
        if (!drawerRef.current) return;
        const focusable = drawerRef.current.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        (focusable ?? drawerRef.current).focus();
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !drawerRef.current) return;

    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Return focus to trigger element on close
  useEffect(() => {
    if (!isOpen && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLeft = side === "left";
  const animation = isLeft ? "animate-slide-in-left" : "animate-slide-in-right";
  const justify = isLeft ? "justify-start" : "justify-end";

  return (
    <div className={`fixed inset-0 z-50 flex ${justify}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        ref={drawerRef}
        className={`relative w-full ${maxWidth} bg-white shadow-xl flex flex-col ${animation}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {isLeft ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              {headerExtra}
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={`Close ${title.toLowerCase()}`}
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={`Close ${title.toLowerCase()}`}
              >
                <CloseIcon className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-semibold uppercase">{title}</h2>
              {headerExtra ?? <div className="w-10" />}
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer}
      </div>
    </div>
  );
}
