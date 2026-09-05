'use client';

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
  Star,
  Eye,
  DownloadSimple,
  Info,
  FileCsv,
  Lock,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { IconButton } from '@leasefy/cadence';
import type { ReportDefinition } from '@/lib/types/inmobiliaria';
import {
  getReportCategoryColor,
  getReportCategoryLabel,
  getReportFrequencyLabel,
} from '@/lib/types/inmobiliaria';
import { formatoDelArchivo } from '@/lib/reportes/exportables';

interface ReporteCardProps {
  report: ReportDefinition;
  variant?: 'default' | 'compact';
  onGenerate?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  /**
   * ¿Este reporte se puede bajar de verdad? Sale de
   * `src/lib/reportes/exportables.ts`, que es la lista que el back sabe
   * producir. Cuando es `false` el botón lo dice en vez de prometer.
   */
  descargable?: boolean;
  onToggleFavorite?: () => void;
  isGenerating?: boolean;
  /** When true, show locked state with upgrade CTA */
  isLocked?: boolean;
  onUpgrade?: () => void;
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
const CATEGORY_BG_COLORS: Record<string, string> = {
  financiero: 'bg-success-soft',
  operativo: 'bg-primary-soft',
  agentes: 'bg-surface-muted dark:bg-ink',
};

const CATEGORY_ICON_COLORS: Record<string, string> = {
  financiero: 'text-success',
  operativo: 'text-primary',
  agentes: 'text-fg-muted dark:text-fg-subtle',
};

/**
 * Get status indicator based on last generated date
 */
function getGenerationStatus(lastGenerated: string | undefined, t: (key: string, params?: Record<string, string | number>) => string): {
  color: string;
  label: string;
} {
  if (!lastGenerated) {
    return { color: 'bg-muted', label: t('inmobiliaria.reporte.neverGenerated') };
  }

  const lastDate = new Date(lastGenerated);
  const today = new Date();
  const diffDays = Math.floor(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return { color: 'bg-success', label: t('inmobiliaria.reporte.generatedToday') };
  } else if (diffDays <= 7) {
    return { color: 'bg-warning', label: t('inmobiliaria.reporte.daysAgo', { days: diffDays }) };
  } else {
    return { color: 'bg-muted', label: t('inmobiliaria.reporte.daysAgo', { days: diffDays }) };
  }
}

/**
 * Format last generated date for display
 */
function formatLastGeneratedFn(lastGenerated: string | undefined, t: (key: string) => string, fmtDate: (d: string) => string): string {
  if (!lastGenerated) return t('inmobiliaria.reporte.never');
  return fmtDate(lastGenerated);
}

/**
 * ReporteCard - Card for displaying individual report information
 * Shows report icon, title, description, format, frequency, and actions
 */
export function ReporteCard({
  report,
  variant = 'default',
  onGenerate,
  onPreview,
  onDownload,
  descargable = true,
  onToggleFavorite,
  isGenerating = false,
  isLocked = false,
  onUpgrade,
}: ReporteCardProps) {
  const { t, formatDate: fmtDate } = useI18n();
  const Icon = ICON_MAP[report.icon] || FileText;
  const bgColor = CATEGORY_BG_COLORS[report.category] || 'bg-surface-muted';
  const iconColor = CATEGORY_ICON_COLORS[report.category] || 'text-fg-muted';
  const status = getGenerationStatus(report.lastGenerated, t);
  /**
   * El formato del archivo que de verdad baja. Acá se leía `report.format`
   * —«EXCEL»/«PDF», literales del catálogo— justo al lado del botón
   * «Descargar CSV», que es lo que el back entrega. Dos afirmaciones opuestas
   * a diez píxeles. Cuando no hay archivo, no hay insignia: ver
   * `formatoDelArchivo` en `lib/reportes/exportables.ts`.
   */
  const formatoDelArchivoQueBaja = formatoDelArchivo(report.id);

  // Compact variant - single row for grid views
  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className={cn(
          'w-full p-4 rounded-lg border border-border bg-card transition-all cursor-pointer hover:border-foreground/15',
          isLocked && 'opacity-75'
        )}
        onClick={isLocked ? onUpgrade : onPreview}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-md flex items-center justify-center shrink-0',
              isLocked ? 'bg-surface-muted dark:bg-ink' : bgColor
            )}
          >
            {isLocked ? (
              <Lock className="w-5 h-5 text-fg-subtle dark:text-fg-muted" />
            ) : (
              <Icon className={cn('w-5 h-5', iconColor)} weight="duotone" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                'font-semibold text-sm truncate',
                isLocked ? 'text-fg-subtle dark:text-fg-muted' : 'text-fg'
              )}>
                {report.title}
              </h3>
              {isLocked && (
                <Badge variant="default" className="text-[10px] shrink-0">
                  Pro
                </Badge>
              )}
              {!isLocked && report.isFavorite && (
                <Star
                  className="w-4 h-4 text-warning shrink-0"
                  weight="fill"
                />
              )}
            </div>
            <p className="text-xs text-fg-muted dark:text-fg-subtle line-clamp-1">
              {report.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {formatoDelArchivoQueBaja && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-success-soft text-success">
                  <FileCsv className="w-3 h-3" />
                  {formatoDelArchivoQueBaja}
                </span>
              )}
              <span className="text-xs text-fg-subtle">
                {getReportFrequencyLabel(report.frequency)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Full card variant
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="w-full rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-foreground/15"
    >
      {/* Header Section */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          {/* Icon and Title */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                bgColor
              )}
            >
              <Icon className={cn('w-6 h-6', iconColor)} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  'font-semibold',
                  isLocked ? 'text-fg-subtle dark:text-fg-muted' : 'text-fg'
                )}>
                  {report.title}
                </h3>
                {isLocked && (
                  <Badge className="shrink-0">Pro</Badge>
                )}
              </div>
              <p className="text-sm text-fg-muted dark:text-fg-subtle line-clamp-2">
                {report.description}
              </p>
            </div>
          </div>

          {/* Favorite Toggle */}
          {onToggleFavorite && (
            <IconButton
              variant="ghost"
              size="md"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              aria-label="Favorito"
              aria-pressed={report.isFavorite}
              icon={
                <Star
                  className={cn(
                    'w-5 h-5',
                    report.isFavorite ? 'text-warning' : 'text-fg-subtle'
                  )}
                  weight={report.isFavorite ? 'fill' : 'regular'}
                />
              }
            />
          )}
        </div>
      </div>

      {/* Badges Section */}
      <div className="px-5 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Badge */}
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
              getReportCategoryColor(report.category)
            )}
          >
            {getReportCategoryLabel(report.category)}
          </span>

          {/* Formato del archivo — sólo cuando hay archivo */}
          {formatoDelArchivoQueBaja && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success-soft text-success">
              <FileCsv className="w-3.5 h-3.5" />
              {formatoDelArchivoQueBaja}
            </span>
          )}

          {/* Frequency Badge */}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-surface-muted dark:bg-ink text-fg-muted dark:text-fg-subtle">
            {getReportFrequencyLabel(report.frequency)}
          </span>
        </div>
      </div>

      {/* Status Section */}
      <div className="px-5 pb-4 flex items-center gap-2">
        <span
          className={cn('w-2 h-2 rounded-full shrink-0', status.color)}
        />
        <span className="text-sm text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.reporte.last')}: {formatLastGeneratedFn(report.lastGenerated, t, fmtDate)}
        </span>
      </div>

      {/* Actions Section */}
      <div className="px-5 py-4 border-t border-border flex items-center gap-2">
        {isLocked ? (
          <Button
            hideArrow
            onClick={(e) => {
              e.stopPropagation();
              onUpgrade?.();
            }}
            className="flex-1 gap-2"
          >
            <Lock className="w-4 h-4" />
            {t('inmobiliaria.reporte.upgradeToAccess') || 'Mejorar plan'}
          </Button>
        ) : (
          <>
            {/* Acción principal.
                Decía «Generar» y no generaba: esperaba 1,5 s y cantaba éxito.
                Generar y descargar son la MISMA acción —el back arma el CSV a
                pedido—, así que el botón dice lo que de verdad va a pasar. Y
                cuando el reporte todavía no existe, se ve distinto en vez de
                prometer lo mismo que los que sí funcionan. */}
            {onGenerate && (
              <Button
                hideArrow
                variant={descargable ? 'default' : 'secondary'}
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate();
                }}
                disabled={isGenerating}
                className="flex-1 gap-2"
              >
                {isGenerating ? (
                  <>
                    <Spinner size="sm" variant="current" />
                    Descargando…
                  </>
                ) : descargable ? (
                  <>
                    <DownloadSimple className="w-4 h-4" />
                    Descargar CSV
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4" />
                    Todavía no
                  </>
                )}
              </Button>
            )}

            {/* Preview Button */}
            {onPreview && (
              <Button
                variant="secondary"
                hideArrow
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                {t('inmobiliaria.reporte.preview')}
              </Button>
            )}

            {/* El botón de descarga suelto salió: hacía exactamente lo mismo
                que el principal, y sólo aparecía después de «generar», que era
                la parte inventada. Dos botones para una acción es lo que dejó
                lugar a que uno de los dos mintiera. */}
          </>
        )}
      </div>
    </motion.div>
  );
}

/**
 * ReporteCardCompact - Compact variant export
 */
export function ReporteCardCompact(props: Omit<ReporteCardProps, 'variant'>) {
  return <ReporteCard {...props} variant="compact" />;
}


export default ReporteCard;
