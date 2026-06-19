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
import { useI18n } from '@/lib/i18n';
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
  useComisionesReport,
  useOcupacionReport,
  useVencimientosReport,
  useFlujoCajaReport,
  useCarteraReport,
} from '@/lib/hooks/useInmobiliaria';

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
  financiero: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
  operativo: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
  agentes: 'bg-neutral-100 dark:bg-neutral-800',
};

const CATEGORY_ICON_COLORS: Record<ReportCategory, string> = {
  financiero: 'text-[#2C7A53] dark:text-[#3EAE70]',
  operativo: 'text-[#1A40FF] dark:text-[#5570FF]',
  agentes: 'text-neutral-600 dark:text-neutral-300',
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
  const { report: data } = useComisionesReport(new Date().toISOString().slice(0, 7));
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-md bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.totalCommissions')}</p>
          <p className="text-lg font-bold text-[#2C7A53] dark:text-[#3EAE70]">
            {formatCurrency(data.totalCommissions)}
          </p>
        </div>
        <div className="p-3 rounded-md bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.agentsLabel')}</p>
          <p className="text-lg font-bold text-foreground">{data.agentes.length}</p>
        </div>
        <div className="p-3 rounded-md bg-muted/50 text-center">
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
                className="flex items-center justify-between p-3 rounded-md border border-border bg-card"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      index === 0
                        ? 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]'
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
                  <p className="text-sm font-bold text-[#2C7A53] dark:text-[#3EAE70]">
                    {formatCurrency(agente.totalCommission)}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    {agente.trend === 'up' && (
                      <ArrowUp className="w-3 h-3 text-[#2C7A53]" />
                    )}
                    {agente.trend === 'down' && (
                      <ArrowDown className="w-3 h-3 text-[#C4503B]" />
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
  const { report: data } = useOcupacionReport();
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <div className="p-4 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#1A40FF] dark:text-[#5570FF] font-medium">
              {t('inmobiliaria.reporte.generalOccupancy')}
            </p>
            <p className="text-3xl font-bold text-[#1A40FF] dark:text-[#5570FF]">
              {data.overallOccupancyRate}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.vsPrevMonth')}</p>
            <div className="flex items-center justify-end gap-1">
              {data.previousMonthOccupancyRate &&
              data.overallOccupancyRate > data.previousMonthOccupancyRate ? (
                <ArrowUp className="w-4 h-4 text-[#2C7A53]" />
              ) : (
                <ArrowDown className="w-4 h-4 text-[#C4503B]" />
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
        <div className="p-3 rounded-md bg-muted/50 text-center">
          <Buildings className="w-5 h-5 mx-auto text-neutral-500 mb-1" />
          <p className="text-lg font-bold text-foreground">{data.totalProperties}</p>
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.totalLabel')}</p>
        </div>
        <div className="p-3 rounded-md bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-center">
          <p className="text-lg font-bold text-[#2C7A53] dark:text-[#3EAE70]">
            {data.totalOccupied}
          </p>
          <p className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">{t('inmobiliaria.reporte.rented')}</p>
        </div>
        <div className="p-3 rounded-md bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-center">
          <p className="text-lg font-bold text-[#1A40FF] dark:text-[#5570FF]">
            {data.totalInProcess}
          </p>
          <p className="text-xs text-[#1A40FF] dark:text-[#5570FF]">{t('inmobiliaria.reporte.inProcess')}</p>
        </div>
        <div className="p-3 rounded-md bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-center">
          <p className="text-lg font-bold text-[#B7791F] dark:text-[#D2992F]">
            {data.totalAvailable}
          </p>
          <p className="text-xs text-[#B7791F] dark:text-[#D2992F]">{t('inmobiliaria.reporte.available')}</p>
        </div>
      </div>

      {/* By Zone */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">{t('inmobiliaria.reporte.byZone')}</h4>
        <div className="space-y-2">
          {data.zones.map((zone) => (
            <div
              key={zone.zone}
              className="flex items-center justify-between p-3 rounded-md border border-border"
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
                    className="h-full bg-[#2C7A53] rounded-full"
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
  const { report: data } = useVencimientosReport();
  if (!data) return null;

  const bucketColors = {
    '0-30': 'bg-[#F8EAE7] text-[#C4503B] dark:bg-[#C4503B]/15 dark:text-[#E0664D]',
    '31-60': 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]',
    '61-90': 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF]',
    '90+': 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]',
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-md bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-center">
          <p className="text-lg font-bold text-[#C4503B] dark:text-[#E0664D]">
            {data.summary.bucket0to30}
          </p>
          <p className="text-xs text-[#C4503B] dark:text-[#E0664D]">{t('inmobiliaria.reporte.days0to30')}</p>
        </div>
        <div className="p-3 rounded-md bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-center">
          <p className="text-lg font-bold text-[#B7791F] dark:text-[#D2992F]">
            {data.summary.bucket31to60}
          </p>
          <p className="text-xs text-[#B7791F] dark:text-[#D2992F]">{t('inmobiliaria.reporte.days31to60')}</p>
        </div>
        <div className="p-3 rounded-md bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-center">
          <p className="text-lg font-bold text-[#1A40FF] dark:text-[#5570FF]">
            {data.summary.bucket61to90}
          </p>
          <p className="text-xs text-[#1A40FF] dark:text-[#5570FF]">{t('inmobiliaria.reporte.days61to90')}</p>
        </div>
        <div className="p-3 rounded-md bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-center">
          <p className="text-lg font-bold text-[#2C7A53] dark:text-[#3EAE70]">
            {data.summary.bucket90plus}
          </p>
          <p className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">{t('inmobiliaria.reporte.days90plus')}</p>
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
              className="flex items-center justify-between p-3 rounded-md border border-border"
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
  const { report: data } = useFlujoCajaReport('semester');
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-md bg-[#E8F3EC] dark:bg-[#2C7A53]/15">
          <div className="flex items-center gap-2 mb-1">
            <CurrencyCircleDollar className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
            <p className="text-sm text-[#2C7A53] dark:text-[#3EAE70]">{t('inmobiliaria.reporte.income')}</p>
          </div>
          <p className="text-xl font-bold text-[#2C7A53] dark:text-[#3EAE70]">
            {formatCurrency(data.totals.totalIngresos)}
          </p>
        </div>
        <div className="p-4 rounded-md bg-[#EEF1FF] dark:bg-[#1A40FF]/15">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
            <p className="text-sm text-[#1A40FF] dark:text-[#5570FF]">{t('inmobiliaria.reporte.commissions')}</p>
          </div>
          <p className="text-xl font-bold text-[#1A40FF] dark:text-[#5570FF]">
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
              className="flex items-center justify-between p-3 rounded-md border border-border"
            >
              <span className="text-sm font-medium text-foreground capitalize">
                {fmtDate(month.month + '-01')}
              </span>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.income')}</p>
                  <p className="text-sm font-medium text-[#2C7A53] dark:text-[#3EAE70]">
                    {formatCurrency(month.ingresos)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.commissions')}</p>
                  <p className="text-sm font-medium text-[#1A40FF] dark:text-[#5570FF]">
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
  const { report: data } = useCarteraReport();
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="p-4 rounded-xl bg-[#F8EAE7] dark:bg-[#C4503B]/12 text-white">
        <p className="text-sm font-medium text-[#C4503B]">{t('inmobiliaria.reporte.totalOverduePortfolio')}</p>
        <p className="text-2xl font-bold">{formatCurrency(data.summary.totalPending)}</p>
        <p className="text-xs text-[#C4503B] mt-1">{t('inmobiliaria.reporte.pendingCharges', { count: data.items.length })}</p>
      </div>

      {/* Bucket Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-md bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-center">
          <p className="text-lg font-bold text-[#2C7A53] dark:text-[#3EAE70]">
            {formatCurrency(data.summary.bucket0to30)}
          </p>
          <p className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">{t('inmobiliaria.reporte.days0to30')}</p>
        </div>
        <div className="p-3 rounded-md bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-center">
          <p className="text-lg font-bold text-[#B7791F] dark:text-[#D2992F]">
            {formatCurrency(data.summary.bucket31to60)}
          </p>
          <p className="text-xs text-[#B7791F] dark:text-[#D2992F]">{t('inmobiliaria.reporte.days31to60')}</p>
        </div>
        <div className="p-3 rounded-md bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-center">
          <p className="text-lg font-bold text-[#B7791F] dark:text-[#D2992F]">
            {formatCurrency(data.summary.bucket61to90)}
          </p>
          <p className="text-xs text-[#B7791F] dark:text-[#D2992F]">{t('inmobiliaria.reporte.days61to90')}</p>
        </div>
        <div className="p-3 rounded-md bg-[#F8EAE7] dark:bg-[#C4503B]/15 text-center">
          <p className="text-lg font-bold text-[#C4503B] dark:text-[#E0664D]">
            {formatCurrency(data.summary.bucket90plus)}
          </p>
          <p className="text-xs text-[#C4503B] dark:text-[#E0664D]">{t('inmobiliaria.reporte.days90plus')}</p>
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
                className="flex items-center justify-between p-3 rounded-md border border-border"
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
                  <p className="text-sm font-bold text-[#C4503B] dark:text-[#E0664D]">
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
  const { t, formatDate: fmtDate } = useI18n();
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
            className="absolute right-4 top-4 p-2 rounded-md hover:bg-muted transition-colors group"
            aria-label={t('inmobiliaria.reporte.close')}
          >
            <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
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
          className="px-6 py-4 bg-[#EEF1FF]/50 dark:bg-[#1A40FF]/20 border-b border-[#1A40FF]/30 dark:border-[#1A40FF]/40"
        >
          <h4 className="text-xs font-semibold text-[#1A40FF] dark:text-[#5570FF] uppercase tracking-wider mb-3">
            {t('inmobiliaria.reporte.appliedFilters')}
          </h4>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white dark:bg-background border border-[#1A40FF]/30 dark:border-[#1A40FF]/40">
              <CalendarBlank className="w-4 h-4 text-[#1A40FF] dark:text-[#5570FF]" weight="duotone" />
              <span className="text-sm font-medium text-foreground">
                {formatPeriodDisplayFn(filters.period, fmtDate)}
              </span>
            </div>
            {filters.zone && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white dark:bg-background border border-[#1A40FF]/30 dark:border-[#1A40FF]/40">
                <MapPin className="w-4 h-4 text-[#1A40FF] dark:text-[#5570FF]" weight="duotone" />
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
              className="flex-1 bg-[#1A40FF] hover:opacity-90 text-white hover: transition-all"
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
                className="px-4 border-[#1A40FF]/30 dark:border-[#1A40FF]/40 hover:bg-[#EEF1FF] dark:hover:bg-[#1A40FF]/50"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 text-[#1A40FF] dark:text-[#5570FF]" />
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
