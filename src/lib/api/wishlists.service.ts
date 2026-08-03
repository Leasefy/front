/**
 * Wishlists API service
 * Replaces localStorage-based wishlist with backend persistence
 *
 * Backend contract (back/src/wishlists/wishlists.controller.ts, TENANT-only):
 *   GET    /wishlists                      → bare array of items, newest first
 *   POST   /wishlists/items { propertyId } → idempotent add (404 if property missing/DRAFT)
 *   DELETE /wishlists/items/:propertyId    → 204, idempotent remove
 */

import { apiClient } from '@/lib/api/client';

export interface WishlistItem {
  userId: string;
  propertyId: string;
  createdAt: string;
  property?: Record<string, unknown>;
}

export const wishlistsApi = {
  /**
   * Get all wishlisted property IDs for the current user (newest first)
   */
  async getMine(): Promise<string[]> {
    const items = await apiClient.get<WishlistItem[]>('/wishlists');
    return items.map((item) => item.propertyId);
  },

  /**
   * Add a property to the wishlist (idempotent)
   */
  async add(propertyId: string): Promise<void> {
    await apiClient.post('/wishlists/items', { propertyId });
  },

  /**
   * Remove a property from the wishlist (idempotent, 204)
   */
  async remove(propertyId: string): Promise<void> {
    await apiClient.delete(`/wishlists/items/${propertyId}`);
  },
};
