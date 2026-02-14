'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Property } from '@/lib/types/property';

const STORAGE_KEY = 'arriendo-facil-wishlist';

interface WishlistContextTextT {
  /** Array of wishlisted property IDs */
  wishlist: string[];
  /** Check if a property is wishlisted */
  isWishlisted: (propertyId: string) => boolean;
  /** Toggle wishlist status for a property */
  toggleWishlist: (propertyId: string) => void;
  /** Add a property to wishlist */
  addToWishlist: (propertyId: string) => void;
  /** Remove a property from wishlist */
  removeFromWishlist: (propertyId: string) => void;
  /** Get all wishlisted properties from provided array */
  getWishlistedProperties: (properties: Property[]) => Property[];
  /** Count of wishlisted properties */
  count: number;
}

const WishlistContext = createContext<WishlistContextTextT | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWishlist(parsed);
        }
      }
    } catch {
      // Invalid JSON or localStorage not available
      console.warn('Could not load wishlist from localStorage');
    }
    setIsLoaded(true);
  }, []);

  // FloppyDisk to localStorage whenever wishlist changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
      } catch {
        console.warn('Could not save wishlist to localStorage');
      }
    }
  }, [wishlist, isLoaded]);

  const isWishlisted = useCallback((propertyId: string) => {
    return wishlist.includes(propertyId);
  }, [wishlist]);

  const toggleWishlist = useCallback((propertyId: string) => {
    setWishlist((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId);
      }
      return [...prev, propertyId];
    });
  }, []);

  const addToWishlist = useCallback((propertyId: string) => {
    setWishlist((prev) => {
      if (prev.includes(propertyId)) return prev;
      return [...prev, propertyId];
    });
  }, []);

  const removeFromWishlist = useCallback((propertyId: string) => {
    setWishlist((prev) => prev.filter((id) => id !== propertyId));
  }, []);

  const getWishlistedProperties = useCallback((properties: Property[]) => {
    return properties.filter((p) => wishlist.includes(p.id));
  }, [wishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isWishlisted,
        toggleWishlist,
        addToWishlist,
        removeFromWishlist,
        getWishlistedProperties,
        count: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
