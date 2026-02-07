"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * ConditionalTheme - Conditionally forces light mode based on navigation source
 *
 * Behavior:
 * - If accessed from dashboard (with ?from=panel query param): Respects user's theme preference
 * - If accessed from landing/public pages (no query param): Forces light mode
 *
 * This ensures the publish wizard matches the dashboard theme when accessed from there,
 * but stays light for public visitors coming from landing pages.
 */
export function ConditionalTheme({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fromPanel = searchParams.get("from") === "panel";
    const html = document.documentElement;

    if (fromPanel) {
      // Coming from panel - respect user's theme preference
      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    } else {
      // Coming from landing/public - force light mode
      html.classList.remove("dark");
    }

    // Cleanup: restore user preference when leaving
    return () => {
      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "dark") {
        html.classList.add("dark");
      }
    };
  }, [mounted, searchParams]);

  return <>{children}</>;
}
