'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  PaperPlaneTilt,
  Table,
  SquaresFour,
  Lightning,
  DownloadSimple,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  MOCK_DISPERSIONES,
  MOCK_PROPIETARIOS,
  generateExtractoPropietario,
} from '@/lib/data/mock-inmobiliaria';
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
import { downloadExtractoPDF } from '@/lib/utils/generate-extracto-pdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
export default function DispersionesPage() {
  // State for dispersiones (local copy for optimistic updates)
  const [dispersiones, setDispersiones] = useState<Dispersion[]>(MOCK_DISPERSIONES);

  // State for filters
  const [filters, setFilters] = useState<DispersionFiltersState>({
    month: getCurrentMonth(),
    status: 'all',
    propietarioId: 'all',
    search: '',
  });

  // State for view mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // State for modals
  const [selectedDispersion, setSelectedDispersion] = useState<Dispersion | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [extractoDispersion, setExtractoDispersion] = useState<Dispersion | null>(null);
  const [isExtractoOpen, setIsExtractoOpen] = useState(false);

  // Filter dispersiones based on current filters
  const filteredDispersiones = useMemo(() => {
    let result = dispersiones.filter((d) => d.month === filters.month);

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter((d) => d.status === filters.status);
    }

    // Filter by propietario
    if (filters.propietarioId !== 'all') {
      result = result.filter((d) => d.propietarioId === filters.propietarioId);
    }

    // Filter by search (propietario name)
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter((d) =>
        d.propietarioName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [dispersiones, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredDispersiones.length / ITEMS_PER_PAGE);
  const paginatedDispersiones = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredDispersiones.slice(start, end);
  }, [filteredDispersiones, currentPage]);

  // Calculate summary for selected month
  const summary: DispersionSummary = useMemo(() => {
    const monthDispersiones = dispersiones.filter((d) => d.month === filters.month);

    return {
      month: filters.month,
      totalToDisburse: monthDispersiones.reduce((sum, d) => sum + d.netToPropietario, 0),
      totalCommissions: monthDispersiones.reduce((sum, d) => sum + d.totalCommission, 0),
      dispersionsPending: monthDispersiones.filter((d) => d.status === 'pending').length,
      dispersionsCompleted: monthDispersiones.filter((d) => d.status === 'completed').length,
      dispersionsFailed: monthDispersiones.filter((d) => d.status === 'failed').length,
    };
  }, [dispersiones, filters.month]);

  // Count dispersiones by status for tabs
  const statusCounts = useMemo(() => {
    const monthDispersiones = dispersiones.filter((d) => d.month === filters.month);
    return {
      all: monthDispersiones.length,
      pending: monthDispersiones.filter((d) => d.status === 'pending').length,
      processing: monthDispersiones.filter((d) => d.status === 'processing').length,
      completed: monthDispersiones.filter((d) => d.status === 'completed').length,
      failed: monthDispersiones.filter((d) => d.status === 'failed').length,
    };
  }, [dispersiones, filters.month]);

  // Propietarios for filter dropdown
  const propietarioOptions = useMemo(() => {
    return MOCK_PROPIETARIOS.map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }, []);

  // Handle dispersion click - open detail modal
  const handleDispersionClick = useCallback((dispersion: Dispersion) => {
    setSelectedDispersion(dispersion);
    setIsDetailOpen(true);
  }, []);

  // Handle process dispersion
  const handleProcessDispersion = useCallback(async (dispersion: Dispersion) => {
    // Step 1: Set to processing
    setDispersiones((prev) =>
      prev.map((d) =>
        d.id === dispersion.id
          ? {
              ...d,
              status: 'processing' as DispersionStatus,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );

    toast.loading(`Procesando dispersion para ${dispersion.propietarioName}...`, {
      id: `process-${dispersion.id}`,
    });

    // Simulate transfer delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Step 2: Mark as completed
    const transferRef = `TRF-${filters.month.replace('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    setDispersiones((prev) =>
      prev.map((d) =>
        d.id === dispersion.id
          ? {
              ...d,
              status: 'completed' as DispersionStatus,
              processedAt: new Date().toISOString(),
              transferReference: transferRef,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );

    toast.success(`Dispersion completada`, {
      id: `process-${dispersion.id}`,
      description: `Transferencia enviada a ${dispersion.propietarioName}`,
    });

    setIsDetailOpen(false);
  }, [filters.month]);

  // Handle retry failed dispersion
  const handleRetryDispersion = useCallback(async (dispersion: Dispersion) => {
    // Same logic as process, but starts from failed state
    await handleProcessDispersion(dispersion);
  }, [handleProcessDispersion]);

  // Handle process all pending
  const handleProcessAll = useCallback(async () => {
    const pending = filteredDispersiones.filter((d) => d.status === 'pending');
    if (pending.length === 0) return;

    toast.loading(`Procesando ${pending.length} dispersiones...`, {
      id: 'process-all',
    });

    // Set all to processing
    setDispersiones((prev) =>
      prev.map((d) =>
        pending.find((p) => p.id === d.id)
          ? {
              ...d,
              status: 'processing' as DispersionStatus,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );

    // Simulate batch processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mark all as completed
    setDispersiones((prev) =>
      prev.map((d) => {
        const isPending = pending.find((p) => p.id === d.id);
        if (isPending) {
          return {
            ...d,
            status: 'completed' as DispersionStatus,
            processedAt: new Date().toISOString(),
            transferReference: `TRF-${filters.month.replace('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            updatedAt: new Date().toISOString(),
          };
        }
        return d;
      })
    );

    toast.success('Dispersiones completadas', {
      id: 'process-all',
      description: `${pending.length} transferencias enviadas exitosamente`,
    });
  }, [filteredDispersiones, filters.month]);

  // Handle view extracto
  const handleViewExtracto = useCallback((dispersion: Dispersion) => {
    setExtractoDispersion(dispersion);
    setIsExtractoOpen(true);
    setIsDetailOpen(false);
  }, []);

  // Handle download extracto PDF
  const handleDownloadExtracto = useCallback((dispersion: Dispersion) => {
    const extracto = generateExtractoPropietario(dispersion.propietarioId, dispersion.month);
    if (extracto) {
      downloadExtractoPDF(extracto);
      toast.success('PDF descargado', {
        description: `Extracto de ${dispersion.propietarioName}`,
      });
    } else {
      toast.error('No se pudo generar el extracto');
    }
  }, []);

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

  // Generate extracto data for modal
  const extractoData = useMemo(() => {
    if (!extractoDispersion) return null;
    return generateExtractoPropietario(extractoDispersion.propietarioId, extractoDispersion.month);
  }, [extractoDispersion]);

  // Format month for display
  const monthDisplay = new Date(filters.month + '-01').toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  const hasPendingDispersiones = summary.dispersionsPending > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dispersiones a Propietarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los pagos mensuales a los propietarios
          </p>
        </div>
        <Link
          href="/panel/inmobiliaria/dispersiones/generar"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/25"
        >
          <Lightning className="w-5 h-5" weight="fill" />
          Generar Dispersiones
        </Link>
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
              Tabla
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
              Cards
            </button>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {filteredDispersiones.length} dispersion{filteredDispersiones.length !== 1 ? 'es' : ''}
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
            <div className="p-12 text-center">
              <PaperPlaneTilt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Sin dispersiones
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                No hay dispersiones que coincidan con los filtros para{' '}
                <span className="capitalize">{monthDisplay}</span>.
              </p>
              {filters.status !== 'all' && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, status: 'all' }))}
                  className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Ver todas las dispersiones
                </button>
              )}
              {filteredDispersiones.length === 0 &&
                dispersiones.filter((d) => d.month === filters.month).length === 0 && (
                  <div className="mt-6">
                    <Link
                      href="/panel/inmobiliaria/dispersiones/generar"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
                    >
                      <Lightning className="w-4 h-4" weight="fill" />
                      Generar Dispersiones
                    </Link>
                  </div>
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
              <span>Extracto del Propietario</span>
              {extractoData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => extractoDispersion && handleDownloadExtracto(extractoDispersion)}
                  className="flex items-center gap-2"
                >
                  <DownloadSimple className="w-4 h-4" />
                  Descargar PDF
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
