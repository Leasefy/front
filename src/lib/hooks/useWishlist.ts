'use client';

import { useState, useEffect, useCallback } from 'react';
import { StorageManager } from '@/lib/utils/storage';
import { contextLogger } from '@/lib/utils/logger';

const WISHLIST_KEY = 'arriendo-facil-wishlist';

// Storage manager instance
const storage = new StorageManager<string[]>(WISHLIST_KEY);

/**
 * Hook for managing property wishlist with localStorage persistence
 * Handles SSR by checking for window before accessing localStorage
 */
export function useWishlist() {
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = storage.get({
      suppressErrors: true,
      onError: (error) => {
        contextLogger.error('Failed to load wishlist from localStorage', error);
      },
    });

    if (stored) {
      setWishlistedIds(stored);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever wishlistedIds changes (after hydration)
  useEffect(() => {
    if (!isHydrated) return;

    storage.set(wishlistedIds, {
      onError: (error) => {
        contextLogger.error('Failed to save wishlist to localStorage', error);
      },
    });
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
