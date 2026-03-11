'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  TrashSimple,
  Gear,
  CreditCard,
  ChatCircle,
  FileText,
  Calendar,
  House,
  Info,
  CaretRight,
  Checks,
  BellSlash,
  Warning,
  Heart,
  Tag,
  CheckCircle,
  XCircle,
  PaperPlaneTilt,
  MagnifyingGlass,
  PenNib,
  Clock,
  Wrench,
  Sparkle,
  ShieldCheck,
  ArrowRight,
  CalendarCheck,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useTenantNotifications } from '@/lib/hooks/useNotifications';
import { TENANT_CATEGORIES } from '@/lib/types/notification';
import type { TenantNotification, TenantNotificationCategory } from '@/lib/types/notification';
import { EmptyState } from '@/components/ui/empty-state';

// Icon mapping for notification types
const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, typeof Bell> = {
    // Applications
    APP_SUBMITTED: PaperPlaneTilt,
    APP_PREAPPROVED: CheckCircle,
    APP_APPROVED: CheckCircle,
    APP_REJECTED: XCircle,
    APP_DOCS_REQUESTED: FileText,
    APP_UNDER_REVIEW: MagnifyingGlass,
    // Contracts
    CON_READY: FileText,
    CON_PENDING_SIGNATURE: PenNib,
    CON_LANDLORD_SIGNED: PenNib,
    CON_COMPLETED: CheckCircle,
    CON_CANCELLED: XCircle,
    // Payments
    PAY_CONFIRMED: CheckCircle,
    PAY_REMINDER_7: Bell,
    PAY_REMINDER_3: Bell,
    PAY_REMINDER_1: Bell,
    PAY_DUE_TODAY: Warning,
    PAY_OVERDUE: Warning,
    PAY_FAILED: XCircle,
    PAY_RECEIPT: FileText,
    PAY_AUTO_SCHEDULED: CreditCard,
    // Leases
    LEA_STARTED: House,
    LEA_EXPIRING_90: Clock,
    LEA_EXPIRING_30: Clock,
    LEA_RENEWAL_OFFERED: House,
    LEA_RENEWED: CheckCircle,
    LEA_TERMINATED: House,
    LEA_TERMINATION_APPROVED: CheckCircle,
    // Visits
    VIS_CONFIRMED: CalendarCheck,
    VIS_REMINDER_24H: Bell,
    VIS_REMINDER_1H: Bell,
    VIS_CANCELLED_BY_LANDLORD: Calendar,
    VIS_RESCHEDULED: Calendar,
    // Documents
    DOC_REQUESTED: FileText,
    DOC_APPROVED: CheckCircle,
    DOC_REJECTED: XCircle,
    DOC_EXPIRING: Warning,
    DOC_CONTRACT_READY: FileText,
    // Messages
    MSG_NEW: ChatCircle,
    MSG_REPLY: ChatCircle,
    // Properties
    FAV_PRICE_DROP: Tag,
    FAV_AVAILABLE: Heart,
    FAV_ABOUT_TO_RENT: Warning,
    SEARCH_NEW_MATCH: House,
    // Maintenance
    MNT_RECEIVED: Wrench,
    MNT_IN_PROGRESS: Wrench,
    MNT_SCHEDULED: Calendar,
    MNT_COMPLETED: CheckCircle,
    // System
    SYS_WELCOME: Sparkle,
    SYS_PROFILE_INCOMPLETE: Info,
    SYS_SCORE_UPDATED: ShieldCheck,
    SYS_SECURITY_ALERT: ShieldCheck,
    SYS_NEW_FEATURE: Sparkle,
  };

  return iconMap[type] || Bell;
};

