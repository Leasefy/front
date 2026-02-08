'use client';

import { useState, useMemo, useCallback } from 'react';
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
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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
} from '@/lib/types/inmobiliaria';
import { formatCurrency, getRenovacionStatusLabel } from '@/lib/types/inmobiliaria';
import {
  MOCK_RENOVACIONES,
  MOCK_MANTENIMIENTOS,
  getCurrentIPC,
  MOCK_CONSIGNACIONES,
} from '@/lib/data/mock-inmobiliaria';
import {
  RenovacionesTable,
  RenovacionWorkflow,
  IPCCalculator,
  MantenimientoList,
  MantenimientoForm,
  MantenimientoViewer,
  type MantenimientoFormData,
} from '@/components/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

type TabValue = 'renovaciones' | 'mantenimiento' | 'ipc';

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
  bgColor: string;
  iconColor: string;
  onClick?: () => void;
}

function StatCard({ icon: Icon, label, value, subValue, bgColor, iconColor, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'p-4 rounded-xl border border-border bg-card transition-all text-left',
        onClick && 'hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * OperacionesPage - Operations center for the inmobiliaria module
 * Route: /panel/inmobiliaria/operaciones
 */
export default function OperacionesPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabValue>('renovaciones');
  const [renovaciones, setRenovaciones] = useState<Renovacion[]>(MOCK_RENOVACIONES);
  const [mantenimientos, setMantenimientos] = useState<SolicitudMantenimiento[]>(MOCK_MANTENIMIENTOS);

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

  const handleNotifyTenant = useCallback((renovacion: Renovacion) => {
    toast.success('Notificacion enviada', {
      description: `Se envio notificacion a ${renovacion.tenantName}`,
    });
    // Update status to notified
    setRenovaciones((prev) =>
      prev.map((r) =>
        r.id === renovacion.id
          ? { ...r, status: 'notified' as const, notifiedAt: new Date().toISOString() }
          : r
      )
    );
  }, []);

  const handleViewRenovacionDetails = useCallback((renovacion: Renovacion) => {
    setSelectedRenovacion(renovacion);
    setIsRenovacionWorkflowOpen(true);
  }, []);

  const handleCalculateIPC = useCallback((renovacion: Renovacion) => {
    setActiveTab('ipc');
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

  const handleMantenimientoFormSubmit = useCallback((data: MantenimientoFormData) => {
    setIsSubmittingMantenimiento(true);

    // Simulate API call
    setTimeout(() => {
      const newSolicitud: SolicitudMantenimiento = {
        id: `mant-${Date.now()}`,
        consignacionId: data.consignacionId,
        propertyId: MOCK_CONSIGNACIONES.find((c) => c.id === data.consignacionId)?.propertyId || '',
        propietarioId: MOCK_CONSIGNACIONES.find((c) => c.id === data.consignacionId)?.propietarioId || '',
        tenantId: 'tenant-new',
        agenteId: 'agent-001',
        propertyTitle:
          MOCK_CONSIGNACIONES.find((c) => c.id === data.consignacionId)?.propertyTitle || '',
        propertyAddress:
          MOCK_CONSIGNACIONES.find((c) => c.id === data.consignacionId)?.propertyAddress || '',
        tenantName:
          MOCK_CONSIGNACIONES.find((c) => c.id === data.consignacionId)?.currentTenantName || 'Nuevo inquilino',
        propietarioName: 'Propietario',
        type: data.type,
        priority: data.priority,
        title: data.title,
        description: data.description,
        photoUrls: data.photoUrls,
        status: 'reported',
        quotes: [],
        paidBy: data.paidBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setMantenimientos((prev) => [newSolicitud, ...prev]);
      setIsSubmittingMantenimiento(false);
      setIsMantenimientoFormOpen(false);
      toast.success('Solicitud creada', {
        description: `${data.title} reportada exitosamente`,
      });
    }, 1000);
  }, []);

  const handleMantenimientoFormCancel = useCallback(() => {
    setIsMantenimientoFormOpen(false);
  }, []);

  const handleMantenimientoViewerClose = useCallback(() => {
    setIsMantenimientoViewerOpen(false);
    setTimeout(() => setSelectedMantenimiento(null), 300);
  }, []);

  const handleMantenimientoStatusChange = useCallback(
    (solicitudId: string, newStatus: MantenimientoStatus) => {
      setMantenimientos((prev) =>
        prev.map((m) =>
          m.id === solicitudId
            ? {
                ...m,
                status: newStatus,
                updatedAt: new Date().toISOString(),
                completedAt: newStatus === 'completed' ? new Date().toISOString() : m.completedAt,
              }
            : m
        )
      );

      const statusLabels: Record<MantenimientoStatus, string> = {
        reported: 'Reportada',
        quoted: 'Cotizada',
        approved: 'Aprobada',
        in_progress: 'En progreso',
        completed: 'Completada',
        cancelled: 'Cancelada',
      };

      toast.success(`Estado actualizado: ${statusLabels[newStatus]}`);

      if (newStatus === 'cancelled' || newStatus === 'completed') {
        handleMantenimientoViewerClose();
      }
    },
    [handleMantenimientoViewerClose]
  );

  const handleApproveQuote = useCallback((solicitudId: string, quoteId: string) => {
    setMantenimientos((prev) =>
      prev.map((m) => {
        if (m.id !== solicitudId) return m;
        const quote = m.quotes.find((q) => q.id === quoteId);
        return {
          ...m,
          selectedQuoteId: quoteId,
          approvedAmount: quote?.amount,
          status: 'approved' as const,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Cotizacion aprobada');
  }, []);

  const handleAddNote = useCallback((solicitudId: string, note: string) => {
    toast.success('Nota agregada');
  }, []);

  const handleRequestQuote = useCallback((solicitudId: string) => {
    toast.info('Funcion en desarrollo', {
      description: 'Proximamente podras solicitar cotizaciones directamente',
    });
  }, []);

  // Consignaciones for form (rented properties only)
  const rentedConsignaciones = useMemo(
    () => MOCK_CONSIGNACIONES.filter((c) => c.availability === 'rented'),
    []
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centro de Operaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona renovaciones, mantenimiento y calculos de IPC
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={ClockCounterClockwise}
          label="Renovaciones pendientes"
          value={stats.renovaciones.pending}
          subValue={
            stats.renovaciones.critical > 0
              ? `${stats.renovaciones.critical} criticas`
              : undefined
          }
          bgColor="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          onClick={() => setActiveTab('renovaciones')}
        />
        <StatCard
          icon={Wrench}
          label="Mantenimientos activos"
          value={stats.mantenimiento.active}
          subValue={
            stats.mantenimiento.quoted > 0
              ? `${stats.mantenimiento.quoted} por aprobar`
              : undefined
          }
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          onClick={() => setActiveTab('mantenimiento')}
        />
        <StatCard
          icon={CurrencyDollar}
          label="Cotizaciones pendientes"
          value={stats.mantenimiento.quoted}
          bgColor="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600 dark:text-violet-400"
          onClick={() => setActiveTab('mantenimiento')}
        />
        <StatCard
          icon={TrendUp}
          label="IPC actual"
          value={`${stats.ipc.currentRate.toFixed(2)}%`}
          subValue={stats.ipc.description}
          bgColor="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          onClick={() => setActiveTab('ipc')}
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger
                value="renovaciones"
                className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <ClockCounterClockwise className="w-4 h-4 mr-2" />
                Renovaciones
                {stats.renovaciones.pending > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    {stats.renovaciones.pending}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="mantenimiento"
                className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Mantenimiento
                {stats.mantenimiento.active > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                    {stats.mantenimiento.active}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="ipc"
                className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculadora IPC
              </TabsTrigger>
            </TabsList>

            {/* Tab-specific Actions */}
            <AnimatePresence mode="wait">
              {activeTab === 'mantenimiento' && (
                <motion.button
                  key="new-mant"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={handleNewMantenimiento}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-5 h-5" />
                  Nueva solicitud
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Renovaciones Tab */}
          <TabsContent value="renovaciones" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <RenovacionesTable
                data={renovaciones}
                onStartRenewal={handleStartRenewal}
                onNotifyTenant={handleNotifyTenant}
                onViewDetails={handleViewRenovacionDetails}
                onCalculateIPC={handleCalculateIPC}
                onViewHistory={handleViewRenovacionHistory}
              />
            </motion.div>
          </TabsContent>

          {/* Mantenimiento Tab */}
          <TabsContent value="mantenimiento" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <MantenimientoList
                data={mantenimientos}
                onViewDetails={handleViewMantenimiento}
                onComplete={(s) => handleMantenimientoStatusChange(s.id, 'completed')}
                onCancel={(s) => handleMantenimientoStatusChange(s.id, 'cancelled')}
              />
            </motion.div>
          </TabsContent>

          {/* IPC Tab */}
          <TabsContent value="ipc" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <IPCCalculator
                mode="single"
                properties={renovaciones.map((r) => ({
                  id: r.id,
                  title: r.propertyTitle,
                  currentRent: r.currentRent,
                }))}
                onCalculate={(result) => {
                  toast.success('Calculo completado', {
                    description: `Nuevo arriendo: ${formatCurrency(result.newRent)}`,
                  });
                }}
                onBulkApply={(updates) => {
                  toast.success(`${updates.length} arriendos actualizados`);
                }}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Renovacion Workflow Sheet */}
      {selectedRenovacion && (
        <RenovacionWorkflow
          renovacion={selectedRenovacion}
          open={isRenovacionWorkflowOpen}
          onClose={handleRenovacionWorkflowClose}
          onStepComplete={(newStatus) => {
            setRenovaciones((prev) =>
              prev.map((r) =>
                r.id === selectedRenovacion.id
                  ? { ...r, status: newStatus, updatedAt: new Date().toISOString() }
                  : r
              )
            );
            toast.success(`Estado actualizado: ${getRenovacionStatusLabel(newStatus)}`);
          }}
          onTerminate={(reason) => {
            setRenovaciones((prev) =>
              prev.map((r) =>
                r.id === selectedRenovacion.id
                  ? { ...r, status: 'terminated' as const, updatedAt: new Date().toISOString() }
                  : r
              )
            );
            handleRenovacionWorkflowClose();
            toast.success('Renovacion terminada');
          }}
          onNoteAdd={(note) => {
            toast.success('Nota agregada');
          }}
        />
      )}

      {/* Mantenimiento Viewer Sheet */}
      <MantenimientoViewer
        solicitud={selectedMantenimiento}
        isOpen={isMantenimientoViewerOpen}
        onClose={handleMantenimientoViewerClose}
        onStatusChange={handleMantenimientoStatusChange}
        onApproveQuote={handleApproveQuote}
        onAddNote={handleAddNote}
        onRequestQuote={handleRequestQuote}
      />

      {/* Mantenimiento Form Sheet */}
      <Sheet open={isMantenimientoFormOpen} onOpenChange={setIsMantenimientoFormOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nueva solicitud de mantenimiento</SheetTitle>
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
