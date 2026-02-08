'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  CurrencyCircleDollar,
  CheckCircle,
  Clock,
  Warning,
  ArrowClockwise,
  ArrowRight,
  TrendUp,
  TrendDown,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { CobroSummary } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface CobroResumenProps {
  summary: CobroSummary;
  onViewPending?: () => void;
  onViewLate?: () => void;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Get collection rate color based on percentage
 * Green: > 90%
 * Amber: 70-90%
 * Red: < 70%
 */
function getCollectionRateColor(rate: number): {
  bg: string;
  fill: string;
  text: string;
  label: string;
} {
  if (rate >= 90) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      fill: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      label: 'Excelente',
    };
  }
  if (rate >= 70) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      fill: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'Aceptable',
    };
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    fill: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    label: 'Bajo',
  };
}

/**
 * Animated counter component
 */
function AnimatedNumber({
  value,
  duration = 0.8,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const updateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // Easing function: easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setDisplayValue(Math.round(startValue + diff * eased));

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };

    requestAnimationFrame(updateValue);
  }, [value, duration]);

  return <span className={className}>{formatCurrency(displayValue)}</span>;
}

/**
 * CobroResumen - Monthly summary card with collection stats
 * Shows totals, collection rate, and quick actions
 */
export function CobroResumen({
  summary,
  onViewPending,
  onViewLate,
  onRefresh,
  className,
}: CobroResumenProps) {
  const rateColors = getCollectionRateColor(summary.collectionRate);

  // Format month for display
  const monthDisplay = new Date(summary.month + '-01').toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  // Stats configuration
  const stats = [
    {
      key: 'expected',
      label: 'Por cobrar',
      value: summary.totalExpected,
      icon: CurrencyCircleDollar,
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
    },
    {
      key: 'collected',
      label: 'Cobrado',
      value: summary.totalCollected,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      key: 'pending',
      label: 'Pendiente',
      value: summary.totalPending,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      key: 'late',
      label: 'En mora',
      value: summary.totalLate,
      icon: Warning,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-6 rounded-2xl border border-border bg-card',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground capitalize">
            {monthDisplay}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen de cobros del mes
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Actualizar datos"
          >
            <ArrowClockwise className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'p-4 rounded-xl',
                stat.bg
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-4 h-4', stat.color)} weight="fill" />
                <span className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <AnimatedNumber
                value={stat.value}
                className={cn('text-xl font-bold', stat.color)}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Collection Rate */}
      <div className="p-4 rounded-xl bg-muted/30 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-medium text-foreground">
              Tasa de recaudo
            </span>
            <span className={cn('ml-2 text-xs font-medium', rateColors.text)}>
              {rateColors.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className={cn('text-3xl font-bold', rateColors.text)}
            >
              {summary.collectionRate.toFixed(1)}%
            </motion.span>
            {summary.collectionRate >= 90 ? (
              <TrendUp className={cn('w-5 h-5', rateColors.text)} weight="bold" />
            ) : summary.collectionRate < 70 ? (
              <TrendDown className={cn('w-5 h-5', rateColors.text)} weight="bold" />
            ) : null}
          </div>
        </div>
        {/* Progress Bar */}
        <div className={cn('h-3 rounded-full overflow-hidden', rateColors.bg)}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(summary.collectionRate, 100)}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className={cn('h-full rounded-full', rateColors.fill)}
          />
        </div>
      </div>

      {/* Counts Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.cobrosPaid}
          </span>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
            Pagados
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.cobrosPending}
          </span>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Pendientes
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
          <span className="text-2xl font-bold text-red-600 dark:text-red-400">
            {summary.cobrosLate}
          </span>
          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
            En mora
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      {(onViewPending || onViewLate) && (
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          {onViewPending && summary.cobrosPending > 0 && (
            <button
              onClick={onViewPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
            >
              <Clock className="w-4 h-4" />
              Ver pendientes
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onViewLate && summary.cobrosLate > 0 && (
            <button
              onClick={onViewLate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Warning className="w-4 h-4" />
              Ver morosos
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
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
  const rateColors = getCollectionRateColor(summary.collectionRate);

  return (
    <div className={cn('p-4 rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Recaudo</span>
        <span className={cn('text-xl font-bold', rateColors.text)}>
          {summary.collectionRate.toFixed(0)}%
        </span>
      </div>
      <div className={cn('h-2 rounded-full overflow-hidden mb-3', rateColors.bg)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', rateColors.fill)}
          style={{ width: `${Math.min(summary.collectionRate, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-emerald-600 dark:text-emerald-400">
          {formatCurrency(summary.totalCollected)}
        </span>
        <span className="text-muted-foreground">de</span>
        <span className="text-foreground font-medium">
          {formatCurrency(summary.totalExpected)}
        </span>
      </div>
    </div>
  );
}

export default CobroResumen;
