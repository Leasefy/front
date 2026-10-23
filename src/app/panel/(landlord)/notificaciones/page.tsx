'use client';

import { useContratosAdministrados } from '@/components/landlord/ContratosConLaInmobiliaria';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Bell, Check, TrashSimple, Gear, FileText, FileArrowUp, CurrencyDollar, Warning, Calendar, UserPlus, PenNib, Clock } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { IconButton, CrossFade, StaggerItem } from '@leasefy/cadence';
import { PestanasDeEstado, type PestanaDeEstado } from '@/components/pantalla/PestanasDeEstado';
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
    // T-0031 — ícono frozen por contrato (§3.2.C2). Nunca va a la del
    // inquilino: esta notificación no se le envía (contrato §3.2.C).
    CONTRACT_MIGRATION_COMPLETED: FileArrowUp,
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
      <div className="mt-0.5 w-5 h-5 rounded bg-surface-muted flex-shrink-0" />

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
  const { t, formatRelativeDate, locale } = useI18n();
  const router = useRouter();
  const administrados = useContratosAdministrados();
  const deInmobiliaria = administrados.doc !== null;
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

  const cuantosDe = (c: string) => visibleNotifications.filter((n) => n.category === c || (c === 'payment' && n.category === 'alert')).length;

  const getCategoryConfig = (category: LandlordNotificationCategory) => {
    return LANDLORD_CATEGORIES[category] || LANDLORD_CATEGORIES.system;
  };

  return (
    // GLOW UP (21-10-2026): el contenedor y el encabezado común del portal (el mismo de las del inquilino).
    <div className="p-6 lg:p-8">
      {/* Header — QA-PROP-95 (PO-24): a 390 px «Marcar todo como leído» baja de
          renglón (el encabezado común envuelve sus acciones). */}
      <EncabezadoDePantalla
        className="mb-6"
        titulo={t('landlord.notifications.title')}
        // Revisora r25: el conteo de sin leer vive en su pestaña (antes también aquí: «3 sin leer» dos veces).
        descripcion={
          locale === 'es'
            ? 'Lo que pasó con tus inmuebles, tus candidatos y tus pagos.'
            : 'What happened with your properties, your candidates and your payments.'
        }
        acciones={
          <>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" hideArrow onClick={handleMarkAllAsRead}>
                <Check className="w-4 h-4" />
                {t('landlord.notifications.markAllRead')}
              </Button>
            )}
            <IconButton
              variant="ghost"
              icon={<Gear className="w-5 h-5" />}
              aria-label="Configuración"
              onClick={() => router.push('/panel/configuracion/notificaciones')}
            />
          </>
        }
      />

      {/* Revisora r25 (una sola pieza con el inquilino): los filtros son las pestañas de estado de la casa, con su
          conteo y DENTRO de la tarjeta; una categoría sin avisos no aparece (antes ocho pastillas, seis vacías). */}
      {/* Notifications List — cargando → lista, cambiar de filtro o quedar
          vacío cruzan el contenido; dentro de un filtro, marcar o borrar saca
          la fila y las demás se corren (lo que ya estaba no se anima). */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        {notifications.length > 0 && (
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <PestanasDeEstado
              etiqueta={t('landlord.notifications.title')}
              valor={filter}
              onCambio={(v) => setFilter(v)}
              pestanas={(
                [
                  { valor: 'all', etiqueta: t('landlord.notifications.filterAll'), cuantos: visibleNotifications.length, fija: true },
                  { valor: 'unread', etiqueta: t('landlord.notifications.filterUnread'), cuantos: unreadCount, tono: 'aviso' },
                  { valor: 'payment', etiqueta: t('landlord.notifications.filterPayments'), cuantos: cuantosDe('payment') },
                  { valor: 'application', etiqueta: t('landlord.notifications.filterCandidates'), cuantos: cuantosDe('application'), soloIndependiente: true },
                  { valor: 'contract', etiqueta: t('landlord.notifications.filterContracts'), cuantos: cuantosDe('contract') },
                  { valor: 'lease', etiqueta: t('landlord.notifications.filterLeases'), cuantos: cuantosDe('lease'), soloIndependiente: true },
                  { valor: 'visit', etiqueta: t('landlord.notifications.filterVisits'), cuantos: cuantosDe('visit'), soloIndependiente: true },
                  { valor: 'property', etiqueta: t('landlord.notifications.filterProperties'), cuantos: cuantosDe('property'), soloIndependiente: true },
                ] as Array<PestanaDeEstado<FilterType> & { soloIndependiente?: boolean }>
              )
                // QA-PROP-95: candidatos, arriendos, visitas e inmuebles son del propietario independiente.
                .filter((f) => !(deInmobiliaria && f.soloIndependiente))
                .map(({ soloIndependiente: _solo, ...f }) => f)}
            />
          </div>
        )}
        <CrossFade
          className="relative"
          swapKey={
            isLoading
              ? 'cargando'
              : filteredNotifications.length === 0
                ? `vacio-${filter}`
                : `lista-${filter}`
          }
        >
        {isLoading ? (
          // Loading skeleton
          <div>
            {[...Array(5)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
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
          <AnimatePresence initial={false} mode="popLayout">
            {filteredNotifications.map((notification, index) => {
              const IconComponent = getNotificationIcon(notification.type);
              const categoryConfig = getCategoryConfig(notification.category);

              return (
                <StaggerItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex items-start gap-4 px-5 py-4 hover:bg-surface-hover transition-colors cursor-pointer group',
                    index !== filteredNotifications.length - 1 &&
                      'border-b border-border-faint'
                  )}
                >
                  {/* Glow up 22-10: el ícono suelto (antes, en una caja de color) y la no leída con su punto,
                      sin la fila teñida de azul. */}
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
                        'text-sm',
                        !notification.read
                          ? 'text-fg font-medium'
                          : 'text-fg-muted'
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="text-sm text-fg-muted mt-0.5 line-clamp-2 sm:line-clamp-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-caption text-fg-subtle">
                        {formatRelativeDate(notification.createdAt)}
                      </span>
                      {/* Revisora r25: «Sistema» en cada fila no informa; la categoría sólo cuando dice algo. */}
                      {notification.category !== 'system' && (
                        <>
                          <span className="text-fg-subtle">•</span>
                          <span className="text-caption text-fg-subtle">{categoryConfig.label}</span>
                        </>
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

                </StaggerItem>
              );
            })}
          </AnimatePresence>
          )}
        </CrossFade>
      </div>

      {/* Summary */}
      {notifications.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-fg-muted">
          <span>
            {t('landlord.notifications.showingCount', { filtered: filteredNotifications.length, total: notifications.length })}
          </span>
          {notifications.length > 0 && (
            // Revisora r25: el mismo nombre que en el inquilino («Ocultar las leídas»), sin el azul de enlace, y se
            // puede deshacer.
            <Button variant="ghost" size="sm" hideArrow onClick={() => setHideRead((v) => !v)} data-testid="ocultar-las-leidas">
              {hideRead
                ? locale === 'es' ? 'Mostrar las leídas' : 'Show read'
                : locale === 'es' ? 'Ocultar las leídas' : 'Hide read'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
