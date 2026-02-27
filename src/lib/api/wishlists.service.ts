/**
 * Wishlists API service
 * Replaces localStorage-based wishlist with backend persistence
 */

import { apiClient } from '@/lib/api/client';

export interface WishlistItem {
  propertyId: string;
  createdAt: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
}

export const wishlistsApi = {
  /**
   * Get all wishlisted property IDs for the current user
   */
  async getMine(): Promise<string[]> {
    const res = await apiClient.get<WishlistResponse>('/wishlists');
    return res.items.map((item) => item.propertyId);
  },

  /**
   * Add a property to the wishlist
   */
  async add(propertyId: string): Promise<void> {
    await apiClient.post('/wishlists', { propertyId });
  },

  /**
   * Remove a property from the wishlist
   */
  async remove(propertyId: string): Promise<void> {
    await apiClient.delete(`/wishlists/${propertyId}`);
  },

  /**
   * Check if a property is in the wishlist
   */
  async check(propertyId: string): Promise<boolean> {
    const res = await apiClient.get<{ wishlisted: boolean }>(`/wishlists/check/${propertyId}`);
    return res.wishlisted;
  },
};
