'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/toast';
import { Wrench, Plus, CurrencyDollar, SquaresFour, Kanban } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@leasefy/cadence';
import { Cajon, CajonCabecera } from '@/components/ui/cajon';
import type { SolicitudMantenimiento, MantenimientoStatus } from '@/lib/types/inmobiliaria';
import {
  useMantenimientos,
  useConsignaciones,
  mantenimientoApi,
} from '@/lib/hooks/useInmobiliaria';
import {
  MantenimientoList,
  MantenimientoKanban,
  MantenimientoForm,
  MantenimientoViewer,
  type MantenimientoFormData,
} from '@/components/inmobiliaria';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';

// ============================================================================
// Types
// ============================================================================

type MantenimientoViewMode = 'cards' | 'kanban';

/**
 * ── Cómo se llama esta pantalla ────────────────────────────────────────────
 *
 * En el menú esta ruta se llama **Mantenimientos**, y eso es lo único que hay
 * acá: las solicitudes de arreglo de los inmuebles. Antes compartía la pantalla
 * con dos pestañas que no tenían nada que ver con arreglar nada —Renovaciones
 * y Calculadora de IPC—, con un `?tab=` en la URL y un H1 que cambiaba según
 * la pestaña. Entrabas por «Mantenimientos» y te recibía otra cosa.
 *
 * Cada una de esas dos tiene ya su propio lugar: Renovaciones es una ruta de
 * primer nivel (`/panel/inmobiliaria/contratos/renovaciones`) y el IPC se
 * calcula ahí mismo, dentro del cajón de cada renovación, que es el único
 * momento en que hace falta. Por eso acá no queda barra de pestañas ni
 * `?tab=`: una pestaña sola no es una pestaña, es la pantalla (Nico,
 * 2026-09-08: «eso ya tiene su propio lugar»).
 *
 * Sin «Recordatorios»: era una fachada —un switch que no guardaba nada y una
 * lista de tipos vacía— sin nada en el back que la leyera. Los días de aviso
 * reales se configuran en Configuración › Perfil de la agencia
 * (`reminderDaysBefore/After`) y los envíos los hace Cobranza (Nico,
 * 2026-09-03: «eso de configuración de recordatorios no funciona»).
 */

// ============================================================================
// Helper Functions
// ============================================================================

