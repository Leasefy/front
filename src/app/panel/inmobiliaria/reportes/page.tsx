'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChartLine,
  ChartLineUp,
  Lightning,
  Star,
  Clock,
  CaretRight,
  MagnifyingGlass,
  SquaresFour,
  Table,
  FileText,
  Buildings,
  CurrencyDollar,
  Users,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui';
import { SegmentedControl } from '@leasefy/cadence';
import type { ReportDefinition, ReportId, ReportCategory } from '@/lib/types/inmobiliaria';
import { REPORT_DEFINITIONS } from '@/lib/constants/inmobiliaria-data';
import { comoSeBaja, sePuedeBajar, nombreDelArchivo, rutaDeExport, descargarBlob } from '@/lib/reportes/exportables';
import {
  useCarteraReport,
  useOcupacionReport,
  useComisionesReport,
  useVencimientosReport,
  useFlujoCajaReport,
  useRendimientoAgentesReport,
  reportesApi,
} from '@/lib/hooks/useInmobiliaria';
import {
  ReporteCard,
  ReporteFilters,
  ReporteViewer,
  type ReporteFiltersState,
} from '@/components/inmobiliaria';
import { apiClient, ApiError } from '@/lib/api/client';
import { useAgencyPlan } from '@/lib/hooks/useAgencyPlan';
import { FeatureGate } from '@/components/inmobiliaria/UpgradePrompt';
import { OccupancyReport } from '@/components/inmobiliaria/reports/OccupancyReport';
import { CollectionsReport } from '@/components/inmobiliaria/reports/CollectionsReport';
import { AgentPerformanceReport } from '@/components/inmobiliaria/reports/AgentPerformanceReport';
import { ExecutiveSummary } from '@/components/inmobiliaria/reports/ExecutiveSummary';
import { ReportPDFExport } from '@/components/inmobiliaria/reports/ReportPDFExport';
import {
  adaptOccupancy,
  adaptCollections,
  adaptAgentPerformance,
  adaptExecutive,
} from '@/lib/utils/report-adapters';
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
 * Save favorites to localStorage
 */
