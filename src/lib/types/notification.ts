/**
 * Notification types for Leasefy platform
 * Supports both landlord and tenant notification workflows
 */

// ============================================================================
// Notification Types - Landlords
// ============================================================================

/**
 * Canonical notification type codes from the backend (single source of truth).
 * These match the `templateCode` values in backend `prisma/seed-templates.ts`.
 *
 * One convention across the whole stack — no aliases, no translations.
 */
export type NotificationType =
  // Applications
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_INFO_REQUESTED'
  | 'APPLICATION_INFO_PROVIDED'
  // Payments
  | 'PAYMENT_RECEIPT_UPLOADED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_DISPUTE_OPENED'
  | 'PAYMENT_REMINDER'
  | 'PAYMENT_OVERDUE'
  // Visits
  | 'VISIT_REQUESTED'
  | 'VISIT_ACCEPTED'
  | 'VISIT_REJECTED'
  | 'VISIT_CANCELLED'
  | 'VISIT_RESCHEDULED'
  | 'VISIT_REMINDER_24H'
  // Contracts
  | 'CONTRACT_READY_TO_SIGN'
  | 'CONTRACT_LANDLORD_SIGNED'
  | 'CONTRACT_TENANT_SIGNED'
  | 'CONTRACT_COMPLETED'
  // Leases
  | 'LEASE_EXPIRING_SOON'
  | 'LEASE_EXPIRED';

/** @deprecated Use NotificationType — backend emits the same codes to both audiences */
export type LandlordNotificationType = NotificationType;

// ============================================================================
// Notification Types - Tenants
// ============================================================================

/** @deprecated Use NotificationType — backend emits the same canonical codes to both audiences */
export type TenantNotificationType = NotificationType;

// ============================================================================
// Categories
// ============================================================================

export type LandlordNotificationCategory =
  | 'payment'
  | 'application'
  | 'contract'
  | 'lease'
  | 'visit'
  | 'property'
  | 'verification'
  | 'maintenance'
  | 'message'
  | 'review'
  | 'alert'
  | 'system';

export type TenantNotificationCategory =
  | 'payment'
  | 'application'
  | 'contract'
  | 'lease'
  | 'visit'
  | 'document'
  | 'message'
  | 'reminder'
  | 'property'
  | 'maintenance'
  | 'system';

// ============================================================================
// Base Notification Interface
// ============================================================================

export interface BaseNotification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface LandlordNotification extends BaseNotification {
  type: LandlordNotificationType;
  category: LandlordNotificationCategory;
  metadata?: {
    tenantName?: string;
    tenantEmail?: string;
    propertyName?: string;
    propertyId?: string;
    applicationId?: string;
    contractId?: string;
    leaseId?: string;
    paymentId?: string;
    visitId?: string;
    amount?: number;
    score?: number;
    daysRemaining?: number;
    [key: string]: unknown;
  };
}

export interface TenantNotification extends BaseNotification {
  type: TenantNotificationType;
  category: TenantNotificationCategory;
  metadata?: {
    landlordName?: string;
    propertyName?: string;
    propertyId?: string;
    applicationId?: string;
    contractId?: string;
    leaseId?: string;
    paymentId?: string;
    visitId?: string;
    amount?: number;
    dueDate?: string;
    [key: string]: unknown;
  };
}

// ============================================================================
// Category Configuration
// ============================================================================

export interface CategoryConfig {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
}

export const LANDLORD_CATEGORIES: Record<LandlordNotificationCategory, CategoryConfig> = {
  payment: {
    id: 'payment',
    label: 'Pagos',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50',
    darkBgColor: 'dark:bg-emerald-500/10',
  },
  application: {
    id: 'application',
    label: 'Aplicaciones',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50',
    darkBgColor: 'dark:bg-blue-500/10',
  },
  contract: {
    id: 'contract',
    label: 'Contratos',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50',
    darkBgColor: 'dark:bg-purple-500/10',
  },
  lease: {
    id: 'lease',
    label: 'Arriendos',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50',
    darkBgColor: 'dark:bg-indigo-500/10',
  },
  visit: {
    id: 'visit',
    label: 'Visitas',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50',
    darkBgColor: 'dark:bg-cyan-500/10',
  },
  property: {
    id: 'property',
    label: 'Propiedades',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50',
    darkBgColor: 'dark:bg-green-500/10',
  },
  verification: {
    id: 'verification',
    label: 'Verificaciones',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50',
    darkBgColor: 'dark:bg-sky-500/10',
  },
  maintenance: {
    id: 'maintenance',
    label: 'Mantenimiento',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50',
    darkBgColor: 'dark:bg-amber-500/10',
  },
  message: {
    id: 'message',
    label: 'Mensajes',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50',
    darkBgColor: 'dark:bg-blue-500/10',
  },
  review: {
    id: 'review',
    label: 'Reseñas',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50',
    darkBgColor: 'dark:bg-yellow-500/10',
  },
  alert: {
    id: 'alert',
    label: 'Alertas',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50',
    darkBgColor: 'dark:bg-red-500/10',
  },
  system: {
    id: 'system',
    label: 'Sistema',
    color: 'text-neutral-600 dark:text-neutral-400',
    bgColor: 'bg-neutral-50',
    darkBgColor: 'dark:bg-neutral-500/10',
  },
};