function getQuickStats(mantenimientos: SolicitudMantenimiento[]) {
  const activeMantenimientos = mantenimientos.filter((m) =>
    ['reported', 'quoted', 'approved', 'in_progress'].includes(m.status)
  );
  const quotedMantenimientos = mantenimientos.filter((m) => m.status === 'quoted');

  return {
    active: activeMantenimientos.length,
    quoted: quotedMantenimientos.length,
  };
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  subValueColor?: 'warning' | 'info' | 'default';
  bgColor: string;
  iconColor: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  subValueColor = 'default',
  bgColor,
  iconColor,
}: StatCardProps) {
  const subValueColors = {
    warning: 'text-warning font-medium',
    info: 'text-primary',
    default: 'text-muted-foreground',
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-md flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subValue && (
            <p className={cn('text-xs mt-0.5', subValueColors[subValueColor])}>
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * MantenimientosPage — las solicitudes de mantenimiento de la inmobiliaria.
 * Route: /panel/inmobiliaria/mantenimientos
 */
function MantenimientosContent() {
  const { t } = useI18n();

  // API Hooks
  // `errorCrudo` y no `error`: el string es sólo el mensaje, y sin el status
  // no se puede saber si reintentar sirve.
  const {
    mantenimientos: mantenimientosData,
    isLoading: isLoadingMantenimientos,
    errorCrudo: mantenimientosError,
    refetch: refetchMantenimientos,
  } = useMantenimientos();
  const {
    consignaciones: consignacionesData,
    isLoading: isLoadingConsignaciones,
    errorCrudo: consignacionesError,
  } = useConsignaciones();

  const [mantenimientoView, setMantenimientoView] = useState<MantenimientoViewMode>('kanban');

  // Los KPI de arriba y la lista salen de la misma consulta: un solo
  // «Reintentar» arregla las dos cosas.
  const reintentar = useCallback(() => {
    void refetchMantenimientos();
  }, [refetchMantenimientos]);

  // Use API data or fallback to empty arrays
  const mantenimientos = mantenimientosData ?? [];
  const consignaciones = consignacionesData ?? [];

  // Modal states
  const [selectedMantenimiento, setSelectedMantenimiento] = useState<SolicitudMantenimiento | null>(null);
  const [isMantenimientoViewerOpen, setIsMantenimientoViewerOpen] = useState(false);
  const [isMantenimientoFormOpen, setIsMantenimientoFormOpen] = useState(false);
  const [isSubmittingMantenimiento, setIsSubmittingMantenimiento] = useState(false);

  // Calculate quick stats
  const stats = useMemo(() => getQuickStats(mantenimientos), [mantenimientos]);

  /*
   * Después de cada mutación se relee del servidor, en vez de parchear la fila
   * a mano con lo que suponemos que quedó.
   *
   * Los parches inventaban fechas (`updatedAt`/`completedAt` con `new Date()`)
   * y campos derivados (`approvedAmount` copiado de la cotización): eso lo
   * decide el backend, que además puede rechazar la transición. Y los KPI de
   * arriba se calculan de esta misma lista, así que un parche mal puesto
   * también corre los contadores.
   *
   * El cajón muestra UN ítem tomado de la lista: hay que volver a apuntarlo a
   * la fila fresca o queda mostrando lo viejo sobre una lista ya actualizada.
   */
  const recargarMantenimientos = useCallback(async () => {
    const frescos = await refetchMantenimientos();
    if (!frescos) return;
    setSelectedMantenimiento((actual) =>
      actual ? frescos.find((m) => m.id === actual.id) ?? actual : actual,
    );
  }, [refetchMantenimientos]);

  // Handlers - Mantenimiento
  const handleViewMantenimiento = useCallback((solicitud: SolicitudMantenimiento) => {
    setSelectedMantenimiento(solicitud);
    setIsMantenimientoViewerOpen(true);
  }, []);

  const handleNewMantenimiento = useCallback(() => {
    setIsMantenimientoFormOpen(true);
  }, []);

  const handleMantenimientoFormSubmit = useCallback(async (data: MantenimientoFormData) => {
    setIsSubmittingMantenimiento(true);

    try {
      await mantenimientoApi.create({
        consignacionId: data.consignacionId,
        type: data.type,
        priority: data.priority,
        title: data.title,
        description: data.description,
        photoUrls: data.photoUrls,
        paidBy: data.paidBy,
      });

      await recargarMantenimientos();

      setIsSubmittingMantenimiento(false);
      setIsMantenimientoFormOpen(false);
      toast.success(t('inmobiliaria.operaciones.toasts.requestCreated'), {
        description: t('inmobiliaria.operaciones.toasts.requestCreatedDesc', { title: data.title }),
      });
    } catch (error) {
      toast.error('Error al crear solicitud de mantenimiento');
      setIsSubmittingMantenimiento(false);
    }
  }, [t, recargarMantenimientos]);

  const handleMantenimientoFormCancel = useCallback(() => {
    setIsMantenimientoFormOpen(false);
  }, []);

  const handleMantenimientoViewerClose = useCallback(() => {
    setIsMantenimientoViewerOpen(false);
    setTimeout(() => setSelectedMantenimiento(null), 300);
  }, []);

  const handleMantenimientoStatusChange = useCallback(
    async (solicitudId: string, newStatus: MantenimientoStatus) => {
      try {
        await mantenimientoApi.updateStatus(solicitudId, newStatus);
        await recargarMantenimientos();

        const statusLabels: Record<MantenimientoStatus, string> = {
          reported: t('inmobiliaria.operaciones.maintenance.status.pending'),
          quoted: t('inmobiliaria.operaciones.toasts.statusQuoted'),
          approved: t('inmobiliaria.operaciones.toasts.statusApproved'),
          in_progress: t('inmobiliaria.operaciones.maintenance.status.inProgress'),
          completed: t('inmobiliaria.operaciones.maintenance.status.completed'),
          cancelled: t('inmobiliaria.operaciones.maintenance.status.cancelled'),
        };

        toast.success(t('inmobiliaria.operaciones.toasts.statusUpdated', { status: statusLabels[newStatus] }));

        if (newStatus === 'cancelled' || newStatus === 'completed') {
          handleMantenimientoViewerClose();
        }
      } catch (error) {
        toast.error('Error al actualizar estado de mantenimiento');
      }
    },
    [t, recargarMantenimientos, handleMantenimientoViewerClose]
  );

  const handleApproveQuote = useCallback(async (solicitudId: string, quoteId: string) => {
    try {
      await mantenimientoApi.approveQuote(solicitudId, quoteId);
      await recargarMantenimientos();
      toast.success(t('inmobiliaria.operaciones.toasts.quoteApproved'));
    } catch (error) {
      toast.error('Error al aprobar cotización');
    }
  }, [t, recargarMantenimientos]);

  const handleRequestQuote = useCallback((solicitudId: string) => {
    toast.info(t('inmobiliaria.operaciones.toasts.featureInDevelopment'), {
      description: t('inmobiliaria.operaciones.toasts.featureInDevelopmentDesc'),
    });
  }, []);

  // Consignaciones for form (rented properties only)
  const rentedConsignaciones = useMemo(
    () => consignaciones.filter((c) => c.availability === 'rented'),
    [consignaciones]
  );

  // Show loading state
  const isLoading = isLoadingMantenimientos || isLoadingConsignaciones;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header — el nombre del menú y nada más. Antes decía la pestaña en la
          que estabas, y antes de eso siempre «Operaciones», que no es como se
          llama esto en ningún menú. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">Mantenimientos</h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            Las solicitudes de arreglo de tus inmuebles, desde que entran hasta que se cierran.
          </p>
        </div>
        {/* La acción principal va arriba a la derecha, como en el resto de las
            páginas (Inmuebles, Contratos…). Antes estaba metida en la barra de
            pestañas de la tabla: «raro» (Nico, 2026-09-03). */}
        <div className="flex items-center gap-2 shrink-0">
          <Button hideArrow onClick={handleNewMantenimiento} data-testid="nueva-solicitud">
            <Plus className="w-4 h-4" />
            {t('inmobiliaria.operaciones.maintenance.new')}
          </Button>
        </div>
      </div>

      {/* El cartel rojo que había acá decía lo mismo para cualquier fallo, no
          ofrecía nada que apretar y convivía con los KPI en cero: la pantalla
          decía «falló» y «no hay nada» al mismo tiempo. Ahora el fallo se
          cuenta donde vive —en la lista, con su «Reintentar»— y los números
          que no se pudieron traer no se inventan. */}

      {/* Quick Stats - Informational Only */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-8 bg-muted rounded w-12" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {/* Un cero que en realidad es «no lo pudimos traer» afirma algo
              falso, y encima tranquiliza: «no tienes nada pendiente». Cuando
              la consulta falló va una raya. */}
          <StatCard
            icon={Wrench}
            label={t('inmobiliaria.operaciones.stats.activeMaintenance')}
            value={mantenimientosError ? '—' : stats.active}
            subValue={
              mantenimientosError
                ? 'No se pudo traer'
                : stats.quoted > 0
                  ? t('inmobiliaria.operaciones.stats.toApproveCount', { count: stats.quoted })
                  : undefined
            }
            subValueColor={stats.quoted > 0 && !mantenimientosError ? 'info' : 'default'}
            bgColor="bg-primary-soft"
            iconColor="text-primary"
          />
          <StatCard
            icon={CurrencyDollar}
            label={t('inmobiliaria.operaciones.stats.pendingQuotes')}
            value={mantenimientosError ? '—' : stats.quoted}
            subValue={mantenimientosError ? 'No se pudo traer' : undefined}
            bgColor="bg-neutral-100 dark:bg-neutral-800"
            iconColor="text-neutral-600 dark:text-neutral-300"
          />
        </motion.div>
      )}

      {/* Las solicitudes, directo en la tarjeta: sin barra de pestañas porque
          ya no hay entre qué elegir. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card"
      >
        {/* View Toggle */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {/* El conteo se calla si no se pudo traer: «0 solicitudes
                  activas» sobre una consulta muerta es tranquilizar con
                  un dato que nadie tiene. */}
              {mantenimientosError ? (
                <span className="text-fg-muted">Solicitudes sin cargar</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {mantenimientos.filter((m) => m.status !== 'completed' && m.status !== 'cancelled').length}
                  </span>
                  {' '}{t('inmobiliaria.operaciones.maintenance.activeRequests')}
                  {mantenimientos.filter((m) => m.status === 'quoted').length > 0 && (
                    <span className="ml-2 text-primary">
                      ({t('inmobiliaria.operaciones.stats.toApproveCount', { count: mantenimientos.filter((m) => m.status === 'quoted').length })})
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <SegmentedControl<MantenimientoViewMode>
            value={mantenimientoView}
            onChange={setMantenimientoView}
            options={[
              {
                value: 'kanban',
                ariaLabel: t('inmobiliaria.operaciones.maintenance.kanbanView'),
                label: (
                  <span className="flex items-center gap-2">
                    <Kanban className="w-4 h-4" />
                    {t('inmobiliaria.operaciones.maintenance.kanbanView')}
                  </span>
                ),
              },
              {
                value: 'cards',
                ariaLabel: t('inmobiliaria.operaciones.maintenance.listView'),
                label: (
                  <span className="flex items-center gap-2">
                    <SquaresFour className="w-4 h-4" />
                    {t('inmobiliaria.operaciones.maintenance.listView')}
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Content based on view mode — `EstadoDeDatos` es la forma canónica
            de ordenar los cuatro estados (cargando → falló → vacío → datos):
            sin esto, una consulta que falló entraba a la lista como `[]` y la
            pantalla decía «no hay nada», el vacío tapando el fallo. */}
        <EstadoDeDatos
          cargando={isLoadingMantenimientos}
          error={mantenimientosError}
          queEs="las solicitudes de mantenimiento"
          onReintentar={reintentar}
          esqueleto={<EsqueletoTabla columnas={4} filas={4} />}
        >
          <AnimatePresence mode="wait">
            {mantenimientoView === 'kanban' ? (
              <motion.div
                key="kanban"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-5"
              >
                <MantenimientoKanban
                  data={mantenimientos}
                  onViewDetails={handleViewMantenimiento}
                />
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <MantenimientoList
                  data={mantenimientos}
                  onViewDetails={handleViewMantenimiento}
                  onComplete={(s) => handleMantenimientoStatusChange(s.id, 'completed')}
                  onCancel={(s) => handleMantenimientoStatusChange(s.id, 'cancelled')}
                  minimal
                />
              </motion.div>
            )}
          </AnimatePresence>
        </EstadoDeDatos>
      </motion.div>

      {/* Mantenimiento Viewer Sheet
          Sin `onAddNote`: no hay endpoint de notas para mantenimientos, así que
          el viewer esconde ese botón en vez de fingir que la guardó. */}
      <MantenimientoViewer
        solicitud={selectedMantenimiento}
        isOpen={isMantenimientoViewerOpen}
        onClose={handleMantenimientoViewerClose}
        onStatusChange={handleMantenimientoStatusChange}
        onApproveQuote={handleApproveQuote}
        onRequestQuote={handleRequestQuote}
      />

      {/* Mantenimiento Form Sheet */}
      {/* El cajón de la casa: cabecera fija, cuerpo con scroll, pie fijo con
          «Crear solicitud» y lo que falta (Nico, 2026-09-08). */}
      <Cajon abierto={isMantenimientoFormOpen} onOpenChange={setIsMantenimientoFormOpen} data-testid="nueva-solicitud-cajon">
        <CajonCabecera
          titulo={t('inmobiliaria.operaciones.maintenance.newRequest')}
          descripcion={t('inmobiliaria.operaciones.maintenance.newRequestDesc')}
        />
        <MantenimientoForm
          consignaciones={rentedConsignaciones}
          onSubmit={handleMantenimientoFormSubmit}
          onCancel={handleMantenimientoFormCancel}
          isSubmitting={isSubmittingMantenimiento}
        />
      </Cajon>
    </div>
  );
}

// Sin `useSearchParams` ya no hace falta el límite de Suspense que exigía
// `next build` para prerenderizar esta ruta.
export default function MantenimientosPage() {
  return (
    <PageGuard module="operaciones">
      <MantenimientosContent />
    </PageGuard>
  );
}
