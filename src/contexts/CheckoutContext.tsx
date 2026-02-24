"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

interface CheckoutContextValue {
  summaryContent: ReactNode;
  setSummaryContent: (content: ReactNode) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(
  undefined,
);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [summaryContent, setSummaryContent] = useState<ReactNode>(null);

  const value = useMemo<CheckoutContextValue>(
    () => ({ summaryContent, setSummaryContent }),
    [summaryContent],
  );

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
}

export function CheckoutSummary() {
  const { summaryContent } = useCheckout();
  return <>{summaryContent}</>;
}
