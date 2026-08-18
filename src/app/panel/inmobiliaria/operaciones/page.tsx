'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { Suspense, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Wrench,
  ArrowsClockwise,
  Calculator,
  Plus,
  ClockCounterClockwise,
  HouseLine,
  Warning,
  CurrencyDollar,
  Funnel,
  CheckCircle,
  Clock,
  TrendUp,
  ChartLine,
  Buildings,
  CalendarBlank,
  CaretDown,
  MagnifyingGlass,
  SquaresFour,
  Kanban,
  Bell,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl } from '@leasefy/cadence';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type {
  Renovacion,
  SolicitudMantenimiento,
  MantenimientoStatus,
  Consignacion,
} from '@/lib/types/inmobiliaria';
import { formatCurrency, getRenovacionStatusLabel } from '@/lib/types/inmobiliaria';
import { getCurrentIPC } from '@/lib/constants/inmobiliaria-data';
import {
  useMantenimientos,
  useRenovaciones,
  useConsignaciones,
  mantenimientoApi,
  renovacionesApi,
} from '@/lib/hooks/useInmobiliaria';
import {
  RenovacionesTable,
  RenovacionWorkflow,
  IPCCalculator,
  MantenimientoList,
  MantenimientoKanban,
  MantenimientoForm,
  MantenimientoViewer,
  type MantenimientoFormData,
} from '@/components/inmobiliaria';
import { ReminderConfigPanel } from '@/components/inmobiliaria/reminders/ReminderConfig';
import { ReminderLog } from '@/components/inmobiliaria/reminders/ReminderLog';
import type { ReminderConfig } from '@/lib/types/reminders';

const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  globalEnabled: false,
  types: [],
};
import { FeatureGate } from '@/components/inmobiliaria/UpgradePrompt';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';

// ============================================================================
// Types
// ============================================================================

type TabValue = 'renovaciones' | 'mantenimiento' | 'ipc' | 'recordatorios';
type MantenimientoViewMode = 'cards' | 'kanban';

/**
 * ── Cómo se llama esta pantalla ────────────────────────────────────────────
 *
 * En el menú esta ruta se llama **Mantenimientos**, pero el H1 decía
 * «Operaciones» y abría en la pestaña de Renovaciones. Resultado: entrabas por
 * «Mantenimientos» y la pantalla te recibía con otro nombre y con «No hay
 * renovaciones». Tres cosas distintas para el mismo clic.
 *
 * Ahora la pestaña ES el lugar: vive en `?tab=`, se puede compartir y sobrevive
 * a un F5, y el encabezado dice el nombre de la pestaña en la que estás. El
 * default es `mantenimiento`, que es lo que promete el menú — Renovaciones
 * tiene su propia ruta de primer nivel (`/panel/inmobiliaria/renovaciones`),
 * creada justamente para dejar de estar enterrada acá adentro.
 */
const TABS: TabValue[] = ['mantenimiento', 'renovaciones', 'ipc', 'recordatorios'];
const TAB_POR_DEFECTO: TabValue = 'mantenimiento';

const ENCABEZADO: Record<TabValue, { titulo: string; bajada: string }> = {
  mantenimiento: {
    titulo: 'Mantenimientos',
    bajada: 'Las solicitudes de arreglo de tus inmuebles, desde que entran hasta que se cierran.',
  },
  renovaciones: {
    titulo: 'Renovaciones',
    bajada: 'Los contratos que están por vencer y en qué va cada renovación.',
  },
  ipc: {
    titulo: 'Calculadora de IPC',
    bajada: 'Calculá el canon del año que viene con el IPC vigente.',
  },
  recordatorios: {
    titulo: 'Recordatorios',
    bajada: 'Qué se avisa solo, a quién y cuándo.',
  },
};

function esTab(v: string | null): v is TabValue {
  return v !== null && (TABS as string[]).includes(v);
}

// ============================================================================
// Helper Functions
// ============================================================================

