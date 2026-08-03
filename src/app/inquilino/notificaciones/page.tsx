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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useTenantNotifications } from '@/lib/hooks/useNotifications';
import { TENANT_CATEGORIES } from '@/lib/types/notification';
import type { TenantNotification, TenantNotificationCategory } from '@/lib/types/notification';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { IconButton } from '@leasefy/cadence';

/**
 * Icon mapping for notification types.
 * Keys are the canonical codes emitted by the backend (templateCode in
 * prisma/seed-templates.ts). Single source of truth — no aliases.
 */
const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, typeof Bell> = {
    // Applications
    APPLICATION_RECEIVED: PaperPlaneTilt,
    APPLICATION_APPROVED: CheckCircle,
    APPLICATION_REJECTED: XCircle,
    APPLICATION_INFO_REQUESTED: FileText,
    APPLICATION_INFO_PROVIDED: FileText,
    // Payments
    PAYMENT_RECEIPT_UPLOADED: FileText,
    PAYMENT_APPROVED: CheckCircle,
    PAYMENT_REJECTED: XCircle,
    PAYMENT_DISPUTE_OPENED: Warning,
    PAYMENT_REMINDER: Bell,
    PAYMENT_OVERDUE: Warning,
    // Visits
    VISIT_REQUESTED: Calendar,
    VISIT_ACCEPTED: CalendarCheck,
    VISIT_REJECTED: XCircle,
    VISIT_CANCELLED: Calendar,
    VISIT_RESCHEDULED: Calendar,
    VISIT_REMINDER_24H: Bell,
    // Contracts
    CONTRACT_READY_TO_SIGN: PenNib,
    CONTRACT_LANDLORD_SIGNED: PenNib,
    CONTRACT_TENANT_SIGNED: PenNib,
    CONTRACT_COMPLETED: CheckCircle,
    // Leases
    LEASE_EXPIRING_SOON: Clock,
    LEASE_EXPIRED: Warning,
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
    <div className="rounded-xl border border-border dark:border-white/10 bg-surface dark:bg-[#1a1a1c] overflow-hidden divide-y divide-border dark:divide-white/5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-5 animate-pulse">
          {/* Icon skeleton */}
          <div className="w-11 h-11 rounded-xl bg-surface-muted dark:bg-surface-muted flex-shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-surface-muted dark:bg-surface-muted rounded-md w-3/4" />
            <div className="h-3 bg-surface-muted dark:bg-ink rounded-md w-1/2" />
            <div className="flex items-center gap-2 mt-2">
              <div className="h-3 bg-surface-muted dark:bg-ink rounded-md w-16" />
              <div className="w-1 h-1 rounded-full bg-surface-muted dark:bg-surface-muted" />
              <div className="h-3 bg-surface-muted dark:bg-ink rounded-md w-20" />
            </div>
          </div>

          {/* Arrow skeleton */}
          <div className="w-5 h-5 rounded bg-surface-muted dark:bg-ink flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function NotificacionesPage() {
  const { locale, t } = useI18n();
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

  const notifyError = () => toast.error(t('header.notificationActionError'));
  const handleMarkAsRead = (id: string) => markAsRead(id).catch(notifyError);
  const handleMarkAllAsRead = () => markAllAsRead().catch(notifyError);
  const handleDeleteNotification = (id: string) => deleteNotification(id).catch(notifyError);

  const visibleNotifications = hideRead ? notifications.filter((n) => !n.read) : notifications;
  const filteredNotifications = visibleNotifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    if (filter === 'payment') return n.category === 'payment' || n.category === 'reminder';
    return n.category === filter;
  });

  const handleNotificationClick = (notification: TenantNotification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
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
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
                <Bell className="w-6 h-6 text-[#1A40FF] dark:text-[#5570FF]" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-fg dark:text-white tracking-tight">
                  {locale === 'es' ? 'Notificaciones' : 'Notifications'}
                </h1>
                <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5">
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
                <Button
                  variant="ghost"
                  size="sm"
                  hideArrow
                  onClick={handleMarkAllAsRead}
                >
                  <Checks className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {locale === 'es' ? 'Marcar todo' : 'Mark all'}
                  </span>
                </Button>
              )}
              <IconButton
                variant="ghost"
                onClick={() => router.push('/inquilino/configuracion')}
                className="p-2.5 rounded-xl text-fg-subtle dark:text-fg-muted hover:text-fg-muted dark:hover:text-fg-subtle hover:bg-surface-muted dark:hover:bg-surface/5"
                aria-label={locale === 'es' ? 'Configuración' : 'Settings'}
                icon={<Gear className="w-5 h-5" />}
              />
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
                    ? 'bg-ink dark:bg-surface text-white dark:text-fg'
                    : 'bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-surface-muted'
                )}
              >
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      filter === f.id
                        ? 'bg-surface/20 dark:bg-ink/20'
                        : 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-[#1A40FF] dark:text-[#5570FF]'
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
                  className="rounded-xl border-border dark:border-white/10 bg-surface dark:bg-[#1a1a1c]"
                />
              </motion.div>
            ) : (
              <div className="rounded-xl border border-border dark:border-white/10 bg-surface dark:bg-[#1a1a1c] overflow-hidden divide-y divide-border dark:divide-white/5">
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
                          ? 'bg-[#EEF1FF]/50 dark:bg-[#1A40FF]/20 hover:bg-[#EEF1FF] dark:hover:bg-[#1A40FF]/30'
                          : 'hover:bg-surface-muted dark:hover:bg-surface/5'
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                          !notification.read
                            ? 'bg-[#1A40FF] dark:bg-[#5570FF]'
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
                              ? 'text-fg dark:text-white font-semibold'
                              : 'text-fg dark:text-fg-subtle'
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5 line-clamp-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-fg-subtle dark:text-fg-muted">
                            {formatRelativeTime(notification.createdAt, locale)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-surface-muted dark:bg-surface-muted" />
                          <span
                            className={cn('text-xs font-medium', categoryConfig.color)}
                          >
                            {categoryConfig.label}
                          </span>
                          {!notification.read && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-surface-muted dark:bg-surface-muted" />
                              <span className="text-xs font-medium text-[#1A40FF] dark:text-[#5570FF]">
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
                          <Button
                            variant="secondary"
                            size="sm"
                            hideArrow
                            onClick={() => {
                              if (notification.actionUrl) {
                                handleMarkAsRead(notification.id);
                                router.push(notification.actionUrl);
                              }
                            }}
                            className="px-3 py-1.5 text-xs text-[#1A40FF] dark:text-[#5570FF] bg-[#EEF1FF] dark:bg-[#1A40FF]/15"
                          >
                            {notification.actionLabel}
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div
                        className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!notification.read && (
                          <IconButton
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-2 rounded-md text-fg-subtle hover:text-[#2C7A53] dark:hover:text-[#2C7A53] hover:bg-[#E8F3EC] dark:hover:bg-[#2C7A53]/30"
                            title={
                              locale === 'es' ? 'Marcar como leído' : 'Mark as read'
                            }
                            aria-label={
                              locale === 'es' ? 'Marcar como leído' : 'Mark as read'
                            }
                            icon={<Check className="w-4 h-4" />}
                          />
                        )}
                        <IconButton
                          variant="ghost"
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="p-2 rounded-md text-fg-subtle hover:text-[#C4503B] dark:hover:text-[#C4503B] hover:bg-[#F8EAE7] dark:hover:bg-[#C4503B]/30"
                          title={locale === 'es' ? 'Eliminar' : 'Delete'}
                          aria-label={locale === 'es' ? 'Eliminar' : 'Delete'}
                          icon={<TrashSimple className="w-4 h-4" />}
                        />
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center flex-shrink-0">
                        <CaretRight className="w-5 h-5 text-fg-subtle dark:text-fg-muted group-hover:text-fg-subtle dark:group-hover:text-fg-muted transition-colors" />
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
            className="mt-6 p-4 rounded-xl bg-surface-muted dark:bg-ink/50 border border-border-faint dark:border-white/5"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted dark:text-fg-subtle">
                {locale === 'es'
                  ? `Mostrando ${filteredNotifications.length} de ${notifications.length} notificaciones`
                  : `Showing ${filteredNotifications.length} of ${notifications.length} notifications`}
              </span>
              {notifications.length > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  hideArrow
                  onClick={() => setHideRead(true)}
                  className="text-fg-muted hover:text-fg dark:hover:text-fg-subtle"
                >
                  {locale === 'es' ? 'Limpiar leídas' : 'Clear read'}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
