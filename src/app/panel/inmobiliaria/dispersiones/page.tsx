'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  PaperPlaneTilt,
  Table,
  SquaresFour,
  Lightning,
  DownloadSimple,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import {
  useDispersiones,
  usePropietarios,
  useInmobiliariaConfig,
  dispersionesApi,
  propietariosApi,
} from '@/lib/hooks/useInmobiliaria';
import type { Dispersion, DispersionStatus, DispersionSummary } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import {
  DispersionResumen,
  DispersionFilters,
  DispersionTable,
  DispersionDetail,
  ExtractoPropietario,
  DispersionCard,
  type DispersionFiltersState,
} from '@/components/inmobiliaria';
import { apiClient } from '@/lib/api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { SegmentedControl } from '@leasefy/cadence';

// View modes
type ViewMode = 'table' | 'cards';

// Pagination
const ITEMS_PER_PAGE = 6;

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * DispersionesPage - Main page for managing disbursements to property owners
 * Route: /panel/inmobiliaria/dispersiones
 *
 * TODO [BACKEND]: Las dispersiones deben actualizarse en tiempo real.
 * Implementar WebSocket o Server-Sent Events para:
 * - Cambios de estado de dispersiones (pending → processing → completed)
 * - Nuevas dispersiones generadas
 * - Actualizaciones de montos o datos de propietarios
 * El botón "Actualizar" ha sido eliminado - la UI espera datos en tiempo real.
 */
