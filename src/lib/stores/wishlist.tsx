'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { Property } from '@/lib/types/property';
import { wishlistsApi } from '@/lib/api/wishlists.service';
import { apiClient } from '@/lib/api/client';
import { getSupabase } from '@/lib/supabase/client';

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
  const isAuthenticated = useRef(false);

  // Load wishlist: try API first (authenticated), fallback to localStorage
  useEffect(() => {
    async function loadWishlist() {
      // Check if user is authenticated
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          isAuthenticated.current = true;
          // Check user role — wishlists are TENANT-only
          try {
            const user = await apiClient.get<{ role: string }>('/users/me');
            if (user.role === 'LANDLORD') {
              setIsLoaded(true);
              return;
            }
          } catch { /* proceed to try wishlists anyway */ }
          const ids = await wishlistsApi.getMine();
          setWishlist(ids);
          // Sync localStorage with API data
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
          } catch { /* ignore */ }
          setIsLoaded(true);
          return;
        }
      } catch {
        // API failed, fall through to localStorage
      }

      // Fallback: load from localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setWishlist(parsed);
          }
        }
      } catch {
        console.warn('Could not load wishlist from localStorage');
      }
      setIsLoaded(true);
    }

    loadWishlist();
  }, []);

  // Save to localStorage whenever wishlist changes (always, as cache)
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
      const removing = prev.includes(propertyId);
      // Fire-and-forget API sync
      if (isAuthenticated.current) {
        if (removing) {
          wishlistsApi.remove(propertyId).catch(() => {});
        } else {
          wishlistsApi.add(propertyId).catch(() => {});
        }
      }
      if (removing) {
        return prev.filter((id) => id !== propertyId);
      }
      return [...prev, propertyId];
    });
  }, []);

  const addToWishlist = useCallback((propertyId: string) => {
    setWishlist((prev) => {
      if (prev.includes(propertyId)) return prev;
      if (isAuthenticated.current) {
        wishlistsApi.add(propertyId).catch(() => {});
      }
      return [...prev, propertyId];
    });
  }, []);

  const removeFromWishlist = useCallback((propertyId: string) => {
    if (isAuthenticated.current) {
      wishlistsApi.remove(propertyId).catch(() => {});
    }
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
