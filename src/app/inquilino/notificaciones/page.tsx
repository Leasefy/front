'use client';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { CrossFade, StaggerItem } from '@leasefy/cadence';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
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
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
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
    return date.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { day: 'numeric', month: 'short' });
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
    <div className="rounded-lg border border-border bg-surface overflow-hidden divide-y divide-border">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-5 animate-pulse">
          {/* Icon skeleton */}
          <div className="mt-0.5 w-5 h-5 rounded bg-surface-muted flex-shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-surface-muted rounded-md w-3/4" />
            <div className="h-3 bg-surface-muted rounded-md w-1/2" />
            <div className="flex items-center gap-2 mt-2">
              <div className="h-3 bg-surface-muted rounded-md w-16" />
              <div className="w-1 h-1 rounded-full bg-surface-muted" />
              <div className="h-3 bg-surface-muted rounded-md w-20" />
            </div>
          </div>

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
  // La píldora del filtro activo se desliza al nuevo (antes saltaba).

  // 02-10-2026 · Antes, cualquier fallo decía el mismo texto fijo. Ahora por
  // el traductor: un 4xx dice qué pasó, un 5xx que fue nuestro (con la
  // referencia) y «conexión» sólo si no hubo respuesta.
  const notifyError = (accion: string) => (err: unknown) =>
    toast.error(mensajeParaLaPersona(err, { porDefecto: t('header.notificationActionError'), accion }));
  const handleMarkAsRead = (id: string) =>
    markAsRead(id).catch(notifyError('marcar la notificación como leída'));
  const handleMarkAllAsRead = () => markAllAsRead().catch(notifyError('marcar las notificaciones como leídas'));
  const handleDeleteNotification = (id: string) =>
    deleteNotification(id).catch(notifyError('borrar la notificación'));

  const visibleNotifications = hideRead ? notifications.filter((n) => !n.read) : notifications;
  const hayLeidas = notifications.some((n) => n.read);
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

  const cuantosDe = (c: string) => visibleNotifications.filter((n) => n.category === c).length;

  const filters = [
    { id: 'all', label: locale === 'es' ? 'Todas' : 'All' },
    { id: 'unread', label: locale === 'es' ? 'Sin leer' : 'Unread', count: unreadCount },
    { id: 'payment', label: locale === 'es' ? 'Pagos' : 'Payments' },
    // "Aplicaciones" está muerto: docs/VOCABULARIO.md.
    { id: 'application', label: locale === 'es' ? 'Postulaciones' : 'Applications' },
    { id: 'message', label: locale === 'es' ? 'Mensajes' : 'Messages' },
    { id: 'document', label: locale === 'es' ? 'Documentos' : 'Documents' },
  ];

  return (
    <div className="bg-bg">
      <div className="space-y-6 p-6 lg:p-8">
        {/* GLOW UP 21-10: el encabezado común (sin el ícono en caja ni sus colores fijos). */}
        <EncabezadoDePantalla
          className="mb-8"
          seccion={locale === 'es' ? 'Tu cuenta' : 'Your account'}
          titulo={locale === 'es' ? 'Notificaciones' : 'Notifications'}
          // Revisora r25: el conteo de sin leer vive en su pestaña (antes también aquí: «5 sin leer» dos veces).
          descripcion={
            locale === 'es'
              ? 'Lo que pasó con tu arriendo, tus pagos y tus postulaciones.'
              : 'What happened with your rental, your payments and your applications.'
          }
          acciones={
            <>
              {unreadCount > 0 && (
                // Revisora r27 (CF): el mismo botón que el propietario (antes fantasma, corrido 16 px a 390, y «Marcar todo»).
                <Button variant="outline" size="sm" hideArrow onClick={handleMarkAllAsRead}>
                  <Checks className="w-4 h-4" />
                  <span>{locale === 'es' ? 'Marcar todo como leído' : 'Mark all as read'}</span>
                </Button>
              )}
              <IconButton
                variant="ghost"
                onClick={() => router.push('/inquilino/configuracion')}
                className="p-2.5 rounded-lg text-fg-subtle hover:text-fg-muted hover:bg-surface-muted"
                aria-label={locale === 'es' ? 'Configuración' : 'Settings'}
                icon={<Gear className="w-5 h-5" />}
              />
            </>
          }
        />

        {/* Revisora r25 (una sola pieza con el propietario): los filtros son las pestañas de estado de la casa, con su
            conteo y DENTRO de la tarjeta de la lista; una categoría sin avisos no aparece. */}
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
        {notifications.length > 0 && (
          <div className="border-b border-border px-4 py-3 sm:px-5 empty:hidden">
            <PestanasDeEstado
              etiqueta={locale === 'es' ? 'Filtrar notificaciones' : 'Filter notifications'}
              valor={filter}
              onCambio={(v) => setFilter(v)}
              // Revisora r27 (§3): si todas están sin leer, «Sin leer» diría el mismo número que «Todas»: no sale.
              pestanas={filters
                .filter((f) => !(f.id === 'unread' && unreadCount === visibleNotifications.length && filter !== 'unread'))
                .map((f) => ({
                valor: f.id as FilterType,
                etiqueta: f.label,
                cuantos: f.id === 'all' ? visibleNotifications.length : f.id === 'unread' ? unreadCount : cuantosDe(f.id),
                fija: f.id === 'all',
                tono: f.id === 'unread' ? ('aviso' as const) : undefined,
              }))}
            />
          </div>
        )}
        <CrossFade
          swapKey={
            isLoading
              ? 'cargando'
              : filteredNotifications.length === 0
                ? `vacio-${filter}`
                : `lista-${filter}-${hideRead ? 'sin-leidas' : 'todas'}`
          }
        >
          {isLoading ? (
            <NotificationSkeleton />
          ) : filteredNotifications.length === 0 ? (
              <div>
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
                      ? 'Cuando haya actividad en tus postulaciones o arriendos, te notificaremos aquí.'
                      : 'When there is activity on your applications or leases, we will notify you here.'
                  }
                  className="rounded-lg border-border bg-surface"
                />
              </div>
            ) : (
              <div className="relative divide-y divide-border">
                <AnimatePresence initial={false} mode="popLayout">
                {filteredNotifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type);
                  const categoryConfig = getCategoryConfig(notification.category);

                  return (
                    <StaggerItem
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'flex items-start gap-4 p-5 cursor-pointer group transition-colors hover:bg-surface-muted'
                      )}
                    >
                      {/* El ícono suelto (antes, en una caja de color: azul si no estaba leída) y, si no está
                          leída, su punto: la única marca. */}
                      <div className="relative mt-0.5 flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-fg-muted" aria-hidden="true" />
                        {!notification.read && (
                          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm leading-relaxed',
                            !notification.read
                              ? 'text-fg font-medium'
                              : 'text-fg'
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="text-sm text-fg-muted mt-0.5 line-clamp-2 sm:line-clamp-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-caption text-fg-subtle">
                            {formatRelativeTime(notification.createdAt, locale)}
                          </span>
                          {/* Revisora r25: «Sistema» en cada fila no informa; la categoría sólo cuando dice algo. */}
                          {notification.category !== 'system' && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-surface-muted" />
                              <span className="text-caption text-fg-subtle">{categoryConfig.label}</span>
                            </>
                          )}
                          {!notification.read && (
                            <span className="sr-only">{locale === 'es' ? 'Nueva' : 'New'}</span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {notification.actionLabel && (
                        <div
                          className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            hideArrow
                            onClick={() => {
                              if (notification.actionUrl) {
                                handleMarkAsRead(notification.id);
                                router.push(notification.actionUrl);
                              }
                            }}
                          >
                            {notification.actionLabel}
                          </Button>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div
                        className="flex items-center gap-1 flex-shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!notification.read && (
                          <IconButton
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-2 rounded-md text-fg-subtle hover:text-success hover:bg-success-soft"
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
                          className="p-2 rounded-md text-fg-subtle hover:text-danger hover:bg-danger-soft"
                          title={locale === 'es' ? 'Eliminar' : 'Delete'}
                          aria-label={locale === 'es' ? 'Eliminar' : 'Delete'}
                          icon={<TrashSimple className="w-4 h-4" />}
                        />
                      </div>

                    </StaggerItem>
                  );
                })}
                </AnimatePresence>
              </div>
            )}
        </CrossFade>
        </div>

        {/* El pie en una línea (antes, una caja). «Limpiar leídas» sólo las escondía y no había cómo volver a
            verlas: ahora se ocultan y se muestran. */}
        {/* Revisora r27 (§3): «Mostrando N de M» sólo cuando se ve una parte; «Ocultar las leídas» sólo si hay leídas. */}
        {notifications.length > 0 && (filteredNotifications.length < notifications.length || hayLeidas || hideRead) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-caption text-fg-muted" data-testid="pie-de-notificaciones">
            <span>
              {filteredNotifications.length < notifications.length
                ? locale === 'es'
                  ? `Mostrando ${filteredNotifications.length} de ${notifications.length} notificaciones`
                  : `Showing ${filteredNotifications.length} of ${notifications.length} notifications`
                : null}
            </span>
            {hayLeidas || hideRead ? (
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={() => setHideRead((v) => !v)}
              className="text-fg-muted hover:text-fg"
            >
              {hideRead
                ? locale === 'es' ? 'Mostrar las leídas' : 'Show read'
                : locale === 'es' ? 'Ocultar las leídas' : 'Hide read'}
            </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
