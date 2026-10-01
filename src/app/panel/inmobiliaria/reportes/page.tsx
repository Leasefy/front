'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/toast';
import {
  ChartLine,
  Lightning,
  Star,
  Clock,
  MagnifyingGlass,
  SquaresFour,
  Table,
  FileText,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui';
import { SegmentedControl } from '@leasefy/cadence';
import type { ReportDefinition, ReportId, ReportCategory } from '@/lib/types/inmobiliaria';
import { REPORT_DEFINITIONS } from '@/lib/constants/inmobiliaria-data';
import {
  comoSeBaja,
  sePuedeBajar,
  nombreDelArchivo,
  parametrosDelPeriodo,
  rutaDeExport,
  descargarBlob,
} from '@/lib/reportes/exportables';
import {
  ReporteCard,
  ReporteFilters,
  ReporteViewer,
  type ReporteFiltersState,
} from '@/components/inmobiliaria';
import { apiClient, ApiError } from '@/lib/api/client';
import { abrirCentroDeProcesos, procesosApi, type PedidoDeReporte } from '@/lib/api/procesos.service';
import { useAgencyPlan } from '@/lib/hooks/useAgencyPlan';
// Local storage key for favorites
const FAVORITES_STORAGE_KEY = 'arriendo-facil-report-favorites';

// View modes
type ViewMode = 'grid' | 'list';

/**
 * Get period dates for current month
 */
function getDefaultPeriod(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Load favorites from localStorage
 */
function loadFavorites(): Set<ReportId> {
  if (typeof window === 'undefined') return new Set();

  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Set(parsed);
    }
  } catch {
    // Ignore errors
  }

  // Default favorites from report definitions
  return new Set(
    REPORT_DEFINITIONS.filter((r) => r.isFavorite).map((r) => r.id)
  );
}

/**
 * Guarda los favoritos. Devuelve si de verdad quedaron guardados.
 *
 * 🔴 RP3 (auditoría 13-09): esto tragaba el error con un `catch {}` y la
 * pantalla igual decía «Agregado a favoritos». `localStorage` falla de verdad
 * —modo privado de Safari, cuota llena, el usuario bloqueó el almacenamiento—,
 * y entonces la marca desaparece al recargar sin que nadie haya avisado.
 * Afirmar que algo se guardó cuando no se guardó es de las mentiras más caras
 * que puede decir una pantalla, porque no se descubre hasta después.
 */
function saveFavorites(favorites: Set<ReportId>): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
    return true;
  } catch {
    return false;
  }
}

/**
 * ReportesPage - Reports center for the inmobiliaria module
 * Route: /panel/inmobiliaria/reportes
 */
function ReportesContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { hasAdvancedReports } = useAgencyPlan();

  // State for reports (local copy with last generated timestamps)
  const [reports, setReports] = useState<ReportDefinition[]>(() => {
    return REPORT_DEFINITIONS.map((r) => ({ ...r }));
  });

  // State for filters
  const [filters, setFilters] = useState<ReporteFiltersState>({
    period: getDefaultPeriod(),
    zone: null,
    category: 'all',
    search: '',
    favoritesOnly: false,
  });

  // State for favorites
  const [favorites, setFavorites] = useState<Set<ReportId>>(new Set());

  // State for view mode
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // State for viewer modal
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // State for generating reports
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());
  /** «Generar todos» mandándose al centro de procesos. */
  const [enviandoTodos, setEnviandoTodos] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const loaded = loadFavorites();
    setFavorites(loaded);

    // Update reports with favorite status
    setReports((prev) =>
      prev.map((r) => ({
        ...r,
        isFavorite: loaded.has(r.id),
      }))
    );
  }, []);

  // Filter reports based on current filters
  const filteredReports = useMemo(() => {
    let result = [...reports];

    // Filter by category
    if (filters.category !== 'all') {
      result = result.filter((r) => r.category === filters.category);
    }

    // Filter by favorites only
    if (filters.favoritesOnly) {
      result = result.filter((r) => favorites.has(r.id));
    }

    // Filter by search
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [reports, filters, favorites]);

  // Get favorite reports (always shown at top)
  const favoriteReports = useMemo(() => {
    return filteredReports.filter((r) => favorites.has(r.id));
  }, [filteredReports, favorites]);

  // Get non-favorite reports
  const otherReports = useMemo(() => {
    return filteredReports.filter((r) => !favorites.has(r.id));
  }, [filteredReports, favorites]);

  // Count reports by category
  const reportCounts = useMemo(() => {
    const baseReports = filters.favoritesOnly
      ? reports.filter((r) => favorites.has(r.id))
      : reports;

    return {
      all: baseReports.length,
      financiero: baseReports.filter((r) => r.category === 'financiero').length,
      operativo: baseReports.filter((r) => r.category === 'operativo').length,
      agentes: baseReports.filter((r) => r.category === 'agentes').length,
    };
  }, [reports, filters.favoritesOnly, favorites]);

  /*
   * 🔴 El filtro de zona se RETIRÓ (RP2 de la auditoría del 13-09).
   *
   * `filters.zone` se guardaba y NUNCA se aplicaba: `filteredReports` filtra
   * por categoría, favoritos y búsqueda, y ningún endpoint de reportes acepta
   * una zona. Elegir una zona no cambiaba un solo número. En una pantalla de
   * REPORTES —donde el dato se convierte en decisión— un control así es peor
   * que no tenerlo: hace creer que lo que se está mirando es de esa zona.
   *
   * Lo que se conserva es cómo leer las zonas de verdad
   * (`lib/reportes/zonas.ts`, con su prueba): el día que el back sepa filtrar
   * por zona, el desplegable vuelve con esa fuente y no con seis nombres
   * escritos a mano, que es como estaba antes.
   */

  // Quick stats
  const stats = useMemo(() => {
    const lastGenerated = reports
      .filter((r) => r.lastGenerated)
      .sort((a, b) => {
        const dateA = a.lastGenerated ? new Date(a.lastGenerated).getTime() : 0;
        const dateB = b.lastGenerated ? new Date(b.lastGenerated).getTime() : 0;
        return dateB - dateA;
      })[0];

    return {
      totalReports: reports.length,
      favoritesCount: favorites.size,
      lastGeneratedTime: lastGenerated?.lastGenerated
        // `es-CO`, no `es-CL`: esto es un ERP colombiano y el resto de la
        // pantalla ya formatea en pesos y fechas de Colombia.
        ? new Date(lastGenerated.lastGenerated).toLocaleString(locale === 'es' ? 'es-CO' : 'en-US', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })
        : t('inmobiliaria.reportes.stats.never'),
      // Una raya, no «N/A»: es el símbolo con el que el resto del producto
      // dice «acá no hay dato todavía», y no hay que traducirlo de la cabeza.
      lastGeneratedReport: lastGenerated?.title || '—',
    };
  }, [reports, favorites]);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback((reportId: ReportId) => {
    const wasFavorite = favorites.has(reportId);
    const next = new Set(favorites);
    if (wasFavorite) next.delete(reportId);
    else next.add(reportId);

    // Se guarda PRIMERO y se anuncia lo que de verdad pasó (RP3).
    const guardado = saveFavorites(next);

    setFavorites(next);
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, isFavorite: !r.isFavorite } : r
      )
    );

    const report = reports.find((r) => r.id === reportId);

    if (!guardado) {
      toast.warning('El cambio vale para esta sesión, pero no se pudo guardar', {
        description:
          'Tu navegador no dejó escribir el almacenamiento local (suele pasar en modo privado). Al recargar, tus favoritos vuelven a como estaban.',
      });
      return;
    }

    toast.success(wasFavorite ? t('inmobiliaria.reportes.toasts.removedFromFavorites') : t('inmobiliaria.reportes.toasts.addedToFavorites'), {
      description: report?.title,
    });
  }, [reports, favorites, t]);

  /**
   * Bajar el reporte. De verdad.
   *
   * Esto ANTES era `setTimeout(1500)` + `lastGenerated` en estado local +
   * `toast.success('Reporte generado')`. Nada salía a la red: la fecha que
   * quedaba en la tarjeta era la de un archivo que no existía, y se perdía al
   * recargar. Ver `src/lib/reportes/exportables.ts`.
   *
   * `lastGenerated` ahora se estampa SÓLO si el archivo llegó y se descargó.
   */
  const bajarReporte = useCallback(async (report: ReportDefinition): Promise<boolean> => {
    const como = comoSeBaja(report.id as ReportId);

    if (!como.disponible) {
      toast.info(`${report.title}: todavía no se puede descargar`, {
        description: como.motivo,
        action: como.dondeSiHay
          ? { label: como.dondeSiHay.label, onClick: () => router.push(como.dondeSiHay!.href) }
          : undefined,
      });
      return false;
    }

    setGeneratingReports((prev) => new Set([...prev, report.id]));
    try {
      // RP1: el período elegido arriba viaja al archivo en la forma que cada
      // tipo acepta, y el aviso dice qué hizo con él (ver exportables.ts).
      const { params, nota } = parametrosDelPeriodo(como.tipo, filters.period);
      const blob = await apiClient.getBlob(rutaDeExport(como.tipo, params));
      descargarBlob(blob, nombreDelArchivo(como.tipo, new Date().toISOString().slice(0, 10)));

      const now = new Date().toISOString();
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, lastGenerated: now } : r)),
      );
      toast.success('Descargado', { description: `${report.title} · CSV · ${nota}` });
      return true;
    } catch (error) {
      toast.error('No pudimos generar el reporte', {
        description:
          error instanceof ApiError && error.status === 403
            ? 'Tu rol no incluye descargar reportes.'
            : 'Prueba de nuevo en un momento.',
      });
      return false;
    } finally {
      setGeneratingReports((prev) => {
        const next = new Set(prev);
        next.delete(report.id);
        return next;
      });
    }
  }, [router, filters.period]);

  // Handle preview report
  // 🔴 Todos abren su vista en el cajón, también la rentabilidad: antes
  // «Vista previa» de esa tarjeta navegaba a su pantalla y no mostraba nada
  // (Nico, 01-10). Desde el cajón se sigue llegando a la pantalla completa.
  const handlePreviewReport = useCallback((report: ReportDefinition) => {
    setSelectedReport(report);
    setIsViewerOpen(true);
  }, []);

  /**
   * Descargar es lo mismo que generar: el back arma el CSV a pedido, no hay un
   * archivo guardado que uno «genere» primero y baje después. Tener dos
   * botones distintos para una sola acción fue lo que dejó lugar a que uno de
   * los dos mintiera. El `format` que llegaba de la tarjeta ya no decide nada:
   * lo decide `exportables.ts`, que es lo que el back sabe producir.
   */
  const handleExportReport = useCallback(
    async (report: ReportDefinition) => {
      await bajarReporte(report);
    },
    [bajarReporte]
  );

  // Handle viewer export
  // Devuelve la promesa: el botón del cajón espera a la descarga de verdad
  // en vez de fingir 1,5 s y volver a habilitarse con el pedido en vuelo.
  const handleViewerExport = useCallback(
    async () => {
      if (selectedReport) await handleExportReport(selectedReport);
    },
    [selectedReport, handleExportReport]
  );

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: ReporteFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Handle viewer close
  const handleViewerClose = useCallback(() => {
    setIsViewerOpen(false);
    setTimeout(() => setSelectedReport(null), 300);
  }, []);

  /**
   * Bajar todos los que se pueden bajar: UN zip, armado en el CENTRO DE
   * PROCESOS.
   *
   * 🔴 Nico, 01-10: «esas cargas ¿por qué no las metes al centro de
   * procesos?». Se bajaban de a uno y cada uno dejaba su aviso en la esquina
   * («Descargando 6 reportes…», «Descargado», «Descargado»…). Ahora la
   * pantalla manda la lista —cada reporte con los parámetros del período que
   * acepta, igual que su botón— y el centro se abre en ese proceso, con su
   * avance y el archivo al final.
   */
  const handleGenerateAll = useCallback(async () => {
    const pedidos: PedidoDeReporte[] = [];
    let noBajables = 0;
    for (const r of filteredReports) {
      const como = comoSeBaja(r.id as ReportId);
      if (!como.disponible) {
        noBajables += 1;
        continue;
      }
      pedidos.push({ tipo: como.tipo, ...parametrosDelPeriodo(como.tipo, filters.period).params });
    }

    if (pedidos.length === 0) {
      toast.info('No hay reportes para descargar', {
        description:
          noBajables > 0
            ? `${noBajables} de los que ves todavía no se generan.`
            : 'Ajusta los filtros para ver otros reportes.',
      });
      return;
    }

    setEnviandoTodos(true);
    try {
      const { procesoId } = await procesosApi.exportarReportes(pedidos);
      abrirCentroDeProcesos({ procesoId });
    } catch (error) {
      toast.error('No pudimos armar el archivo', {
        description:
          error instanceof ApiError && error.status === 403
            ? 'Tu rol no incluye descargar reportes.'
            : 'Prueba de nuevo en un momento.',
      });
    } finally {
      setEnviandoTodos(false);
    }
  }, [filteredReports, filters.period]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.reportes.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            {t('inmobiliaria.reportes.subtitle')}
          </p>
        </div>
        {/* TODO Backend: Los reportes deben actualizarse en tiempo real via subscriptions/websockets */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            hideArrow
            onClick={() => void handleGenerateAll()}
            disabled={generatingReports.size > 0 || enviandoTodos}
            isLoading={enviandoTodos}
            className="gap-2"
          >
            {!enviandoTodos && <Lightning className="w-5 h-5" weight="fill" />}
            {t('inmobiliaria.reportes.generateAll')}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
              <ChartLine className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.totalReports}
              </p>
              <p className="text-xs text-muted-foreground">{t('inmobiliaria.reportes.stats.reports')}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-warning-soft flex items-center justify-center">
              <Star className="w-5 h-5 text-warning" weight="fill" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.favoritesCount}
              </p>
              <p className="text-xs text-muted-foreground">{t('inmobiliaria.reportes.stats.favorites')}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card col-span-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-success-soft flex items-center justify-center">
              <Clock className="w-5 h-5 text-success" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {stats.lastGeneratedReport}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('inmobiliaria.reportes.stats.lastGenerated')}: {stats.lastGeneratedTime}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card overflow-hidden"
      >
        {/* Header: View Toggle & Count */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <SegmentedControl<ViewMode>
            value={viewMode}
            onChange={setViewMode}
            options={[
              {
                value: 'grid',
                ariaLabel: t('inmobiliaria.reportes.viewCards'),
                label: (
                  <span className="flex items-center gap-2">
                    <SquaresFour className="w-4 h-4" />
                    {t('inmobiliaria.reportes.viewCards')}
                  </span>
                ),
              },
              {
                value: 'list',
                ariaLabel: t('inmobiliaria.reportes.viewList'),
                label: (
                  <span className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    {t('inmobiliaria.reportes.viewList')}
                  </span>
                ),
              },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            {filteredReports.length} {filteredReports.length !== 1 ? t('inmobiliaria.reportes.stats.reports').toLowerCase() : t('inmobiliaria.reportes.stats.report')}
          </p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border">
          <ReporteFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
            reportCounts={reportCounts}
            minimal
          />
        </div>

        {/* Reports Content */}
        <div className="p-4 space-y-8">
        {/* Favorites Section */}
        {favoriteReports.length > 0 && !filters.favoritesOnly && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" weight="fill" />
              <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.reportes.stats.favorites')}</h2>
              <span className="text-xs text-muted-foreground">
                ({favoriteReports.length})
              </span>
            </div>
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-3'
              )}
            >
              <AnimatePresence mode="popLayout">
                {favoriteReports.map((report) => (
                  <motion.div
                    key={report.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <ReporteCard
                      report={{ ...report, isFavorite: true }}
                      variant={viewMode === 'list' ? 'compact' : 'default'}
                      onGenerate={() => void bajarReporte(report)}
                      descargable={sePuedeBajar(report.id as ReportId)}
                      onPreview={() => handlePreviewReport(report)}
                      onDownload={() => void bajarReporte(report)}
                      onToggleFavorite={() => handleToggleFavorite(report.id)}
                      isGenerating={generatingReports.has(report.id)}
                      isLocked={!!report.premium && !hasAdvancedReports}
                      onUpgrade={() => toast.info(locale === 'es' ? 'Mejora tu plan a Pro para acceder a reportes avanzados.' : 'Upgrade to Pro plan to access advanced reports.')}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Other Reports Section */}
        {otherReports.length > 0 && (
          <div className="space-y-4">
            {favoriteReports.length > 0 && !filters.favoritesOnly && (
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-fg-subtle" />
                <h2 className="text-base font-semibold text-fg">
                  {t('inmobiliaria.reportes.otherReports')}
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({otherReports.length})
                </span>
              </div>
            )}
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-3'
              )}
            >
              <AnimatePresence mode="popLayout">
                {otherReports.map((report) => (
                  <motion.div
                    key={report.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <ReporteCard
                      report={{ ...report, isFavorite: false }}
                      variant={viewMode === 'list' ? 'compact' : 'default'}
                      onGenerate={() => void bajarReporte(report)}
                      descargable={sePuedeBajar(report.id as ReportId)}
                      onPreview={() => handlePreviewReport(report)}
                      onDownload={() => void bajarReporte(report)}
                      onToggleFavorite={() => handleToggleFavorite(report.id)}
                      isGenerating={generatingReports.has(report.id)}
                      isLocked={!!report.premium && !hasAdvancedReports}
                      onUpgrade={() => toast.info(locale === 'es' ? 'Mejora tu plan a Pro para acceder a reportes avanzados.' : 'Upgrade to Pro plan to access advanced reports.')}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <div className="flex flex-col items-center">
            <EmptyState
              icon={MagnifyingGlass}
              title={t('inmobiliaria.reportes.noReports')}
              description={t('inmobiliaria.reportes.noReportsDesc')}
            />
            {filters.search && (
              <Button
                variant="link"
                hideArrow
                onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                className="-mt-4"
              >
                {t('inmobiliaria.reportes.clearSearch')}
              </Button>
            )}
          </div>
        )}
        </div>
      </motion.div>

      {/* Report Viewer Modal */}
      <ReporteViewer
        isOpen={isViewerOpen}
        onClose={handleViewerClose}
        report={selectedReport}
        filters={filters}
        onExport={handleViewerExport}
      />
    </div>
  );
}

export default function ReportesPage() {
  return (
    <PageGuard module="reportes">
      <ReportesContent />
    </PageGuard>
  );
}