export const TENANT_CATEGORIES: Record<TenantNotificationCategory, CategoryConfig> = {
  payment: {
    id: 'payment',
    label: 'Pagos',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50',
    darkBgColor: 'dark:bg-emerald-500/10',
  },
  application: {
    id: 'application',
    label: 'Aplicaciones',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50',
    darkBgColor: 'dark:bg-green-500/10',
  },
  contract: {
    id: 'contract',
    label: 'Contratos',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50',
    darkBgColor: 'dark:bg-purple-500/10',
  },
  lease: {
    id: 'lease',
    label: 'Arriendo',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50',
    darkBgColor: 'dark:bg-indigo-500/10',
  },
  visit: {
    id: 'visit',
    label: 'Visitas',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50',
    darkBgColor: 'dark:bg-indigo-500/10',
  },
  document: {
    id: 'document',
    label: 'Documentos',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50',
    darkBgColor: 'dark:bg-purple-500/10',
  },
  message: {
    id: 'message',
    label: 'Mensajes',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50',
    darkBgColor: 'dark:bg-blue-500/10',
  },
  reminder: {
    id: 'reminder',
    label: 'Recordatorios',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50',
    darkBgColor: 'dark:bg-amber-500/10',
  },
  property: {
    id: 'property',
    label: 'Propiedades',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50',
    darkBgColor: 'dark:bg-green-500/10',
  },
  maintenance: {
    id: 'maintenance',
    label: 'Mantenimiento',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50',
    darkBgColor: 'dark:bg-amber-500/10',
  },
  system: {
    id: 'system',
    label: 'Sistema',
    color: 'text-neutral-600 dark:text-neutral-400',
    bgColor: 'bg-neutral-50',
    darkBgColor: 'dark:bg-neutral-500/10',
  },
};

// ============================================================================
// Notification Preferences
// ============================================================================

export interface NotificationChannelPreference {
  web: boolean;
  email: boolean;
  push: boolean;
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  categories: Record<string, NotificationChannelPreference>;
  quietHours: QuietHours;
  digestFrequency: 'realtime' | 'daily' | 'weekly';
  digestTime?: string;
  digestDay?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function formatNotificationTime(createdAt: string): string {
  const now = new Date();
  const date = new Date(createdAt);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? 'semana' : 'semanas'}`;
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

/**
 * Icon name lookup by canonical notification type.
 * Keys match backend templateCode (prisma/seed-templates.ts) — no aliases.
 */
export function getNotificationIcon(type: string): string {
  const iconMap: Record<string, string> = {
    // Applications
    APPLICATION_RECEIVED: 'UserPlus',
    APPLICATION_APPROVED: 'CheckCircle',
    APPLICATION_REJECTED: 'XCircle',
    APPLICATION_INFO_REQUESTED: 'FileText',
    APPLICATION_INFO_PROVIDED: 'FileText',
    // Payments
    PAYMENT_RECEIPT_UPLOADED: 'CurrencyDollar',
    PAYMENT_APPROVED: 'CheckCircle',
    PAYMENT_REJECTED: 'XCircle',
    PAYMENT_DISPUTE_OPENED: 'Warning',
    PAYMENT_REMINDER: 'Bell',
    PAYMENT_OVERDUE: 'Warning',
    // Visits
    VISIT_REQUESTED: 'Calendar',
    VISIT_ACCEPTED: 'CalendarCheck',
    VISIT_REJECTED: 'XCircle',
    VISIT_CANCELLED: 'CalendarX',
    VISIT_RESCHEDULED: 'Calendar',
    VISIT_REMINDER_24H: 'Bell',
    // Contracts
    CONTRACT_READY_TO_SIGN: 'PenNib',
    CONTRACT_LANDLORD_SIGNED: 'PenNib',
    CONTRACT_TENANT_SIGNED: 'PenNib',
    CONTRACT_COMPLETED: 'CheckCircle',
    // Leases
    LEASE_EXPIRING_SOON: 'Clock',
    LEASE_EXPIRED: 'Warning',
  };

  return iconMap[type] || 'Bell';
}
