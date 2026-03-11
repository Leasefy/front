"use client";

import { useEffect, useRef, createContext, useContext, useCallback, type ReactNode } from "react";
import Lenis from "lenis";

interface LenisContextValue {
  stop: () => void;
  start: () => void;
}

const LenisContext = createContext<LenisContextValue | null>(null);

/**
 * Hook to control Lenis smooth scroll
 * Call stop() when opening modals, start() when closing
 */
export function useLenis() {
  const context = useContext(LenisContext);
  if (!context) {
    // Return no-op functions if not wrapped in provider
    return { stop: () => {}, start: () => {} };
  }
  return context;
}

/**
 * SmoothScroll Provider - Lenis smooth scrolling like Luxterra
 * Creates buttery smooth scrolling experience
 * Exposes stop/start methods for modal control
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    // Animation frame loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    lenisRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    lenisRef.current?.start();
  }, []);

  return (
    <LenisContext.Provider value={{ stop, start }}>
      {children}
    </LenisContext.Provider>
  );
}
