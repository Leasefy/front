"use client";

import { useEffect, useRef } from "react";

/**
 * ForceLightMode - Forces light mode for public/marketing pages
 *
 * This component wraps public pages and ensures they always display
 * in light mode regardless of user's theme preference stored by next-themes.
 *
 * How it works:
 * - On mount: Removes the 'dark' class from <html> element
 * - Uses MutationObserver to continuously enforce light mode
 * - On unmount: Restores the 'dark' class if the user's theme preference is dark
 *
 * This ensures landing pages, pricing, products, etc. are always light,
 * while dashboard pages (/inquilino/*, /panel/*) respect user preference.
 */
export function ForceLightMode({ children }: { children: React.ReactNode }) {
  const wasDarkRef = useRef<boolean>(false);

  useEffect(() => {
    const html = document.documentElement;

    // Store original state
    wasDarkRef.current = html.classList.contains("dark") || localStorage.getItem("theme") === "dark";

    // Force light mode immediately
    html.classList.remove("dark");
    html.style.colorScheme = "light";

    // Create MutationObserver to enforce light mode if something tries to add 'dark' class
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class" && html.classList.contains("dark")) {
          html.classList.remove("dark");
        }
        if (mutation.attributeName === "style" && html.style.colorScheme === "dark") {
          html.style.colorScheme = "light";
        }
      });
    });

    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    // Restore dark class on unmount if user preference was dark
    return () => {
      observer.disconnect();

      // Check localStorage for next-themes preference
      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "dark" || wasDarkRef.current) {
        html.classList.add("dark");
        html.style.colorScheme = "dark";
      }
    };
  }, []);

  return <>{children}</>;
}
