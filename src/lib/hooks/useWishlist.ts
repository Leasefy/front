'use client';

import { useState, useEffect, useCallback } from 'react';

const WISHLIST_KEY = 'arriendo-facil-wishlist';

/**
 * Hook for managing property wishlist with localStorage persistence
 * Handles SSR by checking for window before accessing localStorage
 */
export function useWishlist() {
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(WISHLIST_KEY);
      if (stored) {
        try {
          setWishlistedIds(JSON.parse(stored));
        } catch {
          // Ignore parse errors, start with empty wishlist
        }
      }
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage whenever wishlistedIds changes (after hydration)
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistedIds));
    }
  }, [wishlistedIds, isHydrated]);

  /**
   * Toggle a property in/out of the wishlist
   */
  const toggleWishlist = useCallback((propertyId: string) => {
    setWishlistedIds((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId);
      }
      return [...prev, propertyId];
    });
  }, []);

  /**
   * Add a property to the wishlist
   */
  const addToWishlist = useCallback((propertyId: string) => {
    setWishlistedIds((prev) => {
      if (prev.includes(propertyId)) {
        return prev;
      }
      return [...prev, propertyId];
    });
  }, []);

  /**
   * Remove a property from the wishlist
   */
  const removeFromWishlist = useCallback((propertyId: string) => {
    setWishlistedIds((prev) => prev.filter((id) => id !== propertyId));
  }, []);

  /**
   * Check if a property is wishlisted
   */
  const isWishlisted = useCallback(
    (propertyId: string) => wishlistedIds.includes(propertyId),
    [wishlistedIds]
  );

  /**
   * Clear all wishlisted properties
   */
  const clearWishlist = useCallback(() => {
    setWishlistedIds([]);
  }, []);

  return {
    wishlistedIds,
    toggleWishlist,
    addToWishlist,
    removeFromWishlist,
    isWishlisted,
    clearWishlist,
    wishlistCount: wishlistedIds.length,
    isHydrated,
  };
}