function DispersionesContent() {
  const { t, locale } = useI18n();

  // State for filters
  const [filters, setFilters] = useState<DispersionFiltersState>({
    month: getCurrentMonth(),
    status: 'all',
    propietarioId: 'all',
    search: '',
  });

  // Fetch dispersiones from API with current filters
  const {
    dispersiones: apiDispersiones,
    isLoading: dispersionesLoading,
    error: dispersionesError,
    refetch: refetchDispersiones,
    setData: setDispersiones,
  } = useDispersiones({
    month: filters.month,
    status: filters.status !== 'all' ? filters.status : undefined,
    propietarioId: filters.propietarioId !== 'all' ? filters.propietarioId : undefined,
  });

  // Fetch propietarios for dropdown
  const { propietarios } = usePropietarios();
  const { config } = useInmobiliariaConfig();

  // Use API data or empty array while loading
  const dispersiones = apiDispersiones ?? [];

  // State for view mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // State for modals
  const [selectedDispersion, setSelectedDispersion] = useState<Dispersion | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [extractoDispersion, setExtractoDispersion] = useState<Dispersion | null>(null);
  const [isExtractoOpen, setIsExtractoOpen] = useState(false);

  // Apply client-side search filter only (API already filters by month, status, propietarioId)
  const filteredDispersiones = useMemo(() => {
    if (!filters.search) return dispersiones;

    const query = filters.search.toLowerCase();
    return dispersiones.filter((d) =>
      d.propietarioName.toLowerCase().includes(query)
    );
  }, [dispersiones, filters.search]);

  // Pagination
  const totalPages = Math.ceil(filteredDispersiones.length / ITEMS_PER_PAGE);
  const paginatedDispersiones = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredDispersiones.slice(start, end);
  }, [filteredDispersiones, currentPage]);

  // Fetch summary for selected month
  const [summary, setSummary] = useState<DispersionSummary>({
    month: filters.month,
    totalToDisburse: 0,
    totalCommissions: 0,
    dispersionsPending: 0,
    dispersionsCompleted: 0,
    dispersionsFailed: 0,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await dispersionesApi.getSummary(filters.month);
        setSummary(data);
      } catch (error) {
        // Calculate from local data as fallback
        const monthDispersiones = dispersiones.filter((d) => d.month === filters.month);
        setSummary({
          month: filters.month,
          totalToDisburse: monthDispersiones.reduce((sum, d) => sum + d.netToPropietario, 0),
          totalCommissions: monthDispersiones.reduce((sum, d) => sum + d.totalCommission, 0),
          dispersionsPending: monthDispersiones.filter((d) => d.status === 'pending').length,
          dispersionsCompleted: monthDispersiones.filter((d) => d.status === 'completed').length,
          dispersionsFailed: monthDispersiones.filter((d) => d.status === 'failed').length,
        });
      }
    };
    fetchSummary();
  }, [filters.month, dispersiones]);

  // Count dispersiones by status for tabs (hybrid: summary + calculated processing)
  const statusCounts = useMemo(() => {
    const processingCount = dispersiones.filter((d) => d.status === 'processing').length;
    const total = summary.dispersionsPending + summary.dispersionsCompleted + summary.dispersionsFailed + processingCount;
    return {
      all: total,
      pending: summary.dispersionsPending,
      processing: processingCount,
      completed: summary.dispersionsCompleted,
      failed: summary.dispersionsFailed,
    };
  }, [summary, dispersiones]);

  // Propietarios for filter dropdown
  const propietarioOptions = useMemo(() => {
    return propietarios.map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }, [propietarios]);

  // Handle dispersion click - open detail modal
  const handleDispersionClick = useCallback((dispersion: Dispersion) => {
    setSelectedDispersion(dispersion);
    setIsDetailOpen(true);
  }, []);

  // Handle process dispersion
  const handleProcessDispersion = useCallback(async (dispersion: Dispersion) => {
    try {
      // Optimistic update: Set to processing
      setDispersiones((prev) =>
        prev?.map((d) =>
          d.id === dispersion.id
            ? {
                ...d,
                status: 'processing' as DispersionStatus,
                updatedAt: new Date().toISOString(),
              }
            : d
        ) ?? []
      );

      toast.loading(t('inmobiliaria.dispersiones.toasts.processing', { name: dispersion.propietarioName }), {
        id: `process-${dispersion.id}`,
      });

      // Call API to process dispersion
      await dispersionesApi.process(dispersion.id);

      // Refetch to get updated status from server
      await refetchDispersiones();

      toast.success(t('inmobiliaria.dispersiones.toasts.processed'), {
        id: `process-${dispersion.id}`,
        description: t('inmobiliaria.dispersiones.toasts.transferSent', { name: dispersion.propietarioName }),
      });

      setIsDetailOpen(false);
    } catch (error) {
      // Revert optimistic update on error
      await refetchDispersiones();
      toast.error(t('inmobiliaria.dispersiones.toasts.error'), {
        id: `process-${dispersion.id}`,
        description: error instanceof Error ? error.message : 'Error al procesar dispersión',
      });
    }
  }, [t, refetchDispersiones, setDispersiones]);

  // Handle retry failed dispersion
  const handleRetryDispersion = useCallback(async (dispersion: Dispersion) => {
    // Same logic as process, but starts from failed state
    await handleProcessDispersion(dispersion);
  }, [handleProcessDispersion]);

  // Handle process all pending
  const handleProcessAll = useCallback(async () => {
    const pending = filteredDispersiones.filter((d) => d.status === 'pending');
    if (pending.length === 0) return;

    try {
      toast.loading(t('inmobiliaria.dispersiones.toasts.processingBatch', { count: pending.length }), {
        id: 'process-all',
      });

      // Optimistic update: Set all to processing
      setDispersiones((prev) =>
        prev?.map((d) =>
          pending.find((p) => p.id === d.id)
            ? {
                ...d,
                status: 'processing' as DispersionStatus,
                updatedAt: new Date().toISOString(),
              }
            : d
        ) ?? []
      );

      // Process all dispersiones via API
      await Promise.all(pending.map((d) => dispersionesApi.process(d.id)));

      // Refetch to get updated data
      await refetchDispersiones();

      toast.success(t('inmobiliaria.dispersiones.toasts.batchCompleted'), {
        id: 'process-all',
        description: t('inmobiliaria.dispersiones.toasts.batchCompletedDesc', { count: pending.length }),
      });
    } catch (error) {
      // Revert on error
      await refetchDispersiones();
      toast.error(t('inmobiliaria.dispersiones.toasts.error'), {
        id: 'process-all',
        description: error instanceof Error ? error.message : 'Error al procesar dispersiones',
      });
    }
  }, [filteredDispersiones, t, refetchDispersiones, setDispersiones]);

  // Handle view extracto
  const handleViewExtracto = useCallback((dispersion: Dispersion) => {
    setExtractoDispersion(dispersion);
    setIsExtractoOpen(true);
    setIsDetailOpen(false);
  }, []);

  // Handle download extracto PDF
  const handleDownloadExtracto = useCallback(async (dispersion: Dispersion) => {
    try {
      const blob = await apiClient.getBlob(`/inmobiliaria/dispersiones/${dispersion.id}/extracto.pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = dispersion.propietarioName.replace(/\s+/g, '-').toLowerCase();
      a.download = `extracto-${safeName}-${dispersion.month}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('inmobiliaria.dispersiones.toasts.pdfDownloaded'), {
        description: t('inmobiliaria.dispersiones.detail.ownerStatement') + ` - ${dispersion.propietarioName}`,
      });
    } catch (error) {
      toast.error(t('inmobiliaria.dispersiones.toasts.error'), {
        description: error instanceof Error ? error.message : 'Error al generar extracto',
      });
    }
  }, [t]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: DispersionFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset page when filters change
  }, []);

  // Handle view pending filter
  const handleViewPending = useCallback(() => {
    setFilters((prev) => ({ ...prev, status: 'pending' }));
    setCurrentPage(1);
  }, []);

  // Handle detail modal close
  const handleDetailClose = useCallback(() => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedDispersion(null), 300);
  }, []);

  // Handle extracto modal close
  const handleExtractoClose = useCallback(() => {
    setIsExtractoOpen(false);
    setTimeout(() => setExtractoDispersion(null), 300);
  }, []);

  // Fetch extracto data for modal when dispersion is selected
  const [extractoData, setExtractoData] = useState<any>(null);
  const [extractoLoading, setExtractoLoading] = useState(false);

  // Load extracto when modal opens
  useEffect(() => {
    if (extractoDispersion && isExtractoOpen) {
      const loadExtracto = async () => {
        try {
          setExtractoLoading(true);
          const data = await propietariosApi.getExtracto(extractoDispersion.propietarioId, extractoDispersion.month);
          setExtractoData(data);
        } catch (error) {
          toast.error(t('inmobiliaria.dispersiones.toasts.error'), {
            description: 'Error al cargar extracto',
          });
          setExtractoData(null);
        } finally {
          setExtractoLoading(false);
        }
      };
      loadExtracto();
    }
  }, [extractoDispersion, isExtractoOpen, t]);

  // Format month for display
  const monthDisplay = new Date(filters.month + '-01').toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const hasPendingDispersiones = summary.dispersionsPending > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.dispersiones.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.dispersiones.subtitle')}
          </p>
        </div>
        <Button asChild hideArrow className="shrink-0">
          <Link href="/panel/inmobiliaria/dispersiones/generar">
            <Lightning className="w-4 h-4" weight="fill" />
            {t('inmobiliaria.dispersiones.wizard.title')}
          </Link>
        </Button>
      </div>

      {/* Summary Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DispersionResumen
          summary={summary}
          onViewPending={handleViewPending}
          onProcessAll={hasPendingDispersiones ? handleProcessAll : undefined}
        />
      </motion.div>

      {/* Unified Card - View Toggle + Filters + Content + Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card"
      >
        {/* View Toggle Header - FIRST (Primary hierarchy) */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <SegmentedControl
            aria-label={t('inmobiliaria.dispersiones.viewTable')}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              {
                value: 'table',
                label: (
                  <span className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    {t('inmobiliaria.dispersiones.viewTable')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.dispersiones.viewTable'),
              },
              {
                value: 'cards',
                label: (
                  <span className="flex items-center gap-2">
                    <SquaresFour className="w-4 h-4" />
                    {t('inmobiliaria.dispersiones.viewCards')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.dispersiones.viewCards'),
              },
            ]}
          />
          <span className="text-xs text-fg-muted tabular-nums">
            {filteredDispersiones.length} {t('inmobiliaria.nav.dispersiones').toLowerCase()}
          </span>
        </div>

        {/* Filters Section - SECOND */}
        <DispersionFilters
          filters={filters}
          onFiltersChange={handleFilterChange}
          propietarios={propietarioOptions}
          statusCounts={statusCounts}
        />

        {/* Dispersiones List/Table */}
        <div>
          {filteredDispersiones.length > 0 ? (
            viewMode === 'table' ? (
              <DispersionTable
                dispersiones={paginatedDispersiones}
                onViewDetail={handleDispersionClick}
                onProcess={handleProcessDispersion}
                onDownloadExtracto={handleDownloadExtracto}
                showSummary
              />
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedDispersiones.map((dispersion) => (
                  <DispersionCard
                    key={dispersion.id}
                    dispersion={dispersion}
                    onViewDetail={handleDispersionClick}
                    onProcess={
                      dispersion.status === 'pending'
                        ? () => handleProcessDispersion(dispersion)
                        : undefined
                    }
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
                <PaperPlaneTilt
                  weight="duotone"
                  className="h-6 w-6 text-neutral-400 dark:text-neutral-500"
                  aria-hidden="true"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-fg">
                  {t('inmobiliaria.dispersiones.noDispersions')}
                </p>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
                  {t('inmobiliaria.dispersiones.noDispersionsDesc')}
                </p>
              </div>
              {filters.status !== 'all' && (
                <Button
                  variant="link"
                  onClick={() => setFilters((prev) => ({ ...prev, status: 'all' }))}
                >
                  {t('inmobiliaria.dispersiones.filters.all')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-center bg-muted/10">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </motion.div>

      {/* Dispersion Detail Modal */}
      <DispersionDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        dispersion={selectedDispersion}
        onProcess={handleProcessDispersion}
        onViewExtracto={handleViewExtracto}
        onRetry={handleRetryDispersion}
      />

      {/* Extracto Modal */}
      <Dialog open={isExtractoOpen} onOpenChange={(open) => !open && handleExtractoClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>{t('inmobiliaria.dispersiones.detail.ownerStatement')}</span>
              {extractoData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => extractoDispersion && handleDownloadExtracto(extractoDispersion)}
                  className="flex items-center gap-2"
                >
                  <DownloadSimple className="w-4 h-4" />
                  {t('inmobiliaria.dispersiones.downloadPdf')}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4">
            {extractoData && (
              <ExtractoPropietario extracto={extractoData} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DispersionesPage() {
  return (
    <PageGuard module="dispersiones">
      <DispersionesContent />
    </PageGuard>
  );
}
