'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CurrencyCircleDollar,
  Gear,
  ArrowsClockwise,
  Table,
  SquaresFour,
  Funnel,
  CheckCircle,
  Clock,
  Warning,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  MOCK_COBROS,
  MOCK_CONSIGNACIONES,
  MOCK_PROPIETARIOS,
  calculateCobroSummary,
  MOCK_INMOBILIARIA_CONFIG,
} from '@/lib/data/mock-inmobiliaria';
import type { Cobro, CobroStatus, CobroSummary } from '@/lib/types/inmobiliaria';
import {
  CobroResumen,
  CobroFilters,
  CobroTable,
  RegistrarPagoModal,
  RecordatorioConfig,
  CobroDetail,
  type CobroFiltersState,
} from '@/components/inmobiliaria';
import { CobroCard } from '@/components/inmobiliaria/CobroCard';
import { type RecordatorioConfigData } from '@/components/inmobiliaria/RecordatorioConfig';

// View modes
type ViewMode = 'table' | 'cards';

// Get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * CobrosPage - Main page for collection management
 * Route: /panel/inmobiliaria/cobros
 */
export default function CobrosPage() {
  // State for cobros (local copy for optimistic updates)
  const [cobros, setCobros] = useState<Cobro[]>(MOCK_COBROS);

  // State for filters
  const [filters, setFilters] = useState<CobroFiltersState>({
    month: getCurrentMonth(),
    status: 'all',
    consignacionId: undefined,
    propietarioId: undefined,
    search: undefined,
  });

  // State for view mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // State for modals
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [paymentCobro, setPaymentCobro] = useState<Cobro | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // State for reminder config
  const [reminderConfig, setReminderConfig] = useState<RecordatorioConfigData>({
    daysBefore: MOCK_INMOBILIARIA_CONFIG.reminderDaysBefore,
    daysAfter: MOCK_INMOBILIARIA_CONFIG.reminderDaysAfter,
    channels: ['email', 'whatsapp'],
  });

  // Filter cobros based on current filters
  const filteredCobros = useMemo(() => {
    let result = cobros.filter((c) => c.month === filters.month);

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter((c) => c.status === filters.status);
    }

    // Filter by consignacion (property)
    if (filters.consignacionId) {
      result = result.filter((c) => c.consignacionId === filters.consignacionId);
    }

    // Filter by propietario
    if (filters.propietarioId) {
      result = result.filter((c) => c.propietarioId === filters.propietarioId);
    }

    // Filter by search (tenant name, property title, property address)
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.tenantName.toLowerCase().includes(query) ||
          c.propertyTitle.toLowerCase().includes(query) ||
          c.propertyAddress.toLowerCase().includes(query)
      );
    }

    return result;
  }, [cobros, filters]);

  // Calculate summary for selected month
  const summary: CobroSummary = useMemo(() => {
    const monthCobros = cobros.filter((c) => c.month === filters.month);
    const totalExpected = monthCobros.reduce((sum, c) => sum + c.totalWithFees, 0);
    const totalCollected = monthCobros.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalPending = monthCobros
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.pendingAmount, 0);
    const totalLate = monthCobros
      .filter((c) => c.status === 'late')
      .reduce((sum, c) => sum + c.pendingAmount, 0);

    return {
      month: filters.month,
      totalExpected,
      totalCollected,
      totalPending,
      totalLate,
      collectionRate: totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
      cobrosPaid: monthCobros.filter((c) => c.status === 'paid').length,
      cobrosPending: monthCobros.filter((c) => c.status === 'pending').length,
      cobrosLate: monthCobros.filter((c) => c.status === 'late').length,
    };
  }, [cobros, filters.month]);

  // Count cobros by status for tabs
  const cobroCountByStatus = useMemo(() => {
    const monthCobros = cobros.filter((c) => c.month === filters.month);
    return {
      all: monthCobros.length,
      pending: monthCobros.filter((c) => c.status === 'pending').length,
      paid: monthCobros.filter((c) => c.status === 'paid').length,
      partial: monthCobros.filter((c) => c.status === 'partial').length,
      late: monthCobros.filter((c) => c.status === 'late').length,
      defaulted: monthCobros.filter((c) => c.status === 'defaulted').length,
    };
  }, [cobros, filters.month]);

  // Handle cobro click - open detail modal
  const handleCobroClick = useCallback((cobro: Cobro) => {
    setSelectedCobro(cobro);
    setIsDetailOpen(true);
  }, []);

  // Handle register payment click - open payment modal
  const handleRegisterPaymentClick = useCallback((cobro: Cobro) => {
    setPaymentCobro(cobro);
    setIsPaymentModalOpen(true);
  }, []);

  // Handle payment submission
  const handlePaymentSubmit = useCallback(
    async (data: {
      amount: number;
      method: string;
      date: string;
      reference?: string;
      notes?: string;
    }) => {
      if (!paymentCobro) return;

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Calculate new amounts
      const newPaidAmount = paymentCobro.paidAmount + data.amount;
      const newPendingAmount = paymentCobro.totalWithFees - newPaidAmount;
      const isFullyPaid = newPendingAmount <= 0;

      // Update cobro in state
      setCobros((prev) =>
        prev.map((c) =>
          c.id === paymentCobro.id
            ? {
                ...c,
                paidAmount: newPaidAmount,
                pendingAmount: Math.max(0, newPendingAmount),
                status: isFullyPaid ? 'paid' : 'partial',
                paidDate: isFullyPaid ? data.date : c.paidDate,
                paymentMethod: data.method,
                paymentReference: data.reference,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );

      setIsPaymentModalOpen(false);
      setPaymentCobro(null);
    },
    [paymentCobro]
  );

  // Handle send reminder
  const handleSendReminder = useCallback((cobro: Cobro) => {
    // Update reminder count
    setCobros((prev) =>
      prev.map((c) =>
        c.id === cobro.id
          ? {
              ...c,
              remindersSent: c.remindersSent + 1,
              lastReminderDate: new Date().toISOString().split('T')[0],
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: CobroFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Handle reminder config save
  const handleConfigSave = useCallback((config: RecordatorioConfigData) => {
    setReminderConfig(config);
  }, []);

  // Handle detail modal close
  const handleDetailClose = useCallback(() => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedCobro(null), 300);
  }, []);

  // Handle payment modal close
  const handlePaymentModalClose = useCallback(() => {
    setIsPaymentModalOpen(false);
    setTimeout(() => setPaymentCobro(null), 300);
  }, []);

  // Handle view pending filter
  const handleViewPending = useCallback(() => {
    setFilters((prev) => ({ ...prev, status: 'pending' }));
  }, []);

  // Handle view late filter
  const handleViewLate = useCallback(() => {
    setFilters((prev) => ({ ...prev, status: 'late' }));
  }, []);

  // Refresh data (mock - resets to original)
  const handleRefresh = useCallback(() => {
    setCobros([...MOCK_COBROS]);
    toast.success('Datos actualizados');
  }, []);

  // Format month for display
  const monthDisplay = new Date(filters.month + '-01').toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion de Cobros</h1>
          <p className="text-muted-foreground mt-1">
            Administra los pagos y recordatorios del mes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
          >
            <Gear className="w-5 h-5" />
            <span className="hidden sm:inline">Configurar recordatorios</span>
          </button>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
          >
            <ArrowsClockwise className="w-5 h-5" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CobroResumen
          summary={summary}
          onViewPending={handleViewPending}
          onViewLate={handleViewLate}
          onRefresh={handleRefresh}
        />
      </motion.div>

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CobroFilters
          consignaciones={MOCK_CONSIGNACIONES}
          propietarios={MOCK_PROPIETARIOS}
          filters={filters}
          onFilterChange={handleFilterChange}
          cobroCountByStatus={cobroCountByStatus}
        />
      </motion.div>

      {/* View Toggle & Results Count */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between"
      >
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredCobros.length} cobros
          {filters.status !== 'all' && ` (${filters.status})`}
        </p>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'table'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Vista de tabla"
          >
            <Table className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'cards'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Vista de tarjetas"
          >
            <SquaresFour className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Cobros List/Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {filteredCobros.length > 0 ? (
          viewMode === 'table' ? (
            <CobroTable
              cobros={filteredCobros}
              onCobroClick={handleCobroClick}
              onRegisterPayment={handleRegisterPaymentClick}
              showSummary
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCobros.map((cobro) => (
                <CobroCard
                  key={cobro.id}
                  cobro={cobro}
                  onClick={handleCobroClick}
                  onRegisterPayment={handleRegisterPaymentClick}
                />
              ))}
            </div>
          )
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border">
            <CurrencyCircleDollar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Sin cobros
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              No hay cobros que coincidan con los filtros seleccionados para{' '}
              <span className="capitalize">{monthDisplay}</span>.
            </p>
            {filters.status !== 'all' && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, status: 'all' }))}
                className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Ver todos los cobros
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Cobro Detail Modal */}
      <CobroDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        cobro={selectedCobro}
        onRegisterPayment={handleRegisterPaymentClick}
        onSendReminder={handleSendReminder}
      />

      {/* Register Payment Modal */}
      <RegistrarPagoModal
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentModalClose}
        cobro={paymentCobro}
        onSubmit={handlePaymentSubmit}
      />

      {/* Reminder Configuration Sheet */}
      <RecordatorioConfig
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={reminderConfig}
        onSave={handleConfigSave}
      />
    </div>
  );
}
