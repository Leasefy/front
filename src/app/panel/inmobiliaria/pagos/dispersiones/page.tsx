'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/toast';
import {
  Bank,
  PaperPlaneTilt,
  Table,
  SquaresFour,
  Lightning,
  DownloadSimple,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh';
import {
  useDispersiones,
  usePropietarios,
  useInmobiliariaConfig,
  dispersionesApi,
  propietariosApi,
} from '@/lib/hooks/useInmobiliaria';
import type {
  Dispersion,
  DispersionStatus,
  DispersionSummary,
  ExtractoPropietario as ExtractoPropietarioData,
} from '@/lib/types/inmobiliaria';
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
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { SegmentedControl } from '@leasefy/cadence';

// View modes
type ViewMode = 'table' | 'cards';

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * DispersionesPage - Main page for managing disbursements to property owners
 * Route: /panel/inmobiliaria/pagos/dispersiones
 *
 * Las dispersiones se auto-refrescan vía useAutoRefresh (30s + focus/visibility).
 * TODO [BACKEND]: para tiempo real fino, implementar WebSocket o Server-Sent
 * Events para:
 * - Cambios de estado de dispersiones (pending → processing → completed)
 * - Nuevas dispersiones generadas
 * - Actualizaciones de montos o datos de propietarios
 */
function DispersionesContent() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();

  /*
   * `?mes=` abre la lista en ese mes. Lo usa el asistente al terminar: generar
   * las de julio y caer en agosto —vacío, «No hay dispersiones registradas»—
   * se lee como que no pasó nada.
   */
  const mesPedido = searchParams.get('mes');

  // State for filters
  const [filters, setFilters] = useState<DispersionFiltersState>({
    month: /^\d{4}-\d{2}$/.test(mesPedido ?? '')
      ? (mesPedido as string)
      : getCurrentMonth(),
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

  useAutoRefresh(refetchDispersiones);

  // Fetch propietarios for dropdown
  const { propietarios } = usePropietarios();
  const { config } = useInmobiliariaConfig();

  /*
   * `?? []` a secas crea un array NUEVO en cada render. Todo lo que dependa de
   * `dispersiones` —dos useMemo y un useEffect— se recalcula siempre, y el
   * efecto del resumen entraba en bucle: efecto → setState → render → array
   * nuevo → efecto. Mientras la ruta de resumen no existió, eso fueron ~2,5
   * peticiones por segundo contra el back, para siempre.
   */
  const dispersiones = useMemo(() => apiDispersiones ?? [], [apiDispersiones]);

  // State for view mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

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

  // Paginación — el pie canónico del panel (`useTablePagination` +
  // `TablePagination`). Antes era un slice a mano de 6 por página con el
  // paginador de ventana: no decía cuántas dispersiones había en total ni
  // dejaba elegir cuántas filas ver. `resetKey` lleva los cuatro filtros:
  // mes, estado y propietario los resuelve la API, la búsqueda es de acá.
  const {
    pageItems: paginatedDispersiones,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(filteredDispersiones, {
    resetKey: `${filters.month}|${filters.status}|${filters.propietarioId}|${filters.search}`,
  });

  // Fetch summary for selected month
  const [summary, setSummary] = useState<DispersionSummary>({
    month: filters.month,
    totalToDisburse: 0,
    totalCommissions: 0,
    dispersionsPending: 0,
    dispersionsCompleted: 0,
    dispersionsFailed: 0,
  });

  /*
   * ⚠️ El efecto NO puede depender de `dispersiones`.
   *
   * `useDispersiones` devuelve un array nuevo en cada render, así que
   * `dispersiones` cambia de identidad siempre. Con él en las dependencias:
   * efecto → setSummary → render → array nuevo → efecto → … Un bucle infinito
   * que, mientras `getSummary` falló (la ruta no existía), disparó ~2,5
   * peticiones por segundo contra el back, indefinidamente.
   *
   * El respaldo local se calcula con `dispersionesRef`, que no reengancha.
   */
  const dispersionesRef = useRef(dispersiones);
  dispersionesRef.current = dispersiones;

  useEffect(() => {
    let cancelado = false;
    const fetchSummary = async () => {
      try {
        const data = await dispersionesApi.getSummary(filters.month);
        if (!cancelado) setSummary(data);
      } catch {
        // Respaldo con lo que ya está en pantalla, para no mostrar ceros.
        const delMes = dispersionesRef.current.filter((d) => d.month === filters.month);
        if (cancelado) return;
        setSummary({
          month: filters.month,
          totalToDisburse: delMes.reduce((sum, d) => sum + d.netToPropietario, 0),
          totalCommissions: delMes.reduce((sum, d) => sum + d.totalCommission, 0),
          dispersionsPending: delMes.filter((d) => d.status === 'pending').length,
          dispersionsCompleted: delMes.filter((d) => d.status === 'completed').length,
          dispersionsFailed: delMes.filter((d) => d.status === 'failed').length,
        });
      }
    };
    void fetchSummary();
    return () => {
      cancelado = true;
    };
  }, [filters.month]);

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

  /**
   * Aprobar — el primer par de ojos.
   *
   * El front NUNCA llamaba a `approve`, así que toda dispersión seguía en
   * `pending` y cada «Procesar» moría con un 400 del back (que exige estado
   * `PROCESSING`). Sin este paso el circuito entero estaba muerto.
   */
  const handleApproveDispersion = useCallback(async (dispersion: Dispersion) => {
    const id = `approve-${dispersion.id}`;
    try {
      toast.loading(t('inmobiliaria.dispersiones.toasts.processing', { name: dispersion.propietarioName }), { id });
      await dispersionesApi.approve(dispersion.id);
      await refetchDispersiones();
      // El toast va DESPUÉS de la respuesta, y dice lo que de verdad pasó.
      toast.success(t('inmobiliaria.dispersiones.toasts.aprobada'), {
        id,
        description: t('inmobiliaria.dispersiones.toasts.aprobadaDesc'),
      });
    } catch (error) {
      await refetchDispersiones();
      toast.error(t('inmobiliaria.dispersiones.toasts.error'), {
        id,
        description: error instanceof Error ? error.message : 'Error al aprobar la dispersión',
      });
    }
  }, [t, refetchDispersiones]);

  /**
   * El botón de la fila (tabla y tarjeta).
   *
   * Aprobar se puede desde la fila: no pide ningún dato. Marcar un giro NO —
   * necesita la referencia del banco— así que abre el cajón en vez de disparar
   * una llamada que el back rechaza. Antes la fila llamaba a `process` con
   * `{}` sobre una dispersión `pending`: 400 seguro, y el cartel decía que la
   * transferencia se había enviado.
   */
  const handleAccionDeFila = useCallback((dispersion: Dispersion) => {
    if (dispersion.status === 'pending') {
      void handleApproveDispersion(dispersion);
      return;
    }
    setSelectedDispersion(dispersion);
    setIsDetailOpen(true);
  }, [handleApproveDispersion]);

  /**
   * Anotar la referencia del giro — el segundo par de ojos.
   *
   * El sistema NO envía transferencias: registra la que alguien ya hizo por el
   * banco. Por eso la referencia es obligatoria (el back la exige) y el texto
   * dejó de prometer «Transferencia enviada».
   */
  const handleProcessDispersion = useCallback(async (dispersion: Dispersion, transferReference: string) => {
    const id = `process-${dispersion.id}`;
    try {
      toast.loading(t('inmobiliaria.dispersiones.toasts.processing', { name: dispersion.propietarioName }), { id });

      await dispersionesApi.process(dispersion.id, transferReference);
      await refetchDispersiones();

      toast.success(t('inmobiliaria.dispersiones.toasts.referenciaGuardada'), {
        id,
        description: t('inmobiliaria.dispersiones.toasts.referenciaGuardadaDesc', { name: dispersion.propietarioName }),
      });

      setIsDetailOpen(false);
    } catch (error) {
      await refetchDispersiones();
      toast.error(t('inmobiliaria.dispersiones.toasts.error'), {
        id,
        description: error instanceof Error ? error.message : 'Error al procesar dispersión',
      });
    }
  }, [t, refetchDispersiones]);

  // Reintentar una fallida es el mismo camino: la referencia sigue siendo del banco.
  const handleRetryDispersion = useCallback(async (dispersion: Dispersion, transferReference: string) => {
    await handleProcessDispersion(dispersion, transferReference);
  }, [handleProcessDispersion]);

  /**
   * Aprobar todas las pendientes — lo único que se puede hacer en masa.
   *
   * Antes esto decía «Procesar todas» y mandaba `{}` a `process`: 400 en todas,
   * y aun así la pantalla anunciaba «{{count}} transferencias enviadas». Marcar
   * un giro NO se puede hacer en masa: cada uno lleva la referencia que le dio
   * el banco, y una referencia inventada es peor que un botón que no está.
   */
  const handleProcessAll = useCallback(async () => {
    const pending = filteredDispersiones.filter((d) => d.status === 'pending');
    if (pending.length === 0) return;

    try {
      toast.loading(t('inmobiliaria.dispersiones.toasts.processingBatch', { count: pending.length }), {
        id: 'process-all',
      });

      await Promise.all(pending.map((d) => dispersionesApi.approve(d.id)));
      await refetchDispersiones();

      toast.success(t('inmobiliaria.dispersiones.toasts.aprobadasBatch', { count: pending.length }), {
        id: 'process-all',
        description: t('inmobiliaria.dispersiones.toasts.aprobadasBatchDesc'),
      });
    } catch (error) {
      await refetchDispersiones();
      toast.error(t('inmobiliaria.dispersiones.toasts.error'), {
        id: 'process-all',
        description: error instanceof Error ? error.message : 'Error al aprobar dispersiones',
      });
    }
  }, [filteredDispersiones, t, refetchDispersiones]);

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

  // La vuelta a la página 1 la hace `useTablePagination` por `resetKey`, no acá.
  const handleFilterChange = useCallback((newFilters: DispersionFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Handle view pending filter
  const handleViewPending = useCallback(() => {
    setFilters((prev) => ({ ...prev, status: 'pending' }));
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
  /*
   * Tipado, no `any`. Con `any` acá, el componente leía `extracto.properties`
   * —un campo que el back nunca envió, la respuesta trae `lineItems`— y tsc no
   * decía nada: el modal reventaba con un TypeError al abrirlo.
   */
  const [extractoData, setExtractoData] = useState<ExtractoPropietarioData | null>(null);
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
  /*
   * `new Date('2026-08-01')` se parsea como medianoche UTC y se pinta en hora
   * local: en Colombia (UTC-5) retrocede al 31 de julio, y el título decía
   * «julio de 2026» sobre los datos de agosto. Partiendo el string se lee el
   * mes que dice, sin pasar por ningún huso.
   */
  const [anioSel, mesSel] = filters.month.split('-').map(Number);
  const monthDisplay = new Date(anioSel, mesSel - 1, 1).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const hasPendingDispersiones = summary.dispersionsPending > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.dispersiones.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            {t('inmobiliaria.dispersiones.subtitle')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Los lotes al banco: el archivo plano con doble aprobación. */}
          <Button asChild variant="secondary" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/dispersiones/lotes">
              <Bank className="w-4 h-4" />
              Lotes al banco
            </Link>
          </Button>
          <Button asChild hideArrow>
            <Link href="/panel/inmobiliaria/pagos/dispersiones/generar">
              <Lightning className="w-4 h-4" weight="fill" />
              {t('inmobiliaria.dispersiones.wizard.title')}
            </Link>
          </Button>
        </div>
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
        className="rounded-lg border border-border bg-card"
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
                onProcess={handleAccionDeFila}
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
                        ? () => handleAccionDeFila(dispersion)
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
                  className="h-6 w-6 text-fg-muted"
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

        {/* Pie de tabla del design system: «X dispersiones · Filas por
            página · n/m». Se monta también con una sola fila. */}
        {shouldPaginate && (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </motion.div>

      {/* Dispersion Detail Modal */}
      <DispersionDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        dispersion={selectedDispersion}
        onApprove={handleApproveDispersion}
        onProcess={handleProcessDispersion}
        onViewExtracto={handleViewExtracto}
        onRetry={handleRetryDispersion}
      />

      {/* Extracto Modal */}
      <Dialog open={isExtractoOpen} onOpenChange={(open) => !open && handleExtractoClose()}>
        {/*
          Más ancho porque el extracto tiene nueve columnas. El scroll vertical
          ya lo pone el primitivo del Dialog, así que NO se agrega otro acá:
          dos scrollers anidados se pelean el gesto.

          `data-lenis-prevent` sí es obligatorio — el scroll suave se come el
          de cualquier cosa flotante si no se le dice que no toque esto.
        */}
        <DialogContent className="max-w-5xl max-h-[90vh]" data-lenis-prevent>
          <DialogHeader>
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
          {/* : es hijo de un grid, y sin esto se estira al ancho de
              la tabla en vez de dejar que ella scrollee adentro. */}
          <div className="min-w-0 p-6 pt-4">
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
      {/* `useSearchParams` obliga a un límite de Suspense: sin él, `next build`
          falla al prerenderizar la ruta. */}
      <Suspense fallback={null}>
        <DispersionesContent />
      </Suspense>
    </PageGuard>
  );
}
