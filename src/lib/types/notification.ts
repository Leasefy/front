/**
 * Notification types for Leasefy platform
 * Supports both landlord and tenant notification workflows
 */

// ============================================================================
// Notification Types - Landlords
// ============================================================================

export type LandlordNotificationType =
  // Applications
  | 'APP_NEW'
  | 'APP_DOCS_UPLOADED'
  | 'APP_DOCS_PENDING'
  | 'APP_WITHDRAWN'
  // Verifications
  | 'VER_COMPLETED'
  | 'VER_SCORE_HIGH'
  | 'VER_SCORE_LOW'
  | 'VER_RED_FLAGS'
  | 'VER_INCOME_VERIFIED'
  // Contracts
  | 'CON_READY'
  | 'CON_TENANT_SIGNED'
  | 'CON_COMPLETED'
  | 'CON_PENDING_SIGNATURE'
  | 'CON_CANCELLED'
  | 'CON_AMENDMENT'
  // Payments
  | 'PAY_RECEIVED'
  | 'PAY_DEPOSITED'
  | 'PAY_OVERDUE'
  | 'PAY_PARTIAL'
  | 'PAY_FAILED'
  | 'PAY_REMINDER_SENT'
  // Leases
  | 'LEA_STARTED'
  | 'LEA_EXPIRING_90'
  | 'LEA_EXPIRING_30'
  | 'LEA_EXPIRED'
  | 'LEA_RENEWED'
  | 'LEA_TERMINATED'
  | 'LEA_EARLY_TERMINATION'
  // Visits
  | 'VIS_SCHEDULED'
  | 'VIS_REMINDER'
  | 'VIS_COMPLETED'
  | 'VIS_CANCELLED'
  | 'VIS_RESCHEDULED'
  | 'VIS_NO_SHOW'
  // Properties
  | 'PRO_PUBLISHED'
  | 'PRO_VIEWS_MILESTONE'
  | 'PRO_FEATURED'
  | 'PRO_EXPIRED'
  | 'PRO_DEACTIVATED'
  | 'PRO_PRICE_SUGGESTION'
  // Messages
  | 'MSG_NEW'
  | 'MSG_REPLY'
  // Maintenance
  | 'MNT_REQUEST'
  | 'MNT_UPDATED'
  | 'MNT_COMPLETED'
  // Reviews
  | 'REV_RECEIVED'
  | 'REV_RESPONSE_NEEDED'
  // System
  | 'SYS_SUBSCRIPTION_EXPIRING'
  | 'SYS_SUBSCRIPTION_EXPIRED'
  | 'SYS_PAYMENT_METHOD_EXPIRING'
  | 'SYS_SECURITY_ALERT'
  | 'SYS_WELCOME'
  | 'SYS_PROFILE_INCOMPLETE'
  | 'SYS_NEW_FEATURE'
  | 'SYS_REPORT_READY';

// ============================================================================
// Notification Types - Tenants
// ============================================================================