function saveFavorites(favorites: Set<ReportId>): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {
    // Ignore errors
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

  // Advanced report tabs
  type AdvancedTab = 'ocupacion' | 'cobros' | 'agentes' | 'ejecutivo';
  const [activeAdvancedTab, setActiveAdvancedTab] = useState<AdvancedTab>('ocupacion');

  const advancedTabs: { key: AdvancedTab; label: string; icon: typeof Buildings }[] = [
    { key: 'ocupacion', label: locale === 'es' ? 'Ocupacion' : 'Occupancy', icon: Buildings },
    { key: 'cobros', label: locale === 'es' ? 'Cobros' : 'Collections', icon: CurrencyDollar },
    { key: 'agentes', label: locale === 'es' ? 'Agentes' : 'Agents', icon: Users },
    { key: 'ejecutivo', label: locale === 'es' ? 'Ejecutivo' : 'Executive', icon: ChartLineUp },
  ];

  // API Hooks for report data
  const carteraReport = useCarteraReport();
  const ocupacionReport = useOcupacionReport();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const comisionesReport = useComisionesReport(currentMonth);
  const vencimientosReport = useVencimientosReport();
  const flujoCajaReport = useFlujoCajaReport('semester');
  const rendimientoReport = useRendimientoAgentesReport(currentMonth);

  const occupancyData = useMemo(() => adaptOccupancy(ocupacionReport.report), [ocupacionReport.report]);
  const collectionsData = useMemo(() => adaptCollections(carteraReport.report), [carteraReport.report]);
  const agentPerformanceData = useMemo(
    () => adaptAgentPerformance(rendimientoReport.report, comisionesReport.report),
    [rendimientoReport.report, comisionesReport.report],
  );
  const executiveData = useMemo(
    () => adaptExecutive(flujoCajaReport.report, ocupacionReport.report),
    [flujoCajaReport.report, ocupacionReport.report],
  );

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

  // Get available zones (from mock data)
  const zones = useMemo(() => {
    return ['Zona Norte', 'Chapinero', 'Usaquen', 'El Poblado', 'Zona Centro', 'Suba'];
  }, []);

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
        ? new Date(lastGenerated.lastGenerated).toLocaleString(locale === 'es' ? 'es-CL' : 'en-US', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })
        : t('inmobiliaria.reportes.stats.never'),
      lastGeneratedReport: lastGenerated?.title || 'N/A',
    };
  }, [reports, favorites]);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback((reportId: ReportId) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }

      saveFavorites(next);
      return next;
    });

    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, isFavorite: !r.isFavorite } : r
      )
    );

    const report = reports.find((r) => r.id === reportId);
    const wasFavorite = favorites.has(reportId);

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
      const blob = await apiClient.getBlob(rutaDeExport(como.tipo));
      descargarBlob(blob, nombreDelArchivo(como.tipo, new Date().toISOString().slice(0, 10)));

      const now = new Date().toISOString();
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, lastGenerated: now } : r)),
      );
      toast.success('Descargado', { description: `${report.title} · CSV` });
      return true;
    } catch (error) {
      toast.error('No pudimos generar el reporte', {
        description:
          error instanceof ApiError && error.status === 403
            ? 'Tu rol no incluye descargar reportes.'
            : 'Probá de nuevo en un momento.',
      });
      return false;
    } finally {
      setGeneratingReports((prev) => {
        const next = new Set(prev);
        next.delete(report.id);
        return next;
      });
    }
  }, [router]);

  // Handle preview report
  const handlePreviewReport = useCallback((report: ReportDefinition) => {
    // La rentabilidad tiene pantalla propia, con periodo, gráfico y tabla
    // ordenable: «ver» es ir allá, no abrir el cajón de vista previa.
    if (report.id === 'rentabilidad-inmueble') {
      router.push('/panel/inmobiliaria/reportes/rentabilidad');
      return;
    }
    setSelectedReport(report);
    setIsViewerOpen(true);
  }, [router]);

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
  const handleViewerExport = useCallback(
    () => {
      if (selectedReport) {
        void handleExportReport(selectedReport);
      }
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
   * Bajar todos los que se pueden bajar.
   *
   * También era una simulación: 2 s de espera, `lastGenerated` a TODOS los
   * filtrados —incluidos los que ni siquiera tienen export— y «N reportes
   * generados». Ahora se bajan de a uno y el cartel del final dice cuántos
   * salieron y cuántos no, con nombre y apellido.
   */
  const handleGenerateAll = useCallback(async () => {
    const bajables = filteredReports.filter(
      (r) => !generatingReports.has(r.id) && sePuedeBajar(r.id as ReportId),
    );
    const noBajables = filteredReports.filter((r) => !sePuedeBajar(r.id as ReportId));

    if (bajables.length === 0) {
      toast.info('No hay reportes para descargar', {
        description:
          noBajables.length > 0
            ? `${noBajables.length} de los que ves todavía no se generan.`
            : 'Ajustá los filtros para ver otros reportes.',
      });
      return;
    }

    toast.loading(`Descargando ${bajables.length} reportes…`, { id: 'generate-all' });

    // Secuencial a propósito: cada descarga dispara un click en un <a>, y el
    // navegador bloquea la ráfaga si salen todas juntas.
    let listos = 0;
    for (const report of bajables) {
      // eslint-disable-next-line no-await-in-loop
      if (await bajarReporte(report)) listos += 1;
    }

    const fallaron = bajables.length - listos;
    if (listos === 0) {
      toast.error('No pudimos descargar ninguno', { id: 'generate-all' });
    } else {
      toast.success(`${listos} ${listos === 1 ? 'reporte descargado' : 'reportes descargados'}`, {
        id: 'generate-all',
        description: [
          fallaron > 0 ? `${fallaron} falló${fallaron === 1 ? '' : 'ron'}` : null,
          noBajables.length > 0 ? `${noBajables.length} todavía no se generan` : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
      });
    }
  }, [filteredReports, generatingReports, bajarReporte]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.reportes.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.reportes.subtitle')}
          </p>
        </div>
        {/* TODO Backend: Los reportes deben actualizarse en tiempo real via subscriptions/websockets */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            hideArrow
            onClick={handleGenerateAll}
            disabled={generatingReports.size > 0}
            className="gap-2"
          >
            <Lightning className="w-5 h-5" weight="fill" />
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
        <div className="p-4 rounded-xl border border-border bg-card">
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

        <div className="p-4 rounded-xl border border-border bg-card">
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

        <div className="p-4 rounded-xl border border-border bg-card col-span-2">
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
        className="rounded-xl border border-border bg-card overflow-hidden"
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
            zones={zones}
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

      {/* Advanced Reports Section — gated to Pro+ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card overflow-hidden print:border-none print:shadow-none"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border bg-muted/30 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
              <ChartLine className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">
                {locale === 'es' ? 'Reportes Avanzados' : 'Advanced Reports'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === 'es'
                  ? 'Analisis detallado de ocupacion, cobros y rendimiento'
                  : 'Detailed occupancy, collections and performance analysis'}
              </p>
            </div>
          </div>
          <ReportPDFExport
            title={
              activeAdvancedTab === 'ocupacion'
                ? (locale === 'es' ? 'Reporte de Ocupacion' : 'Occupancy Report')
                : activeAdvancedTab === 'cobros'
                ? (locale === 'es' ? 'Reporte de Cobros' : 'Collections Report')
                : activeAdvancedTab === 'ejecutivo'
                ? (locale === 'es' ? 'Resumen Ejecutivo' : 'Executive Summary')
                : (locale === 'es' ? 'Rendimiento de Agentes' : 'Agent Performance')
            }
          />
        </div>

        {/* Tab Bar */}
        <div className="p-4 border-b border-border print:hidden">
          <SegmentedControl<AdvancedTab>
            value={activeAdvancedTab}
            onChange={setActiveAdvancedTab}
            options={advancedTabs.map((tab) => {
              const Icon = tab.icon;
              return {
                value: tab.key,
                ariaLabel: tab.label,
                label: (
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </span>
                ),
              };
            })}
          />
        </div>

        {/* Tab Content — Gated */}
        <div className="p-4">
          {activeAdvancedTab === 'ejecutivo' ? (
            <FeatureGate feature="executive-reports">
              {executiveData && <ExecutiveSummary data={executiveData} />}
            </FeatureGate>
          ) : (
            <FeatureGate feature="advanced-reports">
              {activeAdvancedTab === 'ocupacion' && occupancyData && (
                <OccupancyReport data={occupancyData} />
              )}
              {activeAdvancedTab === 'cobros' && collectionsData && (
                <CollectionsReport data={collectionsData} />
              )}
              {activeAdvancedTab === 'agentes' && agentPerformanceData && (
                <AgentPerformanceReport data={agentPerformanceData} />
              )}
            </FeatureGate>
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
