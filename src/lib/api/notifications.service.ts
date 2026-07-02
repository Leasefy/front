/**
 * Notifications API service
 * Handles CRUD operations for notifications
 */

import { apiClient, ApiError } from '@/lib/api/client';
import type {
  BackendNotification,
  BackendNotificationsResponse,
  NotificationQueryParams,
} from './notifications.types';
import {
  mapToLandlordNotification,
  mapToTenantNotification,
} from './notifications.types';
import type { LandlordNotification, TenantNotification } from '@/lib/types/notification';

// ============================================================================
// Filter Options (static data, previously in mock)
// ============================================================================

export const LANDLORD_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'No leídas' },
  { value: 'payment', label: 'Pagos' },
  { value: 'application', label: 'Candidatos' },
  { value: 'contract', label: 'Contratos' },
  { value: 'lease', label: 'Arriendos' },
  { value: 'visit', label: 'Visitas' },
  { value: 'property', label: 'Propiedades' },
];

export const TENANT_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'No leídas' },
  { value: 'payment', label: 'Pagos' },
  { value: 'application', label: 'Aplicaciones' },
  { value: 'message', label: 'Mensajes' },
  { value: 'document', label: 'Documentos' },
];

// ============================================================================
// Client-side helpers (previously in mock)
// ============================================================================

export function getUnreadCount(notifications: { read: boolean }[]): number {
  return notifications.filter((n) => !n.read).length;
}

export function filterByCategory<T extends { category: string; read: boolean }>(
  notifications: T[],
  category: string,
): T[] {
  if (category === 'all') return notifications;
  if (category === 'unread') return notifications.filter((n) => !n.read);
  return notifications.filter((n) => n.category === category);
}

// ============================================================================
// API Service
// ============================================================================

export const notificationsApi = {
  /**
   * Get notifications for current user
   */
  async getMine(params?: NotificationQueryParams): Promise<BackendNotificationsResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.read !== undefined) searchParams.set('read', String(params.read));
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      const qs = searchParams.toString();
      const path = `/notifications${qs ? `?${qs}` : ''}`;
      return await apiClient.get<BackendNotificationsResponse>(path);
    } catch (err) {
      // 404 = endpoint returns nothing for this user (empty inbox) — legitimate empty state.
      // Any other error (5xx, network) is an infrastructure failure — propagate so callers
      // can show "no pudimos cargar las notificaciones" instead of a silent empty list.
      if (err instanceof ApiError && err.status === 404) return { notifications: [], total: 0, unreadCount: 0 };
      throw err;
    }
  },

  /**
   * Get notifications mapped as LandlordNotification[]
   */
  async getLandlordNotifications(params?: NotificationQueryParams): Promise<{
    notifications: LandlordNotification[];
    total: number;
    unreadCount: number;
  }> {
    const res = await this.getMine(params);
    return {
      notifications: res.notifications.map(mapToLandlordNotification),
      total: res.total,
      unreadCount: res.unreadCount,
    };
  },

  /**
   * Get notifications mapped as TenantNotification[]
   */
  async getTenantNotifications(params?: NotificationQueryParams): Promise<{
    notifications: TenantNotification[];
    total: number;
    unreadCount: number;
  }> {
    const res = await this.getMine(params);
    return {
      notifications: res.notifications.map(mapToTenantNotification),
      total: res.total,
      unreadCount: res.unreadCount,
    };
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    return apiClient.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    return apiClient.post('/notifications/mark-all-read');
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    return apiClient.delete(`/notifications/${notificationId}`);
  },
};
