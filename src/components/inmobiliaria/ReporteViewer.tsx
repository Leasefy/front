'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  Users,
  ChartPie,
  Calendar,
  ChartBar,
  ChartLineUp,
  CurrencyDollar,
  FileCsv,
  DownloadSimple,
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
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { ReportDefinition, ReportCategory } from '@/lib/types/inmobiliaria';
import {
  getReportCategoryColor,
  formatCurrency,
} from '@/lib/types/inmobiliaria';
import { formatoDelArchivo } from '@/lib/reportes/exportables';
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
  /**
   * Baja el reporte. Devuelve la promesa del pedido: el botón se queda
   * deshabilitado hasta que el archivo llegó (o falló), no 1,5 segundos.
   */
  onExport?: (format: 'pdf' | 'excel') => void | Promise<void>;
}

// Map icon names to Phosphor components
const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Clock,
  Users,
  ChartPie,
  Calendar,
  ChartBar,
  ChartLineUp,
  CurrencyDollar,
};

// Category colors for icon backgrounds
const CATEGORY_BG_COLORS: Record<ReportCategory, string> = {
  financiero: 'bg-success-soft',
  operativo: 'bg-primary-soft',
  agentes: 'bg-surface-muted dark:bg-ink',
};

const CATEGORY_ICON_COLORS: Record<ReportCategory, string> = {
  financiero: 'text-success',
  operativo: 'text-primary',
  agentes: 'text-fg-muted dark:text-fg-subtle',
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
          <p className="text-lg font-bold text-success">
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
                        ? 'bg-warning-soft text-warning'
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
                  <p className="text-sm font-bold text-success">
                    {formatCurrency(agente.totalCommission)}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    {agente.trend === 'up' && (
                      <ArrowUp className="w-3 h-3 text-success" />
                    )}
                    {agente.trend === 'down' && (
                      <ArrowDown className="w-3 h-3 text-danger" />
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
      <div className="p-4 rounded-lg bg-primary-soft border border-primary/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary font-medium">
              {t('inmobiliaria.reporte.generalOccupancy')}
            </p>
            <p className="text-3xl font-bold text-primary">
              {data.overallOccupancyRate}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.vsPrevMonth')}</p>
            <div className="flex items-center justify-end gap-1">
              {data.previousMonthOccupancyRate &&
              data.overallOccupancyRate > data.previousMonthOccupancyRate ? (
                <ArrowUp className="w-4 h-4 text-success" />
              ) : (
                <ArrowDown className="w-4 h-4 text-danger" />
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
          <Buildings className="w-5 h-5 mx-auto text-fg-muted mb-1" />
          <p className="text-lg font-bold text-foreground">{data.totalProperties}</p>
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.totalLabel')}</p>
        </div>
        <div className="p-3 rounded-md bg-success-soft text-center">
          <p className="text-lg font-bold text-success">
            {data.totalOccupied}
          </p>
          <p className="text-xs text-success">{t('inmobiliaria.reporte.rented')}</p>
        </div>
        <div className="p-3 rounded-md bg-primary-soft text-center">
          <p className="text-lg font-bold text-primary">
            {data.totalInProcess}
          </p>
          <p className="text-xs text-primary">{t('inmobiliaria.reporte.inProcess')}</p>
        </div>
        <div className="p-3 rounded-md bg-warning-soft text-center">
          <p className="text-lg font-bold text-warning">
            {data.totalAvailable}
          </p>
          <p className="text-xs text-warning">{t('inmobiliaria.reporte.available')}</p>
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
                    className="h-full bg-success rounded-full"
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
    '0-30': 'bg-danger-soft text-danger',
    '31-60': 'bg-warning-soft text-warning',
    '61-90': 'bg-primary-soft text-primary',
    '90+': 'bg-success-soft text-success',
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-md bg-danger-soft text-center">
          <p className="text-lg font-bold text-danger">
            {data.summary.bucket0to30}
          </p>
          <p className="text-xs text-danger">{t('inmobiliaria.reporte.days0to30')}</p>
        </div>
        <div className="p-3 rounded-md bg-warning-soft text-center">
          <p className="text-lg font-bold text-warning">
            {data.summary.bucket31to60}
          </p>
          <p className="text-xs text-warning">{t('inmobiliaria.reporte.days31to60')}</p>
        </div>
        <div className="p-3 rounded-md bg-primary-soft text-center">
          <p className="text-lg font-bold text-primary">
            {data.summary.bucket61to90}
          </p>
          <p className="text-xs text-primary">{t('inmobiliaria.reporte.days61to90')}</p>
        </div>
        <div className="p-3 rounded-md bg-success-soft text-center">
          <p className="text-lg font-bold text-success">
            {data.summary.bucket90plus}
          </p>
          <p className="text-xs text-success">{t('inmobiliaria.reporte.days90plus')}</p>
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
        <div className="p-4 rounded-md bg-success-soft">
          <div className="flex items-center gap-2 mb-1">
            <CurrencyCircleDollar className="w-5 h-5 text-success" />
            <p className="text-sm text-success">{t('inmobiliaria.reporte.income')}</p>
          </div>
          <p className="text-xl font-bold text-success">
            {formatCurrency(data.totals.totalIngresos)}
          </p>
        </div>
        <div className="p-4 rounded-md bg-primary-soft">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-5 h-5 text-primary" />
            <p className="text-sm text-primary">{t('inmobiliaria.reporte.commissions')}</p>
          </div>
          <p className="text-xl font-bold text-primary">
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
                  <p className="text-sm font-medium text-success">
                    {formatCurrency(month.ingresos)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('inmobiliaria.reporte.commissions')}</p>
                  <p className="text-sm font-medium text-primary">
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
      <div className="p-4 rounded-lg bg-danger-soft text-fg">
        <p className="text-sm font-medium text-danger">{t('inmobiliaria.reporte.totalOverduePortfolio')}</p>
        <p className="text-2xl font-bold">{formatCurrency(data.summary.totalPending)}</p>
        <p className="text-xs text-danger mt-1">{t('inmobiliaria.reporte.pendingCharges', { count: data.items.length })}</p>
      </div>

      {/* Bucket Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-md bg-success-soft text-center">
          <p className="text-lg font-bold text-success">
            {formatCurrency(data.summary.bucket0to30)}
          </p>
          <p className="text-xs text-success">{t('inmobiliaria.reporte.days0to30')}</p>
        </div>
        <div className="p-3 rounded-md bg-warning-soft text-center">
          <p className="text-lg font-bold text-warning">
            {formatCurrency(data.summary.bucket31to60)}
          </p>
          <p className="text-xs text-warning">{t('inmobiliaria.reporte.days31to60')}</p>
        </div>
        <div className="p-3 rounded-md bg-warning-soft text-center">
          <p className="text-lg font-bold text-warning">
            {formatCurrency(data.summary.bucket61to90)}
          </p>
          <p className="text-xs text-warning">{t('inmobiliaria.reporte.days61to90')}</p>
        </div>
        <div className="p-3 rounded-md bg-danger-soft text-center">
          <p className="text-lg font-bold text-danger">
            {formatCurrency(data.summary.bucket90plus)}
          </p>
          <p className="text-xs text-danger">{t('inmobiliaria.reporte.days90plus')}</p>
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
                  <p className="text-sm font-bold text-danger">
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
    <div className="p-8 rounded-lg bg-muted/50 text-center">
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

  /**
   * Bajar el reporte.
   *
   * Tenía un `await new Promise(r => setTimeout(r, 1500))` antes de llamar a
   * `onExport`: segundo y medio de rueda girando fingiendo trabajo, que es
   * exactamente la mentira que `lib/reportes/exportables.ts` documenta haber
   * sacado del resto del módulo. Y peor: `setIsExporting(false)` corría al
   * toque, sin esperar la descarga real, así que el botón volvía a estar vivo
   * con el pedido todavía en vuelo — dos clics, dos descargas.
   */
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!onExport || isExporting) return;
    setIsExporting(true);
    try {
      await onExport(format);
    } finally {
      setIsExporting(false);
    }
  };

  if (!report) return null;

  const Icon = ICON_MAP[report.icon] || FileText;
  const bgColor = CATEGORY_BG_COLORS[report.category];
  const iconColor = CATEGORY_ICON_COLORS[report.category];
  // Ver `formatoDelArchivo`: acá se pintaba `report.format` («EXCEL»/«PDF»)
  // arriba del botón que dice «Descargar CSV» y baja un `.csv`.
  const formatoDelArchivoQueBaja = formatoDelArchivo(report.id);

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
          {/* La ✕ la pone `SheetContent`: es la misma de todos los cajones y
              modales del producto. Acá había una segunda, dibujada a mano. */}
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
              {/*
                `SheetDescription`, no un `<p>` suelto: `SheetContent` es un
                Radix Dialog, y un diálogo sin descripción registrada avisa en
                consola («Missing `Description` … for {DialogContent}») y se
                abre sin `aria-describedby`, así que el lector de pantalla
                anuncia el título y nada más. El texto ya estaba acá; lo único
                que faltaba era que el diálogo supiera que es SU descripción.
              */}
              <SheetDescription className="text-sm text-muted-foreground mt-0.5">
                {report.description}
              </SheetDescription>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                    getReportCategoryColor(report.category)
                  )}
                >
                  {report.category}
                </span>
                {formatoDelArchivoQueBaja && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success-soft text-success">
                    <FileCsv className="w-3 h-3" />
                    {formatoDelArchivoQueBaja}
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Filters Applied */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-4 bg-primary-soft border-b border-primary/30"
        >
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            {t('inmobiliaria.reporte.appliedFilters')}
          </h4>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-primary/30">
              <CalendarBlank className="w-4 h-4 text-primary" weight="duotone" />
              <span className="text-sm font-medium text-foreground">
                {formatPeriodDisplayFn(filters.period, fmtDate)}
              </span>
            </div>
            {filters.zone && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-primary/30">
                <MapPin className="w-4 h-4 text-primary" weight="duotone" />
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
            className="rounded-lg border border-border bg-card p-4"
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
            {/* Export Primary */}
            <Button
              hideArrow
              className="flex-1"
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
                  {/* CSV, no `report.format`. El catálogo marca estos reportes
                      como «excel» o «pdf», pero `/reports/export` responde
                      `text/csv` y el archivo baja `.csv`: el botón prometía un
                      formato que nunca llegó. */}
                  {t('inmobiliaria.reporte.downloadFormat', { format: 'CSV' })}
                </>
              )}
            </Button>

            {/* Acá había un botón de imprimir (`window.print()`) sin una sola
                regla `@media print` en este componente: imprimía el panel
                entero con el cajón encima, no el reporte. Y debajo, un rótulo
                suelto «Exportación programada» sin producto detrás: ni botón,
                ni frecuencia, ni a dónde llega. Los dos salieron. */}
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}

export default ReporteViewer;
