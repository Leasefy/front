'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  CurrencyCircleDollar,
  Clock,
  Warning,
  CheckCircle,
  TrendUp,
  Coin,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import type { DispersionSummary } from '@/lib/types/inmobiliaria';
import { nombreDelMes } from '@/lib/utils/mes';

interface DispersionResumenProps {
  summary: DispersionSummary;
  onViewPending?: () => void;
  onProcessAll?: () => void;
  className?: string;
}

/**
 * Get completion rate color based on percentage - subtle version
 */
function getProgressColor(rate: number): string {
  if (rate >= 90) return 'bg-foreground';
  if (rate >= 50) return 'bg-foreground/70';
  if (rate > 0) return 'bg-foreground/50';
  return 'bg-muted-foreground/30';
}

/**
 * Animated counter component for currency values
 */
function AnimatedCurrency({
  value,
  duration = 0.8,
  className,
  formatter,
}: {
  value: number;
  duration?: number;
  className?: string;
  formatter: (amount: number) => string;
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

  return <span className={className}>{formatter(displayValue)}</span>;
}

/**
 * DispersionResumen - Monthly summary card with dispersion stats
 * Clean, minimal design following project conventions
 */
export function DispersionResumen({
  summary,
  onViewPending,
  onProcessAll,
  className,
}: DispersionResumenProps) {
  const { t, formatDate, formatCurrency } = useI18n();
  const totalDispersions = summary.dispersionsPending + summary.dispersionsCompleted + summary.dispersionsFailed;
  const completionRate = totalDispersions > 0
    ? (summary.dispersionsCompleted / totalDispersions) * 100
    : 0;

  // Format month for display
  // `new Date('2026-08-01')` es medianoche UTC: en Colombia retrocede al 31
  // de julio y el título decía «julio» sobre datos de agosto.
  const monthDisplay = nombreDelMes(summary.month);

  const hasPending = summary.dispersionsPending > 0;
  const hasFailed = summary.dispersionsFailed > 0;

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
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-lg font-semibold text-foreground capitalize">
          {t('inmobiliaria.dispersiones.resumen.summaryMonth', { month: monthDisplay })}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('inmobiliaria.dispersiones.resumen.ownerDisbursements')}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Total to Disburse */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CurrencyCircleDollar className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('inmobiliaria.dispersiones.resumen.toDisburse')}
              </span>
            </div>
            <AnimatedCurrency
              value={summary.totalToDisburse}
              className="text-2xl font-semibold text-foreground tabular-nums"
              formatter={formatCurrency}
            />
          </div>

          {/* Commissions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Coin className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('inmobiliaria.dispersiones.resumen.commissions')}
              </span>
            </div>
            <AnimatedCurrency
              value={summary.totalCommissions}
              className="text-2xl font-semibold text-foreground tabular-nums"
              formatter={formatCurrency}
            />
          </div>

          {/* Completion Rate */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('inmobiliaria.dispersiones.resumen.progress')}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-semibold text-foreground tabular-nums"
              >
                {completionRate.toFixed(0)}
              </motion.span>
              <span className="text-lg text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {totalDispersions > 0 && (
          <div className="mt-6">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(completionRate, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                className={cn('h-full rounded-full', getProgressColor(completionRate))}
              />
            </div>
          </div>
        )}

        {/* Status Counts - Inline */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{t('inmobiliaria.dispersiones.resumen.pendingLabel')}</span>
            <span className={cn(
              'font-medium tabular-nums',
              hasPending ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {summary.dispersionsPending}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{t('inmobiliaria.dispersiones.resumen.completedLabel')}</span>
            <span className="font-medium text-foreground tabular-nums">
              {summary.dispersionsCompleted}
            </span>
          </div>
          {hasFailed && (
            <div className="flex items-center gap-1.5 text-sm">
              <Warning className="w-3.5 h-3.5 text-destructive" />
              <span className="text-muted-foreground">{t('inmobiliaria.dispersiones.resumen.failedLabel')}</span>
              <span className="font-medium text-destructive tabular-nums">
                {summary.dispersionsFailed}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      {hasPending && (onProcessAll || onViewPending) && (
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {summary.dispersionsPending !== 1
              ? t('inmobiliaria.dispersiones.resumen.pendingToProcessPlural', { count: summary.dispersionsPending })
              : t('inmobiliaria.dispersiones.resumen.pendingToProcess', { count: summary.dispersionsPending })}
          </p>
          <div className="flex items-center gap-2">
            {onViewPending && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewPending}
                hideArrow
              >
                {t('inmobiliaria.dispersiones.resumen.viewPending')}
              </Button>
            )}
            {onProcessAll && (
              <Button
                size="sm"
                onClick={onProcessAll}
                className="gap-2"
              >
                <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                {t('inmobiliaria.dispersiones.resumen.processAll')}
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * DispersionResumenCompact - Smaller variant for dashboards
 */
export function DispersionResumenCompact({
  summary,
  className,
}: {
  summary: DispersionSummary;
  className?: string;
}) {
  const { t, formatCurrency } = useI18n();
  const totalDispersions = summary.dispersionsPending + summary.dispersionsCompleted + summary.dispersionsFailed;
  const completionRate = totalDispersions > 0
    ? (summary.dispersionsCompleted / totalDispersions) * 100
    : 0;

  return (
    <div className={cn('p-4 rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{t('inmobiliaria.dispersiones.resumen.dispersionsLabel')}</span>
        <span className="text-lg font-semibold text-foreground tabular-nums">
          {completionRate.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getProgressColor(completionRate))}
          style={{ width: `${Math.min(completionRate, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(summary.totalToDisburse)}</span>
        <span>{summary.dispersionsCompleted}/{totalDispersions}</span>
      </div>
    </div>
  );
}

export default DispersionResumen;
