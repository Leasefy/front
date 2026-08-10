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

// ============================================================================
// Realtime (Supabase postgres_changes) mappers
// ============================================================================

/**
 * `notification_logs` has no `category` column — the REST layer derives it from
 * the templateCode, and Realtime INSERT rows must replicate that derivation so a
 * notification added via Realtime lands in the same filter bucket as one loaded
 * via REST. Order matters: checks run first-match-wins. Mapping confirmed by the
 * backend. Anything unrecognized falls back to 'general'.
 */
export function deriveCategoryFromTemplateCode(templateCode: string): string {
  const code = templateCode.toUpperCase();
  if (code.includes('APPLICATION')) return 'application';
  if (code.includes('PAYMENT') || code.includes('RECEIPT')) return 'payment';
  if (code.includes('VISIT')) return 'visit';
  if (code.includes('CONTRACT')) return 'contract';
  if (code.includes('LEASE')) return 'lease';
  if (code.includes('PROPERTY')) return 'property';
  if (code.includes('DOCUMENT')) return 'document';
  return 'general';
}

/**
 * Map a raw `notification_logs` row (snake_case, as delivered by Supabase
 * postgres_changes) to the same `BackendNotification` shape the REST mappers
 * consume, so a single downstream mapping path stays in play. The row carries
 * `template_code`/`subject`/`action_url`/`read_at`/`created_at`; `category` is
 * derived and `message` falls back to '' when the row has no body.
 */
export function mapRealtimeRowToBackendNotification(
  row: Record<string, unknown>,
): BackendNotification {
  const templateCode = String(row.template_code ?? '');
  const actionUrl = row.action_url;
  return {
    id: String(row.id ?? ''),
    type: templateCode,
    category: deriveCategoryFromTemplateCode(templateCode),
    title: String(row.subject ?? ''),
    message: String(row.body ?? row.message ?? ''),
    read: row.read_at != null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    actionUrl: actionUrl != null ? String(actionUrl) : undefined,
    metadata: (row.metadata as Record<string, unknown> | undefined) ?? undefined,
  };
}
