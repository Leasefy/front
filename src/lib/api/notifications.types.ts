/**
 * Notification API types
 * Maps between backend notification format and frontend display types
 */

import type {
  LandlordNotification,
  TenantNotification,
  LandlordNotificationType,
  TenantNotificationType,
  LandlordNotificationCategory,
  TenantNotificationCategory,
} from '@/lib/types/notification';

// ============================================================================
// Backend Types
// ============================================================================

export interface BackendNotification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface BackendNotificationsResponse {
  notifications: BackendNotification[];
  total: number;
  unreadCount: number;
}

// ============================================================================
// Query Params
// ============================================================================

export interface NotificationQueryParams {
  category?: string;
  read?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Mappers
// ============================================================================

export function mapToLandlordNotification(n: BackendNotification): LandlordNotification {
  return {
    id: n.id,
    type: n.type as LandlordNotificationType,
    category: n.category as LandlordNotificationCategory,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
    actionUrl: n.actionUrl,
    actionLabel: n.actionLabel,
    metadata: n.metadata as LandlordNotification['metadata'],
  };
}

export function mapToTenantNotification(n: BackendNotification): TenantNotification {
  return {
    id: n.id,
    type: n.type as TenantNotificationType,
    category: n.category as TenantNotificationCategory,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
    actionUrl: n.actionUrl,
    actionLabel: n.actionLabel,
    metadata: n.metadata as TenantNotification['metadata'],
  };
}
