'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  FileText,
  Clock,
  Users,
  ChartPie,
  Calendar,
  ChartBar,
  CurrencyDollar,
  FilePdf,
  FileXls,
  DownloadSimple,
  Printer,
  CalendarBlank,
  MapPin,
  ArrowUp,
  ArrowDown,
  Minus,
  Buildings,
  CurrencyCircleDollar,
  Percent,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { ReportDefinition, ReportCategory } from '@/lib/types/inmobiliaria';
import {
  getReportCategoryColor,
  getReportFormatColor,
  formatCurrency,
} from '@/lib/types/inmobiliaria';
import type { ReporteFiltersState } from './ReporteFilters';
import {
  generateComisionesAgenteReport,
  generateOcupacionReport,
  generateVencimientosReport,
  generateFlujoCajaReport,
  generateCarteraReport,
} from '@/lib/data/mock-inmobiliaria';

interface ReporteViewerProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportDefinition | null;
  filters: ReporteFiltersState;
  onExport?: (format: 'pdf' | 'excel') => void;
}

// Map icon names to Phosphor components
const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Clock,
  Users,
  ChartPie,
  Calendar,
  ChartBar,
  CurrencyDollar,
};

// Category colors for icon backgrounds
const CATEGORY_BG_COLORS: Record<ReportCategory, string> = {
  financiero: 'bg-emerald-100 dark:bg-emerald-900/30',
  operativo: 'bg-blue-100 dark:bg-blue-900/30',
  agentes: 'bg-violet-100 dark:bg-violet-900/30',
};

const CATEGORY_ICON_COLORS: Record<ReportCategory, string> = {
  financiero: 'text-emerald-600 dark:text-emerald-400',
  operativo: 'text-blue-600 dark:text-blue-400',
  agentes: 'text-violet-600 dark:text-violet-400',
};

/**
 * Format period for display
 */
function formatPeriodDisplayFn(period: { start: string; end: string }, fmtDate: (d: string) => string): string {
  return `${fmtDate(period.start)} - ${fmtDate(period.end)}`;
}

/**
 * Comisiones Agente Preview
 */
