'use client';

import { useWishlist as useWishlistContext } from '@/lib/stores/wishlist';

/**
 * Hook for managing property wishlist with localStorage persistence
 * Now backed by WishlistProvider context for shared state across the app
 */
export function useWishlist() {
  const context = useWishlistContext();

  return {
    wishlistedIds: context.wishlist,
    toggleWishlist: context.toggleWishlist,
    addToWishlist: context.addToWishlist,
    removeFromWishlist: context.removeFromWishlist,
    isWishlisted: context.isWishlisted,
    clearWishlist: () => {
      // Clear all by removing each item
      context.wishlist.forEach((id) => context.removeFromWishlist(id));
    },
    wishlistCount: context.count,
    isHydrated: true, // Context handles hydration
    getWishlistedProperties: context.getWishlistedProperties,
  };
}
