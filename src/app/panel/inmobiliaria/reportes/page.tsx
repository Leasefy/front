'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChartLine,
  ArrowsClockwise,
  Lightning,
  Star,
  Clock,
  CaretRight,
  MagnifyingGlass,
  SquaresFour,
  Table,
  FileText,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  MOCK_REPORTS,
  generateComisionesAgenteReport,
  generateOcupacionReport,
  generateVencimientosReport,
  generateFlujoCajaReport,
  generateCarteraReport,
} from '@/lib/data/mock-inmobiliaria';
import type { ReportDefinition, ReportId, ReportCategory } from '@/lib/types/inmobiliaria';
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
import { downloadExtractoPDF } from '@/lib/utils/generate-extracto-pdf';

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

  // Default favorites from mock data
  return new Set(
    MOCK_REPORTS.filter((r) => r.isFavorite).map((r) => r.id)
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
  // State for reports (local copy with last generated timestamps)
  const [reports, setReports] = useState<ReportDefinition[]>(() => {
    return MOCK_REPORTS.map((r) => ({ ...r }));
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
        ? new Date(lastGenerated.lastGenerated).toLocaleString('es-CO', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })
        : 'Nunca',
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

    toast.success(wasFavorite ? 'Removido de favoritos' : 'Agregado a favoritos', {
      description: report?.title,
    });
  }, [reports, favorites]);

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

    toast.success('Reporte generado', {
      description: `${report.title} actualizado`,
    });
  }, []);

  // Handle preview report
  const handlePreviewReport = useCallback((report: ReportDefinition) => {
    setSelectedReport(report);
    setIsViewerOpen(true);
  }, []);

  // Handle export report
  const handleExportReport = useCallback(
    async (report: ReportDefinition, format: 'pdf' | 'excel') => {
      try {
        // Get current month for data generation
        const currentMonth = new Date().toISOString().slice(0, 7);

        if (format === 'excel') {
          // Generate and export based on report type
          switch (report.id) {
            case 'cartera-edades': {
              const data = generateCarteraReport();
              exportCarteraEdades(data);
              break;
            }
            case 'comisiones-agente':
            case 'rendimiento-agentes': {
              const data = generateComisionesAgenteReport(currentMonth);
              exportComisionesAgente(data);
              break;
            }
            case 'vencimientos': {
              const data = generateVencimientosReport();
              exportVencimientos(data);
              break;
            }
            case 'flujo-caja': {
              const data = generateFlujoCajaReport('semester');
              exportFlujoCaja(data);
              break;
            }
            case 'ocupacion-portafolio': {
              const data = generateOcupacionReport();
              exportOcupacion(data);
              break;
            }
            default:
              toast.error('Exportacion no disponible', {
                description: 'Este reporte no soporta formato Excel',
              });
              return;
          }
        } else {
          // PDF export - only extractos for now
          if (report.id === 'extractos-propietarios') {
            toast.info('Selecciona un propietario', {
              description: 'Ve a Dispersiones para generar extractos PDF',
            });
            return;
          }

          // For other reports, show coming soon
          toast.info('PDF en desarrollo', {
            description: 'Usa Excel por ahora para exportar',
          });
          return;
        }

        toast.success('Archivo descargado', {
          description: `${report.title} exportado correctamente`,
        });
      } catch (error) {
        toast.error('Error al exportar', {
          description: 'Intenta de nuevo mas tarde',
        });
      }
    },
    []
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

  // Handle refresh all
  const handleRefreshAll = useCallback(async () => {
    toast.loading('Actualizando reportes...', { id: 'refresh-all' });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const now = new Date().toISOString();
    setReports((prev) =>
      prev.map((r) => ({ ...r, lastGenerated: now }))
    );

    toast.success('Reportes actualizados', { id: 'refresh-all' });
  }, []);

  // Handle generate all
  const handleGenerateAll = useCallback(async () => {
    const pendingReports = filteredReports.filter(
      (r) => !generatingReports.has(r.id)
    );

    if (pendingReports.length === 0) return;

    toast.loading(`Generando ${pendingReports.length} reportes...`, {
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

    toast.success('Reportes generados', {
      id: 'generate-all',
      description: `${pendingReports.length} reportes actualizados`,
    });
  }, [filteredReports, generatingReports]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Centro de Reportes
          </h1>
          <p className="text-muted-foreground mt-1">
            Genera, visualiza y exporta reportes del portafolio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
          >
            <ArrowsClockwise className="w-5 h-5" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button
            onClick={handleGenerateAll}
            disabled={generatingReports.size > 0}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg',
              generatingReports.size > 0
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/25'
            )}
          >
            <Lightning className="w-5 h-5" weight="fill" />
            Generar Todos
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
              <p className="text-xs text-muted-foreground">Reportes</p>
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
              <p className="text-xs text-muted-foreground">Favoritos</p>
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
                Ultimo: {stats.lastGeneratedTime}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ReporteFilters
          filters={filters}
          onFiltersChange={handleFilterChange}
          reportCounts={reportCounts}
          zones={zones}
        />
      </motion.div>

      {/* View Toggle & Count */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between"
      >
        <p className="text-sm text-muted-foreground">
          {filteredReports.length} reporte
          {filteredReports.length !== 1 ? 's' : ''}
          {filters.favoritesOnly && ' favoritos'}
          {filters.category !== 'all' && ` de ${filters.category}`}
        </p>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Vista de cuadricula"
          >
            <SquaresFour className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Vista de lista"
          >
            <Table className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Reports Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-8"
      >
        {/* Favorites Section */}
        {favoriteReports.length > 0 && !filters.favoritesOnly && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" weight="fill" />
              <h2 className="font-semibold text-foreground">Favoritos</h2>
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
                  Otros Reportes
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
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border">
            <MagnifyingGlass className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Sin reportes
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              No hay reportes que coincidan con los filtros seleccionados.
            </p>
            {filters.search && (
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, search: '' }))
                }
                className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Limpiar busqueda
              </button>
            )}
          </div>
        )}
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
