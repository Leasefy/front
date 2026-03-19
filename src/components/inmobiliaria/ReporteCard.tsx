'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  Users,
  ChartPie,
  Calendar,
  ChartBar,
  CurrencyDollar,
  Star,
  Eye,
  DownloadSimple,
  ArrowClockwise,
  FilePdf,
  FileXls,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ReportDefinition } from '@/lib/types/inmobiliaria';
import {
  getReportCategoryColor,
  getReportCategoryLabel,
  getReportFormatColor,
  getReportFrequencyLabel,
} from '@/lib/types/inmobiliaria';

interface ReporteCardProps {
  report: ReportDefinition;
  variant?: 'default' | 'compact';
  onGenerate?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onToggleFavorite?: () => void;
  isGenerating?: boolean;
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
const CATEGORY_BG_COLORS: Record<string, string> = {
  financiero: 'bg-emerald-100 dark:bg-emerald-900/30',
  operativo: 'bg-blue-100 dark:bg-blue-900/30',
  agentes: 'bg-violet-100 dark:bg-violet-900/30',
};

const CATEGORY_ICON_COLORS: Record<string, string> = {
  financiero: 'text-emerald-600 dark:text-emerald-400',
  operativo: 'text-blue-600 dark:text-blue-400',
  agentes: 'text-violet-600 dark:text-violet-400',
};

/**
 * Get status indicator based on last generated date
 */
function getGenerationStatus(lastGenerated: string | undefined, t: (key: string, params?: Record<string, string | number>) => string): {
  color: string;
  label: string;
} {
  if (!lastGenerated) {
    return { color: 'bg-neutral-400', label: t('inmobiliaria.reporte.neverGenerated') };
  }

  const lastDate = new Date(lastGenerated);
  const today = new Date();
  const diffDays = Math.floor(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return { color: 'bg-emerald-500', label: t('inmobiliaria.reporte.generatedToday') };
  } else if (diffDays <= 7) {
    return { color: 'bg-amber-500', label: t('inmobiliaria.reporte.daysAgo', { days: diffDays }) };
  } else {
    return { color: 'bg-neutral-400', label: t('inmobiliaria.reporte.daysAgo', { days: diffDays }) };
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
  onToggleFavorite,
  isGenerating = false,
}: ReporteCardProps) {
  const { t, formatDate: fmtDate } = useI18n();
  const Icon = ICON_MAP[report.icon] || FileText;
  const bgColor = CATEGORY_BG_COLORS[report.category] || 'bg-neutral-100';
  const iconColor = CATEGORY_ICON_COLORS[report.category] || 'text-neutral-600';
  const status = getGenerationStatus(report.lastGenerated, t);
  const FormatIcon = report.format === 'pdf' ? FilePdf : FileXls;

  // Compact variant - single row for grid views
  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:shadow-md transition-all cursor-pointer"
        onClick={onPreview}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              bgColor
            )}
          >
            <Icon className={cn('w-5 h-5', iconColor)} weight="duotone" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
                {report.title}
              </h3>
              {report.isFavorite && (
                <Star
                  className="w-4 h-4 text-amber-500 shrink-0"
                  weight="fill"
                />
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
              {report.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                  getReportFormatColor(report.format)
                )}
              >
                <FormatIcon className="w-3 h-3" />
                {report.format.toUpperCase()}
              </span>
              <span className="text-xs text-neutral-400">
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
      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden transition-all hover:shadow-lg"
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
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                {report.title}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                {report.description}
              </p>
            </div>
          </div>

          {/* Favorite Toggle */}
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <Star
                className={cn(
                  'w-5 h-5',
                  report.isFavorite
                    ? 'text-amber-500'
                    : 'text-neutral-400 hover:text-amber-500'
                )}
                weight={report.isFavorite ? 'fill' : 'regular'}
              />
            </button>
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

          {/* Format Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              getReportFormatColor(report.format)
            )}
          >
            <FormatIcon className="w-3.5 h-3.5" />
            {report.format.toUpperCase()}
          </span>

          {/* Frequency Badge */}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
            {getReportFrequencyLabel(report.frequency)}
          </span>
        </div>
      </div>

      {/* Status Section */}
      <div className="px-5 pb-4 flex items-center gap-2">
        <span
          className={cn('w-2 h-2 rounded-full shrink-0', status.color)}
        />
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('inmobiliaria.reporte.last')}: {formatLastGeneratedFn(report.lastGenerated, t, fmtDate)}
        </span>
      </div>

      {/* Actions Section */}
      <div className="px-5 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
        {/* Generate Button */}
        {onGenerate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerate();
            }}
            disabled={isGenerating}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              isGenerating
                ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-indigo-500 text-white hover:bg-indigo-600'
            )}
          >
            {isGenerating ? (
              <>
                <ArrowClockwise className="w-4 h-4 animate-spin" />
                {t('inmobiliaria.reporte.generating')}
              </>
            ) : (
              <>
                <ArrowClockwise className="w-4 h-4" />
                {t('inmobiliaria.reporte.generate')}
              </>
            )}
          </button>
        )}

        {/* Preview Button */}
        {onPreview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            {t('inmobiliaria.reporte.preview')}
          </button>
        )}

        {/* Download Button */}
        {onDownload && report.lastGenerated && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="flex items-center justify-center p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            title={t('inmobiliaria.reporte.download')}
          >
            <DownloadSimple className="w-4 h-4" />
          </button>
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