// Format relative time
const formatRelativeTime = (dateString: string, locale: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale === 'es') {
    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays < 7) return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? 'semana' : 'semanas'}`;
    return date.toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', { day: 'numeric', month: 'short' });
  } else {
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? 'week' : 'weeks'} ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }
};

type FilterType = 'all' | 'unread' | 'payment' | 'application' | 'message' | 'document';

// Loading skeleton component
function NotificationSkeleton() {
  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] overflow-hidden divide-y divide-neutral-100 dark:divide-white/5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-5 animate-pulse">
          {/* Icon skeleton */}
          <div className="w-11 h-11 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-3/4" />
            <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-1/2" />
            <div className="flex items-center gap-2 mt-2">
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-16" />
              <div className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-20" />
            </div>
          </div>

          {/* Arrow skeleton */}
          <div className="w-5 h-5 rounded bg-neutral-100 dark:bg-neutral-800 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function NotificacionesPage() {
  const { locale } = useI18n();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useTenantNotifications();
  const [filter, setFilter] = useState<FilterType>('all');
  const [hideRead, setHideRead] = useState(false);

  const visibleNotifications = hideRead ? notifications.filter((n) => !n.read) : notifications;
  const filteredNotifications = visibleNotifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'payment') return n.category === 'payment' || n.category === 'reminder';
    return n.category === filter;
  });

  const handleNotificationClick = (notification: TenantNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const getCategoryConfig = (category: TenantNotificationCategory) => {
    return TENANT_CATEGORIES[category] || TENANT_CATEGORIES.system;
  };

  const filters = [
    { id: 'all', label: locale === 'es' ? 'Todas' : 'All' },
    { id: 'unread', label: locale === 'es' ? 'Sin leer' : 'Unread', count: unreadCount },
    { id: 'payment', label: locale === 'es' ? 'Pagos' : 'Payments' },
    { id: 'application', label: locale === 'es' ? 'Aplicaciones' : 'Applications' },
    { id: 'message', label: locale === 'es' ? 'Mensajes' : 'Messages' },
    { id: 'document', label: locale === 'es' ? 'Documentos' : 'Documents' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
                  {locale === 'es' ? 'Notificaciones' : 'Notifications'}
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {unreadCount > 0
                    ? locale === 'es'
                      ? `${unreadCount} sin leer`
                      : `${unreadCount} unread`
                    : locale === 'es'
                    ? 'Todas leídas'
                    : 'All read'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Checks className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {locale === 'es' ? 'Marcar todo' : 'Mark all'}
                  </span>
                </button>
              )}
              <button
                onClick={() => router.push('/inquilino/configuracion')}
                className="p-2.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <Gear className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.header>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as FilterType)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  filter === f.id
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                )}
              >
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      filter === f.id
                        ? 'bg-white/20 dark:bg-neutral-900/20'
                        : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    )}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notifications List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isLoading ? (
            <NotificationSkeleton />
          ) : (
          <AnimatePresence mode="popLayout">
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <EmptyState
                  icon={Bell}
                  title={
                    filter === 'all'
                      ? locale === 'es'
                        ? 'No tienes notificaciones'
                        : 'You have no notifications'
                      : filter === 'unread'
                      ? locale === 'es'
                        ? 'No tienes notificaciones sin leer'
                        : 'You have no unread notifications'
                      : locale === 'es'
                      ? 'No hay notificaciones en esta categoría'
                      : 'No notifications in this category'
                  }
                  description={
                    locale === 'es'
                      ? 'Cuando haya actividad en tus aplicaciones o arriendos, te notificaremos aquí.'
                      : 'When there is activity on your applications or leases, we will notify you here.'
                  }
                  className="rounded-3xl border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c]"
                />
              </motion.div>
            ) : (
              <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] overflow-hidden divide-y divide-neutral-100 dark:divide-white/5">
                {filteredNotifications.map((notification, index) => {
                  const IconComponent = getNotificationIcon(notification.type);
                  const categoryConfig = getCategoryConfig(notification.category);

                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: 0.03 * index, duration: 0.2 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'flex items-start gap-4 p-5 cursor-pointer group transition-colors',
                        !notification.read
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                          : 'hover:bg-neutral-50 dark:hover:bg-white/5'
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                          !notification.read
                            ? 'bg-indigo-600 dark:bg-indigo-500'
                            : cn(categoryConfig.bgColor, categoryConfig.darkBgColor)
                        )}
                      >
                        <IconComponent
                          className={cn(
                            'w-5 h-5',
                            !notification.read ? 'text-white' : categoryConfig.color
                          )}
                          weight={!notification.read ? 'fill' : 'regular'}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm leading-relaxed',
                            !notification.read
                              ? 'text-neutral-900 dark:text-white font-semibold'
                              : 'text-neutral-700 dark:text-neutral-300'
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">
                            {formatRelativeTime(notification.createdAt, locale)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                          <span
                            className={cn('text-xs font-medium', categoryConfig.color)}
                          >
                            {categoryConfig.label}
                          </span>
                          {!notification.read && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                {locale === 'es' ? 'Nueva' : 'New'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {notification.actionLabel && (
                        <div
                          className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              if (notification.actionUrl) {
                                markAsRead(notification.id);
                                router.push(notification.actionUrl);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                          >
                            {notification.actionLabel}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div
                        className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                            title={
                              locale === 'es' ? 'Marcar como leído' : 'Mark as read'
                            }
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title={locale === 'es' ? 'Eliminar' : 'Delete'}
                        >
                          <TrashSimple className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center flex-shrink-0">
                        <CaretRight className="w-5 h-5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-400 dark:group-hover:text-neutral-500 transition-colors" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
          )}
        </motion.div>

        {/* Summary Card */}
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-white/5"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                {locale === 'es'
                  ? `Mostrando ${filteredNotifications.length} de ${notifications.length} notificaciones`
                  : `Showing ${filteredNotifications.length} of ${notifications.length} notifications`}
              </span>
              {notifications.length > 0 && (
                <button
                  onClick={() =>
                    setHideRead(true)
                  }
                  className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 font-medium transition-colors"
                >
                  {locale === 'es' ? 'Limpiar leídas' : 'Clear read'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
