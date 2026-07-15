'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  TrashSimple,
  Gear,
  Users,
  Buildings,
  FileText,
  CurrencyDollar,
  CaretRight,
  Warning,
  Star,
  Wrench,
  Calendar,
  ChatCircle,
  ShieldCheck,
  House,
  Eye,
  Megaphone,
  UserPlus,
  PenNib,
  Bank,
  Clock,
  Sparkle,
  ArrowRight,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
import { IconButton, Chip } from '@leasefy/cadence';
import { EmptyState } from '@/components/ui/empty-state';
import { useLandlordNotifications } from '@/lib/hooks/useNotifications';
import { LANDLORD_CATEGORIES } from '@/lib/types/notification';
import type { LandlordNotification, LandlordNotificationCategory } from '@/lib/types/notification';

/**
 * Icon mapping for notification types.
 * Keys are the canonical codes emitted by the backend (templateCode in
 * prisma/seed-templates.ts). Single source of truth — no aliases.
 */
const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, typeof Bell> = {
    // Applications
    APPLICATION_RECEIVED: UserPlus,
    APPLICATION_APPROVED: Check,
    APPLICATION_REJECTED: Warning,
    APPLICATION_INFO_REQUESTED: FileText,
    APPLICATION_INFO_PROVIDED: FileText,
    // Payments
    PAYMENT_RECEIPT_UPLOADED: CurrencyDollar,
    PAYMENT_APPROVED: Check,
    PAYMENT_REJECTED: Warning,
    PAYMENT_DISPUTE_OPENED: Warning,
    PAYMENT_REMINDER: Clock,
    PAYMENT_OVERDUE: Warning,
    // Visits
    VISIT_REQUESTED: Calendar,
    VISIT_ACCEPTED: Check,
    VISIT_REJECTED: Calendar,
    VISIT_CANCELLED: Calendar,
    VISIT_RESCHEDULED: Calendar,
    VISIT_REMINDER_24H: Bell,
    // Contracts
    CONTRACT_READY_TO_SIGN: PenNib,
    CONTRACT_LANDLORD_SIGNED: PenNib,
    CONTRACT_TENANT_SIGNED: PenNib,
    CONTRACT_COMPLETED: Check,
    // Leases
    LEASE_EXPIRING_SOON: Clock,
    LEASE_EXPIRED: Warning,
  };

  return iconMap[type] || Bell;
};

type FilterType = 'all' | 'unread' | 'payment' | 'application' | 'contract' | 'lease' | 'visit' | 'property';

// Skeleton component for loading state
function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-border-faint animate-pulse">
      {/* Icon skeleton */}
      <div className="w-10 h-10 rounded-xl bg-surface-muted flex-shrink-0" />

      {/* Content skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-surface-muted rounded w-3/4" />
        <div className="h-3 bg-surface-muted rounded w-full" />
        <div className="flex items-center gap-2 mt-2">
          <div className="h-3 bg-surface-muted rounded w-16" />
          <div className="h-3 bg-surface-muted rounded w-20" />
        </div>
      </div>

      {/* Action skeleton */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-md bg-surface-muted" />
        <div className="w-4 h-4 rounded bg-surface-muted" />
      </div>
    </div>
  );
}

