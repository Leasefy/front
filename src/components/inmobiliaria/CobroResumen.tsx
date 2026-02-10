'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  CurrencyCircleDollar,
  CheckCircle,
  Clock,
  Warning,
  ArrowClockwise,
  CaretRight,
  TrendUp,
  TrendDown,
  ChartLineUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { CobroSummary } from '@/lib/types/inmobiliaria';
import { formatCurrency as formatCurrencyUtil } from '@/lib/types/inmobiliaria';

interface CobroResumenProps {
  summary: CobroSummary;
  onViewPending?: () => void;
  onViewLate?: () => void;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Animated counter component
 */
function AnimatedNumber({
  value,
  duration = 0.8,
  className,
  formatFn,
}: {
  value: number;
  duration?: number;
  className?: string;
  formatFn: (amount: number) => string;
}) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const updateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(startValue + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };

    requestAnimationFrame(updateValue);
  }, [value, duration]);

  return <span className={className}>{formatFn(displayValue)}</span>;
}

/**
 * CobroResumen - Monthly summary card with collection stats
 * Clean, unified design following design token system
 */
export function CobroResumen({
  summary,
  onViewPending,
  onViewLate,
  onRefresh,
  className,
}: CobroResumenProps) {
  const { t, formatDate, formatCurrency } = useTranslation();

  /**
   * Get collection rate info based on percentage
   */
  const getCollectionRateInfo = (rate: number) => {
    if (rate >= 90) {
      return {
        fill: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        label: t('inmobiliaria.cobros.resumen.rateExcellent'),
        trend: 'up' as const,
      };
    }
    if (rate >= 70) {
      return {
        fill: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        label: t('inmobiliaria.cobros.resumen.rateAcceptable'),
        trend: 'neutral' as const,
      };
    }
    return {
      fill: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      label: t('inmobiliaria.cobros.resumen.rateLow'),
      trend: 'down' as const,
    };
  };

  const rateInfo = getCollectionRateInfo(summary.collectionRate);

  // Format month for display
  const monthDisplay = formatDate(new Date(summary.month + '-01'), {
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border border-border bg-card overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <ChartLineUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="bold" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground capitalize">
              {monthDisplay}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('inmobiliaria.cobros.resumen.summaryTitle')}
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={t('inmobiliaria.cobros.resumen.refreshTooltip')}
          >
            <ArrowClockwise className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="p-5">
        {/* Collection Rate - Hero Section */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('inmobiliaria.cobros.resumen.collectionRate')}</p>
            <div className="flex items-baseline gap-2">
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-4xl font-bold text-foreground"
              >
                {summary.collectionRate.toFixed(1)}%
              </motion.span>
              <span className={cn('text-sm font-medium', rateInfo.text)}>
                {rateInfo.label}
              </span>
              {rateInfo.trend === 'up' && (
                <TrendUp className={cn('w-5 h-5', rateInfo.text)} weight="bold" />
              )}
              {rateInfo.trend === 'down' && (
                <TrendDown className={cn('w-5 h-5', rateInfo.text)} weight="bold" />
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">{t('inmobiliaria.cobros.resumen.toCollect')}</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(summary.totalExpected)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full overflow-hidden bg-muted mb-5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(summary.collectionRate, 100)}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className={cn('h-full rounded-full', rateInfo.fill)}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {/* Cobrado */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
              <span className="text-xs font-medium text-muted-foreground">{t('inmobiliaria.cobros.resumen.collected')}</span>
            </div>
            <AnimatedNumber
              value={summary.totalCollected}
              className="text-lg font-bold text-foreground"
              formatFn={formatCurrency}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('inmobiliaria.cobros.resumen.payments', { count: summary.cobrosPaid })}
            </p>
          </div>

          {/* Pendiente */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" weight="fill" />
              <span className="text-xs font-medium text-muted-foreground">{t('inmobiliaria.cobros.resumen.pendingLabel')}</span>
            </div>
            <AnimatedNumber
              value={summary.totalPending}
              className="text-lg font-bold text-foreground"
              formatFn={formatCurrency}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('inmobiliaria.cobros.resumen.collections', { count: summary.cobrosPending })}
            </p>
          </div>

          {/* En mora */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Warning className="w-4 h-4 text-red-500" weight="fill" />
              <span className="text-xs font-medium text-muted-foreground">{t('inmobiliaria.cobros.resumen.lateLabel')}</span>
            </div>
            <AnimatedNumber
              value={summary.totalLate}
              className="text-lg font-bold text-foreground"
              formatFn={formatCurrency}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('inmobiliaria.cobros.resumen.collections', { count: summary.cobrosLate })}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        {(onViewPending || onViewLate) && (
          <div className="flex gap-3 pt-4 border-t border-border">
            {onViewPending && summary.cobrosPending > 0 && (
              <button
                onClick={onViewPending}
                className="flex-1 flex items-center justify-between px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 rounded-lg border border-border transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" weight="fill" />
                  {t('inmobiliaria.cobros.resumen.viewPending')}
                </span>
                <CaretRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}
            {onViewLate && summary.cobrosLate > 0 && (
              <button
                onClick={onViewLate}
                className="flex-1 flex items-center justify-between px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 rounded-lg border border-border transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <Warning className="w-4 h-4 text-red-500" weight="fill" />
                  {t('inmobiliaria.cobros.resumen.viewLate')}
                </span>
                <CaretRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * CobroResumenCompact - Smaller variant for dashboards
 */
export function CobroResumenCompact({
  summary,
  className,
}: {
  summary: CobroSummary;
  className?: string;
}) {
  const { t, formatCurrency } = useTranslation();

  const getCollectionRateInfo = (rate: number) => {
    if (rate >= 90) {
      return {
        fill: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        trend: 'up' as const,
      };
    }
    if (rate >= 70) {
      return {
        fill: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        trend: 'neutral' as const,
      };
    }
    return {
      fill: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      trend: 'down' as const,
    };
  };

  const rateInfo = getCollectionRateInfo(summary.collectionRate);

  return (
    <div className={cn('p-4 rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{t('inmobiliaria.cobros.resumen.compactCollection')}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-bold text-foreground">
            {summary.collectionRate.toFixed(0)}%
          </span>
          {rateInfo.trend === 'up' && (
            <TrendUp className={cn('w-4 h-4', rateInfo.text)} weight="bold" />
          )}
          {rateInfo.trend === 'down' && (
            <TrendDown className={cn('w-4 h-4', rateInfo.text)} weight="bold" />
          )}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-muted mb-3">
        <div
          className={cn('h-full rounded-full transition-all duration-500', rateInfo.fill)}
          style={{ width: `${Math.min(summary.collectionRate, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-medium">
          {formatCurrency(summary.totalCollected)}
        </span>
        <span className="text-muted-foreground">{t('inmobiliaria.cobros.resumen.compactOf')}</span>
        <span className="text-muted-foreground">
          {formatCurrency(summary.totalExpected)}
        </span>
      </div>
    </div>
  );
}

export default CobroResumen;
