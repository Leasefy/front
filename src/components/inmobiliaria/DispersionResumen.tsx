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
  Coin,
  Lightning,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { DispersionSummary } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface DispersionResumenProps {
  summary: DispersionSummary;
  onGenerateDispersiones?: () => void;
  onViewPending?: () => void;
  onProcessAll?: () => void;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Get completion rate color based on percentage
 */
function getCompletionRateColor(completed: number, total: number): {
  bg: string;
  fill: string;
  text: string;
  label: string;
} {
  const rate = total > 0 ? (completed / total) * 100 : 0;
  if (rate >= 90) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      fill: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      label: 'Excelente',
    };
  }
  if (rate >= 50) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      fill: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'En progreso',
    };
  }
  if (rate > 0) {
    return {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      fill: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      label: 'Iniciando',
    };
  }
  return {
    bg: 'bg-muted',
    fill: 'bg-muted-foreground',
    text: 'text-muted-foreground',
    label: 'Pendiente',
  };
}

/**
 * Animated counter component for currency values
 */
function AnimatedCurrency({
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
 * Animated counter component for numbers
 */
function AnimatedNumber({
  value,
  duration = 0.6,
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
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(startValue + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };

    requestAnimationFrame(updateValue);
  }, [value, duration]);

  return <span className={className}>{displayValue}</span>;
}

/**
 * DispersionResumen - Monthly summary card with dispersion stats
 * Shows totals, completion progress, and quick actions
 */
export function DispersionResumen({
  summary,
  onGenerateDispersiones,
  onViewPending,
  onProcessAll,
  onRefresh,
  className,
}: DispersionResumenProps) {
  const totalDispersions = summary.dispersionsPending + summary.dispersionsCompleted + summary.dispersionsFailed;
  const completionRate = totalDispersions > 0
    ? (summary.dispersionsCompleted / totalDispersions) * 100
    : 0;
  const rateColors = getCompletionRateColor(summary.dispersionsCompleted, totalDispersions);

  // Format month for display
  const monthDisplay = new Date(summary.month + '-01').toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  // Stats configuration
  const stats = [
    {
      key: 'toDisburse',
      label: 'A dispersar',
      value: summary.totalToDisburse,
      icon: CurrencyCircleDollar,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      isLarge: true,
    },
    {
      key: 'commissions',
      label: 'Comisiones',
      value: summary.totalCommissions,
      icon: Coin,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      isLarge: false,
    },
  ];

  const countStats = [
    {
      key: 'pending',
      label: 'Pendientes',
      count: summary.dispersionsPending,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      key: 'completed',
      label: 'Completadas',
      count: summary.dispersionsCompleted,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      key: 'failed',
      label: 'Fallidas',
      count: summary.dispersionsFailed,
      icon: Warning,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      showIfZero: false,
    },
  ].filter((stat) => stat.showIfZero !== false || stat.count > 0);

  const hasNoDispersions = totalDispersions === 0;
  const hasPending = summary.dispersionsPending > 0;

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
            Dispersiones {monthDisplay}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen de pagos a propietarios
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Main Stats - Amount Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'p-5 rounded-xl',
                stat.bg,
                stat.isLarge && 'md:col-span-1'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-5 h-5', stat.color)} weight="fill" />
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <AnimatedCurrency
                value={stat.value}
                className={cn(
                  'font-bold',
                  stat.color,
                  stat.isLarge ? 'text-2xl' : 'text-xl'
                )}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Completion Progress */}
      {totalDispersions > 0 && (
        <div className="p-4 rounded-xl bg-muted/30 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-medium text-foreground">
                Progreso de dispersiones
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
                className={cn('text-2xl font-bold', rateColors.text)}
              >
                {completionRate.toFixed(0)}%
              </motion.span>
              {completionRate >= 90 ? (
                <TrendUp className={cn('w-5 h-5', rateColors.text)} weight="bold" />
              ) : completionRate < 50 && completionRate > 0 ? (
                <TrendDown className={cn('w-5 h-5', rateColors.text)} weight="bold" />
              ) : null}
            </div>
          </div>
          {/* Progress Bar */}
          <div className={cn('h-3 rounded-full overflow-hidden', rateColors.bg)}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(completionRate, 100)}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className={cn('h-full rounded-full', rateColors.fill)}
            />
          </div>
        </div>
      )}

      {/* Counts Row */}
      <div className={cn('grid gap-4 mb-6', countStats.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {countStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={cn('text-center p-4 rounded-xl', stat.bg)}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Icon className={cn('w-4 h-4', stat.color)} weight="fill" />
                <AnimatedNumber
                  value={stat.count}
                  className={cn('text-2xl font-bold', stat.color)}
                />
              </div>
              <p className={cn('text-xs', stat.color)}>
                {stat.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
        {/* Generate dispersiones button - show if none exist */}
        {hasNoDispersions && onGenerateDispersiones && (
          <Button
            onClick={onGenerateDispersiones}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Lightning className="w-4 h-4 mr-2" weight="fill" />
            Generar Dispersiones
          </Button>
        )}

        {/* Process all button - show if there are pending */}
        {hasPending && onProcessAll && (
          <Button
            onClick={onProcessAll}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" weight="fill" />
            Procesar Todas ({summary.dispersionsPending})
          </Button>
        )}

        {/* View pending link */}
        {hasPending && onViewPending && (
          <Button
            variant="outline"
            onClick={onViewPending}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Ver pendientes
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
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
  const totalDispersions = summary.dispersionsPending + summary.dispersionsCompleted + summary.dispersionsFailed;
  const completionRate = totalDispersions > 0
    ? (summary.dispersionsCompleted / totalDispersions) * 100
    : 0;
  const rateColors = getCompletionRateColor(summary.dispersionsCompleted, totalDispersions);

  return (
    <div className={cn('p-4 rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Dispersiones</span>
        <span className={cn('text-xl font-bold', rateColors.text)}>
          {completionRate.toFixed(0)}%
        </span>
      </div>
      <div className={cn('h-2 rounded-full overflow-hidden mb-3', rateColors.bg)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', rateColors.fill)}
          style={{ width: `${Math.min(completionRate, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-emerald-600 dark:text-emerald-400">
          {formatCurrency(summary.totalToDisburse)}
        </span>
        <span className="text-muted-foreground">
          {summary.dispersionsCompleted}/{totalDispersions}
        </span>
      </div>
    </div>
  );
}

export default DispersionResumen;