export default function NotificacionesPage() {
  const { t, formatRelativeDate } = useI18n();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useLandlordNotifications();
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
    return n.category === filter || (filter === 'payment' && n.category === 'alert');
  });

  const handleNotificationClick = (notification: LandlordNotification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const getCategoryConfig = (category: LandlordNotificationCategory) => {
    return LANDLORD_CATEGORIES[category] || LANDLORD_CATEGORIES.system;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-fg">
            {t('landlord.notifications.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {unreadCount > 0 ? t('landlord.notifications.unreadCount', { count: unreadCount }) : t('landlord.notifications.allRead')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="w-4 h-4" />
              {t('landlord.notifications.markAllRead')}
            </Button>
          )}
          <IconButton
            variant="ghost"
            icon={<Gear className="w-5 h-5" />}
            aria-label="Configuración"
            onClick={() => router.push('/panel/configuracion')}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border overflow-x-auto">
        {[
          { id: 'all', label: t('landlord.notifications.filterAll') },
          { id: 'unread', label: t('landlord.notifications.filterUnread'), count: unreadCount },
          { id: 'payment', label: t('landlord.notifications.filterPayments') },
          { id: 'application', label: t('landlord.notifications.filterCandidates') },
          { id: 'contract', label: t('landlord.notifications.filterContracts') },
          { id: 'lease', label: t('landlord.notifications.filterLeases') },
          { id: 'visit', label: t('landlord.notifications.filterVisits') },
          { id: 'property', label: t('landlord.notifications.filterProperties') },
        ].map((f) => (
          <Chip
            key={f.id}
            selected={filter === f.id}
            onClick={() => setFilter(f.id as FilterType)}
            className="whitespace-nowrap"
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className="tabular-nums">{f.count}</span>
            )}
          </Chip>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          // Loading skeleton
          <div>
            {[...Array(5)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : (
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={
                filter === 'all'
                  ? t('landlord.notifications.emptyAll')
                  : filter === 'unread'
                    ? t('landlord.notifications.emptyUnread')
                    : t('landlord.notifications.emptyCategory')
              }
              description={t('landlord.notifications.emptyDescription')}
              className="border-0 rounded-none bg-transparent"
            />
          ) : (
            filteredNotifications.map((notification, index) => {
              const IconComponent = getNotificationIcon(notification.type);
              const categoryConfig = getCategoryConfig(notification.category);

              return (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex items-start gap-4 px-5 py-4 hover:bg-surface-hover transition-colors cursor-pointer group',
                    index !== filteredNotifications.length - 1 &&
                      'border-b border-border-faint',
                    !notification.read && 'bg-primary-soft/50'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl',
                      categoryConfig.bgColor,
                      categoryConfig.darkBgColor
                    )}
                  >
                    <IconComponent
                      className={cn('w-5 h-5', categoryConfig.color)}
                      weight={!notification.read ? 'fill' : 'regular'}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm',
                        !notification.read
                          ? 'text-fg font-medium'
                          : 'text-fg-muted'
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="text-sm text-fg-muted mt-0.5 line-clamp-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-fg-subtle">
                        {formatRelativeDate(notification.createdAt)}
                      </span>
                      <span className="text-fg-subtle">
                        •
                      </span>
                      <span
                        className={cn(
                          'text-xs font-medium',
                          categoryConfig.color
                        )}
                      >
                        {categoryConfig.label}
                      </span>
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
                        onClick={() => {
                          if (notification.actionUrl) {
                            handleMarkAsRead(notification.id);
                            router.push(notification.actionUrl);
                          }
                        }}
                      >
                        {notification.actionLabel}
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!notification.read && (
                      <IconButton
                        variant="ghost"
                        icon={<Check className="w-4 h-4" />}
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="hover:text-success hover:bg-success-soft"
                        aria-label={t('landlord.notifications.markAsRead')}
                        title={t('landlord.notifications.markAsRead')}
                      />
                    )}
                    <IconButton
                      variant="ghost"
                      icon={<TrashSimple className="w-4 h-4" />}
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="hover:text-danger hover:bg-danger-soft"
                      aria-label={t('landlord.notifications.deleteNotification')}
                      title={t('landlord.notifications.deleteNotification')}
                    />
                  </div>

                  {/* Unread indicator and arrow */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                    <CaretRight className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors" />
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        )}
      </div>

      {/* Summary */}
      {notifications.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-fg-muted">
          <span>
            {t('landlord.notifications.showingCount', { filtered: filteredNotifications.length, total: notifications.length })}
          </span>
          {notifications.length > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setHideRead(true)}
            >
              {t('landlord.notifications.clearRead')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