function ComisionesAgentePreview({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  const data = React.useMemo(
    () => generateComisionesAgenteReport(new Date().toISOString().slice(0, 7)),
    []
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.totalCommissions')}</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.totalCommissions)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.agentsLabel')}</p>
          <p className="text-lg font-bold text-foreground">{data.agentes.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.closings')}</p>
          <p className="text-lg font-bold text-foreground">{data.totalClosedDeals}</p>
        </div>
      </div>

      {/* Top Performers */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">{t('inmobiliaria.reporte.topAgents')}</h4>
        <div className="space-y-2">
          {data.agentes
            .sort((a, b) => b.totalCommission - a.totalCommission)
            .slice(0, 5)
            .map((agente, index) => (
              <div
                key={agente.agenteId}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      index === 0
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {agente.agenteName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agente.closedDeals} {t('inmobiliaria.reporte.closings')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(agente.totalCommission)}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    {agente.trend === 'up' && (
                      <ArrowUp className="w-3 h-3 text-emerald-500" />
                    )}
                    {agente.trend === 'down' && (
                      <ArrowDown className="w-3 h-3 text-red-500" />
                    )}
                    {agente.trend === 'stable' && (
                      <Minus className="w-3 h-3" />
                    )}
                    {t('inmobiliaria.reporte.vsPrevPeriod')}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Ocupacion Preview
 */
function OcupacionPreview({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  const data = React.useMemo(() => generateOcupacionReport(), []);

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              {t('inmobiliaria.reporte.generalOccupancy')}
            </p>
            <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
              {data.overallOccupancyRate}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.vsPrevMonth')}</p>
            <div className="flex items-center justify-end gap-1">
              {data.previousMonthOccupancyRate &&
              data.overallOccupancyRate > data.previousMonthOccupancyRate ? (
                <ArrowUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {Math.abs(
                  data.overallOccupancyRate -
                    (data.previousMonthOccupancyRate || 0)
                )}
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <Buildings className="w-5 h-5 mx-auto text-neutral-500 mb-1" />
          <p className="text-lg font-bold text-foreground">{data.totalProperties}</p>
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.totalLabel')}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {data.totalOccupied}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('inmobiliaria.reporte.rented')}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {data.totalInProcess}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">{t('inmobiliaria.reporte.inProcess')}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {data.totalAvailable}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">{t('inmobiliaria.reporte.available')}</p>
        </div>
      </div>

      {/* By Zone */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">{t('inmobiliaria.reporte.byZone')}</h4>
        <div className="space-y-2">
          {data.zones.map((zone) => (
            <div
              key={zone.zone}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {zone.zone}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  {zone.occupied}/{zone.totalProperties}
                </span>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${zone.occupancyRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground w-12 text-right">
                  {zone.occupancyRate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Vencimientos Preview
 */
function VencimientosPreview({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  const data = React.useMemo(() => generateVencimientosReport(), []);

  const bucketColors = {
    '0-30': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    '31-60': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    '61-90': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    '90+': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {data.summary.bucket0to30}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">{t('inmobiliaria.reporte.days0to30')}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {data.summary.bucket31to60}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">{t('inmobiliaria.reporte.days31to60')}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {data.summary.bucket61to90}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">{t('inmobiliaria.reporte.days61to90')}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {data.summary.bucket90plus}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('inmobiliaria.reporte.days90plus')}</p>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">
          {t('inmobiliaria.reporte.upcomingExpirations')} ({data.summary.totalVencimientos})
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.items.slice(0, 10).map((item) => (
            <div
              key={item.consignacionId}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.propertyTitle}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.tenantName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    bucketColors[item.bucket]
                  )}
                >
                  {t('inmobiliaria.reporte.nDays', { count: item.daysUntilExpiry })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Flujo de Caja Preview
 */
function FlujoCajaPreview({ t, fmtDate }: { t: (key: string, params?: Record<string, string | number>) => string; fmtDate: (d: string) => string }) {
  const data = React.useMemo(() => generateFlujoCajaReport('semester'), []);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center gap-2 mb-1">
            <CurrencyCircleDollar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{t('inmobiliaria.reporte.income')}</p>
          </div>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(data.totals.totalIngresos)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm text-indigo-600 dark:text-indigo-400">{t('inmobiliaria.reporte.commissions')}</p>
          </div>
          <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
            {formatCurrency(data.totals.totalComisiones)}
          </p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">{t('inmobiliaria.reporte.monthlyBreakdown')}</h4>
        <div className="space-y-2">
          {data.months.map((month) => (
            <div
              key={month.month}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <span className="text-sm font-medium text-foreground capitalize">
                {fmtDate(month.month + '-01')}
              </span>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.income')}</p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(month.ingresos)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.commissions')}</p>
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(month.comisiones)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Cartera Edades Preview
 */
function CarteraEdadesPreview({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  const data = React.useMemo(() => generateCarteraReport(), []);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
        <p className="text-sm font-medium text-red-100">{t('inmobiliaria.reporte.totalOverduePortfolio')}</p>
        <p className="text-2xl font-bold">{formatCurrency(data.summary.totalPending)}</p>
        <p className="text-xs text-red-200 mt-1">{t('inmobiliaria.reporte.pendingCharges', { count: data.items.length })}</p>
      </div>

      {/* Bucket Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.summary.bucket0to30)}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('inmobiliaria.reporte.days0to30')}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(data.summary.bucket31to60)}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">{t('inmobiliaria.reporte.days31to60')}</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-center">
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(data.summary.bucket61to90)}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">{t('inmobiliaria.reporte.days61to90')}</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {formatCurrency(data.summary.bucket90plus)}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">{t('inmobiliaria.reporte.days90plus')}</p>
        </div>
      </div>

      {/* Top Deudores */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">
          {t('inmobiliaria.reporte.topDebtors')} ({data.items.length})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.items
            .sort((a, b) => b.pendingAmount - a.pendingAmount)
            .slice(0, 8)
            .map((item) => (
              <div
                key={item.cobroId}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.tenantName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.propertyTitle}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(item.pendingAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('inmobiliaria.reporte.nDays', { count: item.daysLate })}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Generic Preview Placeholder
 */
function GenericPreview({ report, t }: { report: ReportDefinition; t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <div className="p-8 rounded-xl bg-muted/50 text-center">
      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
      <h4 className="text-lg font-semibold text-foreground mb-2">
        {t('inmobiliaria.reporte.previewNotAvailable')}
      </h4>
      <p className="text-sm text-muted-foreground">
        {t('inmobiliaria.reporte.generateToView', { title: report.title })}
      </p>
    </div>
  );
}

/**
 * ReporteViewer - Sheet drawer for previewing report data
 * Shows report header, applied filters, preview content, and export actions
 */
export function ReporteViewer({
  isOpen,
  onClose,
  report,
  filters,
  onExport,
}: ReporteViewerProps) {
  const { t, formatDate: fmtDate } = useTranslation();
  const [isExporting, setIsExporting] = React.useState(false);

  // Handle export
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!onExport) return;

    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onExport(format);
    setIsExporting(false);
  };

  if (!report) return null;

  const Icon = ICON_MAP[report.icon] || FileText;
  const bgColor = CATEGORY_BG_COLORS[report.category];
  const iconColor = CATEGORY_ICON_COLORS[report.category];
  const FormatIcon = report.format === 'pdf' ? FilePdf : FileXls;

  // Get preview component based on report type
  const PreviewContent = () => {
    switch (report.id) {
      case 'cartera-edades':
        return <CarteraEdadesPreview t={t} />;
      case 'comisiones-agente':
      case 'rendimiento-agentes':
        return <ComisionesAgentePreview t={t} />;
      case 'ocupacion-portafolio':
        return <OcupacionPreview t={t} />;
      case 'vencimientos':
        return <VencimientosPreview t={t} />;
      case 'flujo-caja':
        return <FlujoCajaPreview t={t} fmtDate={fmtDate} />;
      default:
        return <GenericPreview report={report} t={t} />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-gradient-to-b from-background via-background to-background/95 backdrop-blur-sm z-10">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-lg hover:bg-muted transition-colors group"
            aria-label={t('inmobiliaria.reporte.close')}
          >
            <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                bgColor
              )}
            >
              <Icon className={cn('w-6 h-6', iconColor)} weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-foreground">
                {report.title}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {report.description}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                    getReportCategoryColor(report.category)
                  )}
                >
                  {report.category}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                    getReportFormatColor(report.format)
                  )}
                >
                  <FormatIcon className="w-3 h-3" />
                  {report.format.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Filters Applied */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30"
        >
          <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
            {t('inmobiliaria.reporte.appliedFilters')}
          </h4>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-background border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
              <CalendarBlank className="w-4 h-4 text-indigo-500 dark:text-indigo-400" weight="duotone" />
              <span className="text-sm font-medium text-foreground">
                {formatPeriodDisplayFn(filters.period, fmtDate)}
              </span>
            </div>
            {filters.zone && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-background border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                <MapPin className="w-4 h-4 text-indigo-500 dark:text-indigo-400" weight="duotone" />
                <span className="text-sm font-medium text-foreground">{filters.zone}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Preview Content */}
        <div className="p-6 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('inmobiliaria.reporte.previewLabel')}
          </h4>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <PreviewContent />
          </motion.div>
        </div>

        {/* Actions Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="sticky bottom-0 p-6 border-t border-border bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-sm"
        >
          <div className="flex gap-3">
            {/* Export Primary - Always indigo */}
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              onClick={() => handleExport(report.format)}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <span className="animate-pulse">{t('inmobiliaria.reporte.exporting')}</span>
                </>
              ) : (
                <>
                  <DownloadSimple className="w-4 h-4 mr-2" />
                  {t('inmobiliaria.reporte.downloadFormat', { format: report.format.toUpperCase() })}
                </>
              )}
            </Button>

            {/* Print for PDF */}
            {report.format === 'pdf' && (
              <Button
                variant="outline"
                className="px-4 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </Button>
            )}
          </div>

          {/* Scheduled Export - Future Feature */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            {t('inmobiliaria.reporte.scheduledExport')}
          </p>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}

export default ReporteViewer;
