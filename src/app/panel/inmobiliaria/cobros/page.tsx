'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CurrencyCircleDollar,
  Gear,
  Table,
  SquaresFour,
  CaretLeft,
  CaretRight,
  Plus,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  useCobros,
  useCobroSummary,
  useConsignaciones,
  usePropietarios,
  useInmobiliariaConfig,
  cobrosApi,
} from '@/lib/hooks/useInmobiliaria';
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

// Pagination
const ITEMS_PER_PAGE = 6;

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
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();

  // State for filters
  const [filters, setFilters] = useState<CobroFiltersState>({
    month: getCurrentMonth(),
    status: 'all',
    consignacionId: undefined,
    propietarioId: undefined,
    search: undefined,
  });

  // Fetch cobros from API
  const {
    cobros: apiCobros,
    isLoading: cobrosLoading,
    error: cobrosError,
    refetch: refetchCobros,
    setData: setCobrosData,
  } = useCobros({
    month: filters.month,
    status: filters.status === 'all' ? undefined : filters.status,
    propietarioId: filters.propietarioId,
  });

  // Fetch summary from API
  const {
    summary: apiSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useCobroSummary(filters.month);

  // Fetch consignaciones for filters
  const { consignaciones, isLoading: consignacionesLoading } = useConsignaciones();

  // Fetch propietarios for filters
  const { propietarios, isLoading: propietariosLoading } = usePropietarios();

  // Fetch config for reminder defaults
  const { config: inmobiliariaConfig, isLoading: configLoading } = useInmobiliariaConfig();

  // State for view mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // State for modals
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [paymentCobro, setPaymentCobro] = useState<Cobro | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // State for reminder config (initialized from API config)
  const [reminderConfig, setReminderConfig] = useState<RecordatorioConfigData>({
    daysBefore: inmobiliariaConfig?.reminderDaysBefore ?? [5],
    daysAfter: inmobiliariaConfig?.reminderDaysAfter ?? [3],
    channels: ['email', 'whatsapp'],
  });

  // Update reminder config when API config loads
  useEffect(() => {
    if (inmobiliariaConfig) {
      setReminderConfig((prev) => ({
        ...prev,
        daysBefore: inmobiliariaConfig.reminderDaysBefore,
        daysAfter: inmobiliariaConfig.reminderDaysAfter,
      }));
    }
  }, [inmobiliariaConfig]);

  // Read status from URL query params
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && ['pending', 'paid', 'partial', 'late', 'defaulted'].includes(statusParam)) {
      setFilters((prev) => ({ ...prev, status: statusParam as CobroStatus }));
    }
  }, [searchParams]);

  // Filter cobros based on current filters (client-side filtering for consignacion and search)
  const filteredCobros = useMemo(() => {
    let result = apiCobros || [];

    // Filter by consignacion (property) - client-side only
    if (filters.consignacionId) {
      result = result.filter((c) => c.consignacionId === filters.consignacionId);
    }

    // Filter by search (tenant name, property title, property address) - client-side only
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
  }, [apiCobros, filters.consignacionId, filters.search]);

  // Pagination
  const totalPages = Math.ceil(filteredCobros.length / ITEMS_PER_PAGE);
  const paginatedCobros = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredCobros.slice(start, end);
  }, [filteredCobros, currentPage]);

  // Use summary from API (fallback to default if loading)
  const summary: CobroSummary = useMemo(() => {
    if (apiSummary) return apiSummary;

    // Fallback summary while loading
    return {
      month: filters.month,
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0,
      totalLate: 0,
      collectionRate: 0,
      cobrosPaid: 0,
      cobrosPending: 0,
      cobrosLate: 0,
    };
  }, [apiSummary, filters.month]);

  // Count cobros by status for tabs (from API data)
  const cobroCountByStatus = useMemo(() => {
    const monthCobros = apiCobros || [];
    return {
      all: monthCobros.length,
      pending: monthCobros.filter((c) => c.status === 'pending').length,
      paid: monthCobros.filter((c) => c.status === 'paid').length,
      partial: monthCobros.filter((c) => c.status === 'partial').length,
      late: monthCobros.filter((c) => c.status === 'late').length,
      defaulted: monthCobros.filter((c) => c.status === 'defaulted').length,
    };
  }, [apiCobros]);

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
    }, cobroId: string) => {
      try {
        // Call API to register payment
        await cobrosApi.registerPayment(cobroId, {
          paidAmount: data.amount,
          paymentMethod: data.method,
          paymentDate: data.date,
          paymentReference: data.reference,
        });

        // Optimistically update local state
        setCobrosData((prev) => {
          if (!prev) return prev;
          return prev.map((c) => {
            if (c.id !== cobroId) return c;
            const newPaidAmount = c.paidAmount + data.amount;
            const newPendingAmount = c.totalWithFees - newPaidAmount;
            const isFullyPaid = newPendingAmount <= 0;
            return {
              ...c,
              paidAmount: newPaidAmount,
              pendingAmount: Math.max(0, newPendingAmount),
              status: isFullyPaid ? ('paid' as const) : ('partial' as const),
              paidDate: isFullyPaid ? data.date : c.paidDate,
              paymentMethod: data.method,
              paymentReference: data.reference,
              updatedAt: new Date().toISOString(),
            };
          });
        });

        // Refetch summary to update totals
        refetchSummary();

        setIsPaymentModalOpen(false);
        setPaymentCobro(null);
      } catch (error) {
        console.error('Error registering payment:', error);
        // In a production app, show error toast here
      }
    },
    [setCobrosData, refetchSummary]
  );

  // Handle send reminder
  const handleSendReminder = useCallback(
    async (cobro: Cobro) => {
      try {
        // Call API to send reminder
        await cobrosApi.sendReminder(cobro.id);

        // Optimistically update local state
        setCobrosData((prev) => {
          if (!prev) return prev;
          return prev.map((c) =>
            c.id === cobro.id
              ? {
                  ...c,
                  remindersSent: c.remindersSent + 1,
                  lastReminderDate: new Date().toISOString().split('T')[0],
                  updatedAt: new Date().toISOString(),
                }
              : c
          );
        });
      } catch (error) {
        console.error('Error sending reminder:', error);
        // In a production app, show error toast here
      }
    },
    [setCobrosData]
  );

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: CobroFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset page when filters change
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


  // Format month for display
  const monthDisplay = new Date(filters.month + '-01').toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('inmobiliaria.cobros.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('inmobiliaria.cobros.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
          >
            <Gear className="w-5 h-5" />
            <span className="hidden sm:inline">{t('inmobiliaria.config.title')}</span>
          </button>
          <button
            onClick={() => {
              setPaymentCobro(null);
              setIsPaymentModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5" />
            {t('inmobiliaria.cobros.registerPayment')}
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
        />
      </motion.div>

      {/* Unified Data Card - View Toggle + Filters + Content + Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card"
      >
        {/* View Toggle Header - FIRST (Primary hierarchy) */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Table className="w-4 h-4" />
              {t('inmobiliaria.cobros.viewTable')}
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'cards'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <SquaresFour className="w-4 h-4" />
              {t('inmobiliaria.cobros.viewCards')}
            </button>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {filteredCobros.length} {t('inmobiliaria.nav.cobros').toLowerCase()}
          </span>
        </div>

        {/* Filters Section - SECOND (Search + collapsible filters) */}
        <CobroFilters
          consignaciones={consignaciones}
          propietarios={propietarios}
          filters={filters}
          onFilterChange={handleFilterChange}
          cobroCountByStatus={cobroCountByStatus}
        />

        {/* Content */}
        <div>
          {cobrosLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando cobros...</p>
            </div>
          ) : cobrosError ? (
            <div className="rounded-2xl bg-neutral-50/80 dark:bg-white/[0.03] py-14 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-5">
                <CurrencyCircleDollar className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">
                Error al cargar cobros
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                {cobrosError}
              </p>
              <button
                onClick={() => refetchCobros()}
                className="px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : paginatedCobros.length > 0 ? (
            viewMode === 'table' ? (
              <CobroTable
                cobros={paginatedCobros}
                onCobroClick={handleCobroClick}
                onRegisterPayment={handleRegisterPaymentClick}
                showSummary
              />
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCobros.map((cobro) => (
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
            <div className="rounded-2xl bg-neutral-50/80 dark:bg-white/[0.03] py-14 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-5 shadow-sm dark:shadow-none">
                <CurrencyCircleDollar className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">
                {t('inmobiliaria.cobros.noPayments')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {t('inmobiliaria.cobros.noPaymentsDesc')}
              </p>
              {filters.status !== 'all' && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, status: 'all' }))}
                  className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t('inmobiliaria.cobros.filters.all')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-2 bg-muted/10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                'p-2 rounded-md border border-border transition-all',
                currentPage === 1
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <CaretLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-8 h-8 rounded-md text-sm font-medium transition-all',
                    page === currentPage
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                'p-2 rounded-md border border-border transition-all',
                currentPage === totalPages
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <CaretRight className="w-4 h-4" />
            </button>
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
        cobrosList={filteredCobros}
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
