'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CurrencyCircleDollar,
  Gear,
  Table,
  SquaresFour,
  Plus,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Pagination } from '@/components/ui/pagination';
import { Button, Spinner } from '@/components/ui';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SegmentedControl } from '@leasefy/cadence';
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
function CobrosContent() {
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
    errorCrudo: cobrosError,
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

  // State for view mode.
  // `null` = no explicit user choice → default from viewport (cards under md).
  // useIsMobile is false on SSR + first client render and only flips after
  // mount, so the server and client first paint agree ('table') and the
  // mobile default applies post-hydration without a mismatch.
  const isMobile = useIsMobile();
  const [viewModeOverride, setViewModeOverride] = useState<ViewMode | null>(null);
  const viewMode: ViewMode = viewModeOverride ?? (isMobile ? 'cards' : 'table');
  const setViewMode = setViewModeOverride;

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
    daysBefore: inmobiliariaConfig?.agency?.reminderDaysBefore ?? [5],
    daysAfter: inmobiliariaConfig?.agency?.reminderDaysAfter ?? [3],
    channels: ['email', 'whatsapp'],
  });

  // Update reminder config when API config loads
  useEffect(() => {
    if (inmobiliariaConfig?.agency) {
      setReminderConfig((prev) => ({
        ...prev,
        daysBefore: inmobiliariaConfig.agency.reminderDaysBefore ?? prev.daysBefore,
        daysAfter: inmobiliariaConfig.agency.reminderDaysAfter ?? prev.daysAfter,
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


  // Step the selected month backward/forward (handles year rollover).
  const shiftMonth = useCallback((delta: number) => {
    setFilters((prev) => {
      const [y, m] = prev.month.split('-').map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return {
        ...prev,
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      };
    });
  }, []);

  // Format month for display. Build the Date in LOCAL time (Y, M-1, 1) — parsing
  // `'YYYY-MM-01'` as a string is treated as UTC and shifts to the previous month
  // in negative-offset timezones (e.g. Colombia UTC-5 rendered July as "junio").
  const [monthDisplayYear, monthDisplayMonth] = filters.month.split('-').map(Number);
  const monthDisplay = new Date(monthDisplayYear, monthDisplayMonth - 1, 1).toLocaleDateString(
    locale === 'es' ? 'es-CL' : 'en-US',
    { month: 'long', year: 'numeric' },
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t('inmobiliaria.cobros.title')}</h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.cobros.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" hideArrow onClick={() => setIsConfigOpen(true)}>
            <Gear className="w-4 h-4" />
            <span className="hidden sm:inline">{t('inmobiliaria.config.title')}</span>
          </Button>
          <Button
            hideArrow
            onClick={() => {
              setPaymentCobro(null);
              setIsPaymentModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            {t('inmobiliaria.cobros.registerPayment')}
          </Button>
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
          <SegmentedControl
            aria-label={t('inmobiliaria.cobros.viewTable')}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              {
                value: 'table',
                label: (
                  <span className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    {t('inmobiliaria.cobros.viewTable')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.cobros.viewTable'),
              },
              {
                value: 'cards',
                label: (
                  <span className="flex items-center gap-2">
                    <SquaresFour className="w-4 h-4" />
                    {t('inmobiliaria.cobros.viewCards')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.cobros.viewCards'),
              },
            ]}
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Mes anterior"
                className="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-muted transition-colors"
              >
                <CaretLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-fg capitalize text-center tabular-nums min-w-[7rem]">
                {monthDisplay}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Mes siguiente"
                className="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-muted transition-colors"
              >
                <CaretRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-fg-muted tabular-nums">
              {filteredCobros.length} {t('inmobiliaria.nav.cobros').toLowerCase()}
            </span>
          </div>
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
              <Spinner size="lg" className="mb-4" />
              <p className="text-sm text-fg-muted">Cargando cobros...</p>
            </div>
          ) : cobrosError ? (
            /* Mostraba `description={cobrosError}`: el mensaje crudo del
               backend, en inglés, dentro de la tarjeta de la tabla. */
            <FalloDeCarga
              error={cobrosError}
              queEs="los cobros"
              onReintentar={() => refetchCobros()}
              enmarcado={false}
            />
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
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
                <CurrencyCircleDollar
                  weight="duotone"
                  className="h-6 w-6 text-fg-muted"
                  aria-hidden="true"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-fg">
                  {t('inmobiliaria.cobros.noPayments')}
                </p>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
                  {t('inmobiliaria.cobros.noPaymentsDesc')}
                </p>
              </div>
              {filters.status !== 'all' && (
                <Button
                  variant="link"
                  onClick={() => setFilters((prev) => ({ ...prev, status: 'all' }))}
                >
                  {t('inmobiliaria.cobros.filters.all')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination Footer — windowed (1 … 4 5 6 … 12) via ui/pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-center bg-muted/10">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              siblingCount={1}
            />
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

export default function CobrosPage() {
  return (
    <PageGuard module="cobros">
      <CobrosContent />
    </PageGuard>
  );
}