export type TenantNotificationType =
  // Applications
  | 'APP_SUBMITTED'
  | 'APP_PREAPPROVED'
  | 'APP_APPROVED'
  | 'APP_REJECTED'
  | 'APP_DOCS_REQUESTED'
  | 'APP_UNDER_REVIEW'
  // Contracts
  | 'CON_READY'
  | 'CON_PENDING_SIGNATURE'
  | 'CON_LANDLORD_SIGNED'
  | 'CON_COMPLETED'
  | 'CON_CANCELLED'
  // Payments
  | 'PAY_CONFIRMED'
  | 'PAY_REMINDER_7'
  | 'PAY_REMINDER_3'
  | 'PAY_REMINDER_1'
  | 'PAY_DUE_TODAY'
  | 'PAY_OVERDUE'
  | 'PAY_FAILED'
  | 'PAY_RECEIPT'
  | 'PAY_AUTO_SCHEDULED'
  // Leases
  | 'LEA_STARTED'
  | 'LEA_EXPIRING_90'
  | 'LEA_EXPIRING_30'
  | 'LEA_RENEWAL_OFFERED'
  | 'LEA_RENEWED'
  | 'LEA_TERMINATED'
  | 'LEA_TERMINATION_APPROVED'
  // Visits
  | 'VIS_CONFIRMED'
  | 'VIS_REMINDER_24H'
  | 'VIS_REMINDER_1H'
  | 'VIS_CANCELLED_BY_LANDLORD'
  | 'VIS_RESCHEDULED'
  // Documents
  | 'DOC_REQUESTED'
  | 'DOC_APPROVED'
  | 'DOC_REJECTED'
  | 'DOC_EXPIRING'
  | 'DOC_CONTRACT_READY'
  // Messages
  | 'MSG_NEW'
  | 'MSG_REPLY'
  // Properties
  | 'FAV_PRICE_DROP'
  | 'FAV_AVAILABLE'
  | 'FAV_ABOUT_TO_RENT'
  | 'SEARCH_NEW_MATCH'
  // Maintenance
  | 'MNT_RECEIVED'
  | 'MNT_IN_PROGRESS'
  | 'MNT_SCHEDULED'
  | 'MNT_COMPLETED'
  // System
  | 'SYS_WELCOME'
  | 'SYS_PROFILE_INCOMPLETE'
  | 'SYS_SCORE_UPDATED'
  | 'SYS_SECURITY_ALERT'
  | 'SYS_NEW_FEATURE';

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

export function getNotificationIcon(type: string): string {
  const iconMap: Record<string, string> = {
    // Applications
    APP_NEW: 'UserPlus',
    APP_SUBMITTED: 'PaperPlaneTilt',
    APP_APPROVED: 'CheckCircle',
    APP_PREAPPROVED: 'CheckCircle',
    APP_REJECTED: 'XCircle',
    APP_DOCS_UPLOADED: 'FileArrowUp',
    APP_DOCS_REQUESTED: 'FileArrowDown',
    APP_UNDER_REVIEW: 'MagnifyingGlass',
    // Payments
    PAY_RECEIVED: 'CurrencyDollar',
    PAY_CONFIRMED: 'CheckCircle',
    PAY_DEPOSITED: 'Bank',
    PAY_OVERDUE: 'Warning',
    PAY_REMINDER_7: 'Bell',
    PAY_REMINDER_3: 'Bell',
    PAY_REMINDER_1: 'Bell',
    PAY_DUE_TODAY: 'Bell',
    PAY_FAILED: 'XCircle',
    // Contracts
    CON_READY: 'FileText',
    CON_TENANT_SIGNED: 'PenNib',
    CON_LANDLORD_SIGNED: 'PenNib',
    CON_COMPLETED: 'CheckCircle',
    CON_PENDING_SIGNATURE: 'PenNib',
    // Visits
    VIS_SCHEDULED: 'Calendar',
    VIS_CONFIRMED: 'CalendarCheck',
    VIS_REMINDER: 'Bell',
    VIS_CANCELLED: 'CalendarX',
    // Properties
    PRO_PUBLISHED: 'Megaphone',
    PRO_VIEWS_MILESTONE: 'Eye',
    FAV_PRICE_DROP: 'Tag',
    // Leases
    LEA_STARTED: 'House',
    LEA_EXPIRING_30: 'Clock',
    LEA_EXPIRING_90: 'Clock',
    // Messages
    MSG_NEW: 'ChatCircle',
    MSG_REPLY: 'ChatCircle',
    // Maintenance
    MNT_REQUEST: 'Wrench',
    MNT_COMPLETED: 'CheckCircle',
    // Verification
    VER_COMPLETED: 'ShieldCheck',
    VER_RED_FLAGS: 'Warning',
    // System
    SYS_WELCOME: 'Sparkle',
    SYS_SECURITY_ALERT: 'Shield',
  };

  return iconMap[type] || 'Bell';
}