function getQuickStats(renovaciones: Renovacion[], mantenimientos: SolicitudMantenimiento[]) {
  const pendingRenovaciones = renovaciones.filter((r) =>
    ['pending', 'notified', 'negotiating'].includes(r.status)
  );
  const criticalRenovaciones = pendingRenovaciones.filter((r) => r.urgencyBucket === '0-30');
  const urgentRenovaciones = pendingRenovaciones.filter((r) => r.urgencyBucket === '31-60');

  const activeMantenimientos = mantenimientos.filter((m) =>
    ['reported', 'quoted', 'approved', 'in_progress'].includes(m.status)
  );
  const quotedMantenimientos = mantenimientos.filter((m) => m.status === 'quoted');

  const currentIPC = getCurrentIPC();

  return {
    renovaciones: {
      pending: pendingRenovaciones.length,
      critical: criticalRenovaciones.length,
      urgent: urgentRenovaciones.length,
    },
    mantenimiento: {
      active: activeMantenimientos.length,
      quoted: quotedMantenimientos.length,
    },
    ipc: {
      currentRate: currentIPC.rate,
      description: currentIPC.description,
    },
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
    <div className="p-4 rounded-xl border border-border bg-card">
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
 * OperacionesPage - Operations center for the inmobiliaria module
 * Route: /panel/inmobiliaria/operaciones
 */
function OperacionesContent() {
  const { t } = useI18n();

  // API Hooks
  // `errorCrudo` y no `error`: el string es sólo el mensaje, y sin el status
  // no se puede saber si reintentar sirve.
  const {
    renovaciones: renovacionesData,
    isLoading: isLoadingRenovaciones,
    errorCrudo: renovacionesError,
    refetch: refetchRenovaciones,
  } = useRenovaciones();
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

  // State — la pestaña vive en la URL: es un lugar, no una preferencia.
  const router = useRouter();
  const searchParams = useSearchParams();
  const pedida = searchParams.get('tab');
  const activeTab: TabValue = esTab(pedida) ? pedida : TAB_POR_DEFECTO;
  const setTab = useCallback(
    (v: TabValue) => {
      // `replace`, no `push`: cambiar de pestaña no es navegar, y llenar el
      // historial obliga a apretar «atrás» una vez por pestaña mirada.
      router.replace(`/panel/inmobiliaria/operaciones?tab=${v}`, { scroll: false });
    },
    [router],
  );
  const [mantenimientoView, setMantenimientoView] = useState<MantenimientoViewMode>('kanban');

  /**
   * Reintentar es de la PÁGINA, no de la pestaña.
   *
   * Los KPI de arriba mezclan renovaciones y mantenimientos, y se ven desde
   * cualquier pestaña. Si el botón sólo recargara lo de la pestaña activa,
   * el KPI de la otra se quedaba en «—» sin nada que apretar para arreglarlo:
   * había que adivinar que la salida era cambiar de pestaña. Medido.
   */
  const reintentar = useCallback(() => {
    void refetchRenovaciones();
    void refetchMantenimientos();
  }, [refetchRenovaciones, refetchMantenimientos]);

  // Use API data or fallback to empty arrays
  const renovaciones = renovacionesData ?? [];
  const mantenimientos = mantenimientosData ?? [];
  const consignaciones = consignacionesData ?? [];

  // Modal states
  const [selectedRenovacion, setSelectedRenovacion] = useState<Renovacion | null>(null);
  const [isRenovacionWorkflowOpen, setIsRenovacionWorkflowOpen] = useState(false);
  const [selectedMantenimiento, setSelectedMantenimiento] = useState<SolicitudMantenimiento | null>(null);
  const [isMantenimientoViewerOpen, setIsMantenimientoViewerOpen] = useState(false);
  const [isMantenimientoFormOpen, setIsMantenimientoFormOpen] = useState(false);
  const [isSubmittingMantenimiento, setIsSubmittingMantenimiento] = useState(false);

  // Calculate quick stats
  const stats = useMemo(
    () => getQuickStats(renovaciones, mantenimientos),
    [renovaciones, mantenimientos]
  );

  // Handlers - Renovaciones
  const handleStartRenewal = useCallback((renovacion: Renovacion) => {
    setSelectedRenovacion(renovacion);
    setIsRenovacionWorkflowOpen(true);
  }, []);

  /*
   * Después de cada mutación se relee del servidor, en vez de parchear la fila
   * a mano con lo que suponemos que quedó.
   *
   * Los parches inventaban fechas (`notifiedAt`/`updatedAt`/`completedAt` con
   * `new Date()`) y campos derivados (`approvedAmount` copiado de la
   * cotización): eso lo decide el backend, que además puede rechazar la
   * transición. Y los KPI de arriba se calculan de estas dos listas, así que
   * un parche mal puesto también corre los contadores.
   *
   * El drawer muestra UN ítem tomado de la lista: hay que volver a apuntarlo a
   * la fila fresca o queda mostrando lo viejo sobre una lista ya actualizada.
   */
  const recargarRenovaciones = useCallback(async () => {
    const frescas = await refetchRenovaciones();
    if (!frescas) return;
    setSelectedRenovacion((actual) =>
      actual ? frescas.find((r) => r.id === actual.id) ?? actual : actual,
    );
  }, [refetchRenovaciones]);

  const recargarMantenimientos = useCallback(async () => {
    const frescos = await refetchMantenimientos();
    if (!frescos) return;
    setSelectedMantenimiento((actual) =>
      actual ? frescos.find((m) => m.id === actual.id) ?? actual : actual,
    );
  }, [refetchMantenimientos]);

  const handleNotifyTenant = useCallback(async (renovacion: Renovacion) => {
    try {
      await renovacionesApi.updateStage(renovacion.id, { status: 'notified' });
      await recargarRenovaciones();
      toast.success(t('inmobiliaria.operaciones.toasts.notificationSent'), {
        description: t('inmobiliaria.operaciones.toasts.notificationSentDesc', { name: renovacion.tenantName }),
      });
    } catch (error) {
      toast.error('Error al notificar inquilino');
    }
  }, [t, recargarRenovaciones]);

  const handleViewRenovacionDetails = useCallback((renovacion: Renovacion) => {
    setSelectedRenovacion(renovacion);
    setIsRenovacionWorkflowOpen(true);
  }, []);

  const handleCalculateIPC = useCallback((renovacion: Renovacion) => {
    setTab('ipc');
  }, []);

  const handleViewRenovacionHistory = useCallback((renovacion: Renovacion) => {
    setSelectedRenovacion(renovacion);
    setIsRenovacionWorkflowOpen(true);
  }, []);

  const handleRenovacionWorkflowClose = useCallback(() => {
    setIsRenovacionWorkflowOpen(false);
    setTimeout(() => setSelectedRenovacion(null), 300);
  }, []);

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
  const isLoading = isLoadingRenovaciones || isLoadingMantenimientos || isLoadingConsignaciones;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header — dice la pestaña en la que estás, no el nombre del archivo.
          Antes decía siempre «Operaciones», que no es como se llama esto en
          ningún menú. */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {ENCABEZADO[activeTab].titulo}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">{ENCABEZADO[activeTab].bajada}</p>
        </div>
      </div>

      {/* El cartel rojo que había acá decía lo mismo para tres fallos
          distintos, no ofrecía nada que apretar, y convivía con los KPI en
          cero y con «No hay renovaciones»: la pantalla decía «falló» y «no hay
          nada» al mismo tiempo. Ahora cada fallo se cuenta donde vive —dentro
          de su pestaña— y los números que no se pudieron traer no se
          inventan. */}

      {/* Quick Stats - Informational Only */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card animate-pulse">
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
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {/* Un cero que en realidad es «no lo pudimos traer» afirma algo
              falso, y encima tranquiliza: «no tenés renovaciones pendientes».
              Cuando la consulta falló va una raya. */}
          <StatCard
            icon={ClockCounterClockwise}
            label={t('inmobiliaria.operaciones.stats.pendingRenewals')}
            value={renovacionesError ? '—' : stats.renovaciones.pending}
            subValue={
              renovacionesError
                ? 'No se pudo traer'
                : stats.renovaciones.critical > 0
                  ? t('inmobiliaria.operaciones.stats.criticalCount', { count: stats.renovaciones.critical })
                  : undefined
            }
            subValueColor={stats.renovaciones.critical > 0 && !renovacionesError ? 'warning' : 'default'}
            bgColor="bg-warning-soft"
            iconColor="text-warning"
          />
          <StatCard
            icon={Wrench}
            label={t('inmobiliaria.operaciones.stats.activeMaintenance')}
            value={mantenimientosError ? '—' : stats.mantenimiento.active}
            subValue={
              mantenimientosError
                ? 'No se pudo traer'
                : stats.mantenimiento.quoted > 0
                  ? t('inmobiliaria.operaciones.stats.toApproveCount', { count: stats.mantenimiento.quoted })
                  : undefined
            }
            subValueColor={stats.mantenimiento.quoted > 0 && !mantenimientosError ? 'info' : 'default'}
            bgColor="bg-primary-soft"
            iconColor="text-primary"
          />
          <StatCard
            icon={CurrencyDollar}
            label={t('inmobiliaria.operaciones.stats.pendingQuotes')}
            value={mantenimientosError ? '—' : stats.mantenimiento.quoted}
            subValue={mantenimientosError ? 'No se pudo traer' : undefined}
            bgColor="bg-neutral-100 dark:bg-neutral-800"
            iconColor="text-neutral-600 dark:text-neutral-300"
          />
          <StatCard
            icon={TrendUp}
            label={t('inmobiliaria.operaciones.stats.currentIPC')}
            value={`${stats.ipc.currentRate.toFixed(2)}%`}
            subValue={stats.ipc.description}
            bgColor="bg-success-soft"
            iconColor="text-success"
          />
        </motion.div>
      )}

      {/* Unified Tabs Container */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card"
      >
        <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabValue)}>
          {/* Tab Header */}
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
            {/* Mantenimiento primero: es la pestaña que abre por defecto y la
                que promete el menú. */}
            <TabsList variant="segmented">
              <TabsTrigger
                value="mantenimiento"
                className="inline-flex items-center"
              >
                <Wrench className="w-4 h-4 mr-2" />
                {t('inmobiliaria.operaciones.tabs.mantenimiento')}
                {stats.mantenimiento.active > 0 && !mantenimientosError && (
                  <span className="ml-2 rounded-full bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-fg-muted">
                    {stats.mantenimiento.active}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="renovaciones"
                className="inline-flex items-center"
              >
                <ClockCounterClockwise className="w-4 h-4 mr-2" />
                {t('inmobiliaria.operaciones.tabs.renovaciones')}
                {stats.renovaciones.pending > 0 && !renovacionesError && (
                  <Badge variant="warning" className="ml-2 px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
                    {stats.renovaciones.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="ipc"
                className="inline-flex items-center"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {t('inmobiliaria.operaciones.tabs.ipc')}
              </TabsTrigger>
              <TabsTrigger
                value="recordatorios"
                className="inline-flex items-center"
              >
                <Bell className="w-4 h-4 mr-2" />
                Recordatorios
              </TabsTrigger>
            </TabsList>

            {/* Tab-specific Actions */}
            <AnimatePresence mode="wait">
              {activeTab === 'mantenimiento' && (
                <motion.div
                  key="new-mant"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Button size="sm" hideArrow onClick={handleNewMantenimiento} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('inmobiliaria.operaciones.maintenance.new')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Renovaciones Tab — sin esto, una consulta que falló entraba a la
              tabla como `[]` y la pantalla decía «No hay renovaciones»: el
              vacío tapando el fallo. Lo mismo mientras cargaba. */}
          <TabsContent value="renovaciones" className="mt-0">
            {/* Las dos ramas arreglaron el MISMO defecto de formas distintas y
                gana ésta: `EstadoDeDatos` es la forma canónica de ordenar los
                cuatro estados —lo dice el docblock de `cuatro-estados.test.ts`,
                escrito justo cuando esa primitiva tenía CERO call sites— y
                encima suma esqueleto de carga. Pasarle el fallo a mano a la
                tabla satisfacía el test estático sin usar la primitiva. */}
            <EstadoDeDatos
              cargando={isLoadingRenovaciones}
              error={renovacionesError}
              queEs="las renovaciones"
              onReintentar={reintentar}
              esqueleto={<EsqueletoTabla columnas={5} filas={5} />}
            >
              <RenovacionesTable
                data={renovaciones}
                onStartRenewal={handleStartRenewal}
                onNotifyTenant={handleNotifyTenant}
                onViewDetails={handleViewRenovacionDetails}
                onCalculateIPC={handleCalculateIPC}
                onViewHistory={handleViewRenovacionHistory}
              />
            </EstadoDeDatos>
          </TabsContent>

          {/* Mantenimiento Tab */}
          <TabsContent value="mantenimiento" className="mt-0">
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

            {/* Content based on view mode */}
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
          </TabsContent>

          {/* IPC Tab */}
          <TabsContent value="ipc" className="mt-0 p-5">
            <IPCCalculator
              onCalculate={(result) => {
                toast.success(t('inmobiliaria.operaciones.toasts.calculationComplete'), {
                  description: t('inmobiliaria.operaciones.toasts.newRent', { amount: formatCurrency(result.newRent) }),
                });
              }}
            />
          </TabsContent>

          {/* Recordatorios Tab */}
          <TabsContent value="recordatorios" className="mt-0 p-5">
            <FeatureGate feature="automatic-reminders">
              <div className="space-y-6">
                <ReminderConfigPanel config={DEFAULT_REMINDER_CONFIG} />
                <ReminderLog entries={[]} />
              </div>
            </FeatureGate>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Renovacion Workflow Sheet */}
      {selectedRenovacion && (
        <RenovacionWorkflow
          renovacion={selectedRenovacion}
          open={isRenovacionWorkflowOpen}
          onClose={handleRenovacionWorkflowClose}
          onSendNotification={async (message, nr, naf) => {
            await renovacionesApi.updateStage(selectedRenovacion.id, {
              status: 'notified',
              notificationMessage: message,
              ...(nr ? { negotiatedRent: nr } : {}),
              ...(naf ? { negotiatedAdminFee: naf } : {}),
            });
            await recargarRenovaciones();
            toast.success('Propuesta enviada al inquilino');
          }}
          onUploadDocument={async (file) => {
            await renovacionesApi.uploadDocument(selectedRenovacion.id, file);
            await recargarRenovaciones();
            toast.success('Documento de renovación subido');
          }}
          onStepComplete={async (newStatus, negotiatedRent, negotiatedAdminFee, notificationMessage) => {
            try {
              await renovacionesApi.updateStage(selectedRenovacion.id, {
                status: newStatus,
                ...(negotiatedRent ? { negotiatedRent } : {}),
                ...(negotiatedAdminFee ? { negotiatedAdminFee } : {}),
                ...(notificationMessage ? { notificationMessage } : {}),
              });
              await recargarRenovaciones();
              toast.success(t('inmobiliaria.operaciones.toasts.statusUpdated', { status: getRenovacionStatusLabel(newStatus) }));
            } catch (error) {
              toast.error('Error al actualizar renovación');
            }
          }}
          onTerminate={async (reason) => {
            try {
              await renovacionesApi.updateStage(selectedRenovacion.id, {
                status: 'terminated',
                ...(reason ? { historyNote: reason } : {}),
              });
              await recargarRenovaciones();
              handleRenovacionWorkflowClose();
              toast.success(t('inmobiliaria.operaciones.toasts.renewalTerminated'));
            } catch (error) {
              toast.error('Error al terminar renovación');
            }
          }}
          onNoteAdd={async (note) => {
            try {
              await renovacionesApi.addNote(selectedRenovacion.id, note);
              await recargarRenovaciones();
              toast.success(t('inmobiliaria.operaciones.toasts.noteAdded'));
            } catch (error) {
              toast.error('Error al agregar nota');
            }
          }}
        />
      )}

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
      <Sheet open={isMantenimientoFormOpen} onOpenChange={setIsMantenimientoFormOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('inmobiliaria.operaciones.maintenance.newRequest')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <MantenimientoForm
              consignaciones={rentedConsignaciones}
              onSubmit={handleMantenimientoFormSubmit}
              onCancel={handleMantenimientoFormCancel}
              isSubmitting={isSubmittingMantenimiento}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function OperacionesPage() {
  return (
    <PageGuard module="operaciones">
      {/* `useSearchParams` obliga a un límite de Suspense: sin él, next build
          falla al prerenderizar esta ruta. */}
      <Suspense fallback={null}>
        <OperacionesContent />
      </Suspense>
    </PageGuard>
  );
}
