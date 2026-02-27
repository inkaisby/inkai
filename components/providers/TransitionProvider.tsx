"use client";

import { createContext, useState } from "react";

export const PageTransitionContext = createContext({
  transitioning: false,
  setTransitioning: (value: boolean) => {
    // value is intentionally unused in default context
    void value;
  },
});

export function PageTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transitioning, setTransitioning] = useState(false);

  return (
    <PageTransitionContext.Provider value={{ transitioning, setTransitioning }}>
      {children}
    </PageTransitionContext.Provider>
  );
}
