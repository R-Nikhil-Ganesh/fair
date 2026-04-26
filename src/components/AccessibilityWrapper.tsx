"use client";

import React, { createContext, useCallback, useContext, useRef } from "react";

interface A11yContextValue {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const A11yContext = createContext<A11yContextValue>({ announce: () => {} });

export function useAnnounce() {
  return useContext(A11yContext).announce;
}

export function AccessibilityWrapper({ children }: { children: React.ReactNode }) {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const el = priority === "assertive" ? assertiveRef.current : politeRef.current;
      if (!el) return;
      el.textContent = "";
      requestAnimationFrame(() => {
        el.textContent = message;
      });
    },
    []
  );

  return (
    <A11yContext.Provider value={{ announce }}>
      {/* Skip navigation link - visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:text-sm"
      >
        Skip to main content
      </a>

      {/* ARIA live regions for dynamic announcements */}
      <div ref={politeRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <div ref={assertiveRef} aria-live="assertive" aria-atomic="true" className="sr-only" />

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </A11yContext.Provider>
  );
}
