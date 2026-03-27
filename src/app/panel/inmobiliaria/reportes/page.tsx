'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import type { ReportDefinition, ReportId, ReportCategory } from '@/lib/types/inmobiliaria';
import { REPORT_DEFINITIONS } from '@/lib/constants/inmobiliaria-data';
import {
  useCarteraReport,
  useOcupacionReport,
  useComisionesReport,
  useVencimientosReport,
  useFlujoCajaReport,
  reportesApi,
} from '@/lib/hooks/useInmobiliaria';
import {
  ReporteCard,
  ReporteFilters,
  ReporteViewer,
  type ReporteFiltersState,
} from '@/components/inmobiliaria';
import {
  exportCarteraEdades,
  exportComisionesAgente,
  exportVencimientos,
  exportFlujoCaja,
  exportOcupacion,
} from '@/lib/utils/generate-report-excel';
import { useAgencyPlan } from '@/lib/hooks/useAgencyPlan';
import { FeatureGate } from '@/components/inmobiliaria/UpgradePrompt';
import { OccupancyReport } from '@/components/inmobiliaria/reports/OccupancyReport';
import { CollectionsReport } from '@/components/inmobiliaria/reports/CollectionsReport';
import { AgentPerformanceReport } from '@/components/inmobiliaria/reports/AgentPerformanceReport';
import { ExecutiveSummary } from '@/components/inmobiliaria/reports/ExecutiveSummary';
import { ReportPDFExport } from '@/components/inmobiliaria/reports/ReportPDFExport';
import {
  mockOccupancyData,
  mockCollectionsData,
  mockAgentPerformanceData,
  mockExecutiveData,
} from '@/lib/data/mock-reports';
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
export default function ReportesPage() {
  const { t, locale } = useI18n();
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

  // Handle generate report
  const handleGenerateReport = useCallback(async (report: ReportDefinition) => {
    setGeneratingReports((prev) => new Set([...prev, report.id]));

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update last generated timestamp
    const now = new Date().toISOString();
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id ? { ...r, lastGenerated: now } : r
      )
    );

    setGeneratingReports((prev) => {
      const next = new Set(prev);
      next.delete(report.id);
      return next;
    });

    toast.success(t('inmobiliaria.reportes.toasts.reportGenerated'), {
      description: t('inmobiliaria.reportes.toasts.reportUpdated', { title: report.title }),
    });
  }, [t]);

  // Handle preview report
  const handlePreviewReport = useCallback((report: ReportDefinition) => {
    setSelectedReport(report);
    setIsViewerOpen(true);
  }, []);

  // Handle export report
  const handleExportReport = useCallback(
    async (report: ReportDefinition, format: 'pdf' | 'excel') => {
      try {
        if (format === 'excel') {
          // Generate and export based on report type
          switch (report.id) {
            case 'cartera-edades': {
              if (!carteraReport.report) {
                toast.error(t('inmobiliaria.reportes.toasts.dataNotLoaded'));
                return;
              }
              exportCarteraEdades(carteraReport.report);
              break;
            }
            case 'comisiones-agente':
            case 'rendimiento-agentes': {
              if (!comisionesReport.report) {
                toast.error(t('inmobiliaria.reportes.toasts.dataNotLoaded'));
                return;
              }
              exportComisionesAgente(comisionesReport.report);
              break;
            }
            case 'vencimientos': {
              if (!vencimientosReport.report) {
                toast.error(t('inmobiliaria.reportes.toasts.dataNotLoaded'));
                return;
              }
              exportVencimientos(vencimientosReport.report);
              break;
            }
            case 'flujo-caja': {
              if (!flujoCajaReport.report) {
                toast.error(t('inmobiliaria.reportes.toasts.dataNotLoaded'));
                return;
              }
              exportFlujoCaja(flujoCajaReport.report);
              break;
            }
            case 'ocupacion-portafolio': {
              if (!ocupacionReport.report) {
                toast.error(t('inmobiliaria.reportes.toasts.dataNotLoaded'));
                return;
              }
              exportOcupacion(ocupacionReport.report);
              break;
            }
            default:
              toast.error(t('inmobiliaria.reportes.toasts.exportNotAvailable'), {
                description: t('inmobiliaria.reportes.toasts.excelNotSupported'),
              });
              return;
          }
        } else {
          // PDF export - only extractos for now
          if (report.id === 'extractos-propietarios') {
            toast.info(t('inmobiliaria.reportes.toasts.selectOwner'), {
              description: t('inmobiliaria.reportes.toasts.goToDispersions'),
            });
            return;
          }

          // For other reports, show coming soon
          toast.info(t('inmobiliaria.reportes.toasts.pdfInDevelopment'), {
            description: t('inmobiliaria.reportes.toasts.useExcel'),
          });
          return;
        }

        toast.success(t('inmobiliaria.reportes.toasts.fileDownloaded'), {
          description: t('inmobiliaria.reportes.toasts.exportedSuccessfully', { title: report.title }),
        });
      } catch (error) {
        toast.error(t('inmobiliaria.reportes.toasts.exportError'), {
          description: t('inmobiliaria.reportes.toasts.tryAgainLater'),
        });
      }
    },
    [t, carteraReport.report, comisionesReport.report, vencimientosReport.report, flujoCajaReport.report, ocupacionReport.report]
  );

  // Handle viewer export
  const handleViewerExport = useCallback(
    (format: 'pdf' | 'excel') => {
      if (selectedReport) {
        handleExportReport(selectedReport, format);
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

  // Handle generate all
  const handleGenerateAll = useCallback(async () => {
    const pendingReports = filteredReports.filter(
      (r) => !generatingReports.has(r.id)
    );

    if (pendingReports.length === 0) return;

    toast.loading(t('inmobiliaria.reportes.toasts.generatingReports', { count: pendingReports.length }), {
      id: 'generate-all',
    });

    setGeneratingReports(new Set(pendingReports.map((r) => r.id)));

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const now = new Date().toISOString();
    setReports((prev) =>
      prev.map((r) =>
        pendingReports.find((p) => p.id === r.id)
          ? { ...r, lastGenerated: now }
          : r
      )
    );

    setGeneratingReports(new Set());

    toast.success(t('inmobiliaria.reportes.toasts.reportsGenerated'), {
      id: 'generate-all',
      description: t('inmobiliaria.reportes.toasts.reportsUpdated', { count: pendingReports.length }),
    });
  }, [filteredReports, generatingReports, t]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <ChartLine className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            {t('inmobiliaria.reportes.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('inmobiliaria.reportes.subtitle')}
          </p>
        </div>
        {/* TODO Backend: Los reportes deben actualizarse en tiempo real via subscriptions/websockets */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAll}
            disabled={generatingReports.size > 0}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg',
              generatingReports.size > 0
                ? 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
                : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20'
            )}
          >
            <Lightning className="w-5 h-5" weight="fill" />
            {t('inmobiliaria.reportes.generateAll')}
          </button>
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
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <ChartLine className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" weight="fill" />
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
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <SquaresFour className="w-4 h-4" />
              {t('inmobiliaria.reportes.viewCards')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Table className="w-4 h-4" />
              {t('inmobiliaria.reportes.viewList')}
            </button>
          </div>
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
              <Star className="w-5 h-5 text-amber-500" weight="fill" />
              <h2 className="font-semibold text-foreground">{t('inmobiliaria.reportes.stats.favorites')}</h2>
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
                      onGenerate={() => handleGenerateReport(report)}
                      onPreview={() => handlePreviewReport(report)}
                      onDownload={() =>
                        handleExportReport(report, report.format)
                      }
                      onToggleFavorite={() => handleToggleFavorite(report.id)}
                      isGenerating={generatingReports.has(report.id)}
                      isLocked={!!report.premium && !hasAdvancedReports}
                      onUpgrade={() => toast.info(locale === 'es' ? 'Mejora tu plan a Growth para acceder a reportes avanzados.' : 'Upgrade to Growth plan to access advanced reports.')}
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
                <FileText className="w-5 h-5 text-neutral-400" />
                <h2 className="font-semibold text-foreground">
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
                      onGenerate={() => handleGenerateReport(report)}
                      onPreview={() => handlePreviewReport(report)}
                      onDownload={() =>
                        handleExportReport(report, report.format)
                      }
                      onToggleFavorite={() => handleToggleFavorite(report.id)}
                      isGenerating={generatingReports.has(report.id)}
                      isLocked={!!report.premium && !hasAdvancedReports}
                      onUpgrade={() => toast.info(locale === 'es' ? 'Mejora tu plan a Growth para acceder a reportes avanzados.' : 'Upgrade to Growth plan to access advanced reports.')}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <div className="rounded-2xl bg-neutral-50/80 dark:bg-white/[0.03] py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-5 shadow-sm dark:shadow-none">
              <MagnifyingGlass className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1.5">
              {t('inmobiliaria.reportes.noReports')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {t('inmobiliaria.reportes.noReportsDesc')}
            </p>
            {filters.search && (
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, search: '' }))
                }
                className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('inmobiliaria.reportes.clearSearch')}
              </button>
            )}
          </div>
        )}
        </div>
      </motion.div>

      {/* Advanced Reports Section — gated to Growth+ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card overflow-hidden print:border-none print:shadow-none"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border bg-muted/30 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <ChartLine className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
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
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
            {advancedTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveAdvancedTab(tab.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                    activeAdvancedTab === tab.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content — Gated */}
        <div className="p-4">
          {activeAdvancedTab === 'ejecutivo' ? (
            <FeatureGate feature="executive-reports">
              <ExecutiveSummary data={mockExecutiveData} />
            </FeatureGate>
          ) : (
            <FeatureGate feature="advanced-reports">
              {activeAdvancedTab === 'ocupacion' && (
                <OccupancyReport data={mockOccupancyData} />
              )}
              {activeAdvancedTab === 'cobros' && (
                <CollectionsReport data={mockCollectionsData} />
              )}
              {activeAdvancedTab === 'agentes' && (
                <AgentPerformanceReport data={mockAgentPerformanceData} />
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
