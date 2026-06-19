'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBar,
  TrendUp,
  TrendDown,
  ArrowsInSimple,
  ArrowsOutSimple,
  CurrencyDollar,
  ListBullets,
  SquaresFour,
  Calendar,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { FlujoCajaReport, FlujoCajaMonth } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type PeriodOption = 'quarter' | 'semester' | 'year';

interface FlujoCajaChartProps {
  data: FlujoCajaReport;
  variant?: 'chart' | 'table';
  onPeriodChange?: (period: PeriodOption) => void;
  className?: string;
}

/**
 * Format month for display (2026-02 -> Feb)
 */
function formatMonthLabel(month: string, loc: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', { month: 'short' });
}

/**
 * Format month for full display
 */
function formatMonthFull(month: string, loc: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', { month: 'short', year: 'numeric' });
}

/**
 * CSS-only bar chart with grouped monthly bars
 */
function BarChart({ data, locale, t }: { data: FlujoCajaMonth[]; locale: string; t: (key: string, params?: Record<string, string | number>) => string }) {
  // Calculate max for scaling
  const maxValue = useMemo(() => {
    return Math.max(...data.flatMap((m) => [m.ingresos, m.dispersiones, m.comisiones]));
  }, [data]);

  const getBarHeight = (value: number) => {
    return maxValue > 0 ? (value / maxValue) * 100 : 0;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const barVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: (custom: number) => ({
      height: `${custom}%`,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' as const },
    }),
  };

  return (
    <div className="space-y-4">
      {/* Chart Area */}
      <div className="relative h-64 flex items-end gap-2 pt-8 pb-2">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>{formatCurrency(maxValue).replace('$', '').trim()}</span>
          <span>{formatCurrency(maxValue * 0.75).replace('$', '').trim()}</span>
          <span>{formatCurrency(maxValue * 0.5).replace('$', '').trim()}</span>
          <span>{formatCurrency(maxValue * 0.25).replace('$', '').trim()}</span>
          <span>0</span>
        </div>

        {/* Grid lines */}
        <div className="absolute left-16 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-neutral-100 dark:border-neutral-800" />
          ))}
        </div>

        {/* Bars */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex items-end justify-around gap-1 ml-16 h-full"
        >
          {data.map((month) => (
            <div key={month.month} className="flex-1 max-w-24 flex flex-col items-center gap-2">
              {/* Bar Group */}
              <div className="flex items-end gap-1 h-48">
                {/* Ingresos bar */}
                <motion.div
                  custom={getBarHeight(month.ingresos)}
                  variants={barVariants}
                  className="w-5 rounded-t bg-success"
                  title={`${t('inmobiliaria.finance.cashFlow.income')}: ${formatCurrency(month.ingresos)}`}
                />
                {/* Dispersiones bar */}
                <motion.div
                  custom={getBarHeight(month.dispersiones)}
                  variants={barVariants}
                  className="w-5 rounded-t bg-neutral-500"
                  title={`${t('inmobiliaria.finance.cashFlow.disbursements')}: ${formatCurrency(month.dispersiones)}`}
                />
                {/* Comisiones bar */}
                <motion.div
                  custom={getBarHeight(month.comisiones)}
                  variants={barVariants}
                  className="w-5 rounded-t bg-primary"
                  title={`${t('inmobiliaria.finance.cashFlow.commissions')}: ${formatCurrency(month.comisiones)}`}
                />
              </div>
              {/* Month label */}
              <span className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                {formatMonthLabel(month.month, locale)}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-success" />
          <span className="text-neutral-600 dark:text-neutral-400">{t('inmobiliaria.finance.cashFlow.income')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-neutral-100" />
          <span className="text-neutral-600 dark:text-neutral-400">{t('inmobiliaria.finance.cashFlow.disbursements')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-neutral-600 dark:text-neutral-400">{t('inmobiliaria.finance.cashFlow.commissions')}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Table view alternative
 */
function TableView({ data, locale, t }: { data: FlujoCajaMonth[]; locale: string; t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-100 dark:border-neutral-800">
            <th className="text-left p-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
              {t('inmobiliaria.finance.cashFlow.month')}
            </th>
            <th className="text-right p-3 text-xs font-semibold text-success uppercase">
              {t('inmobiliaria.finance.cashFlow.income')}
            </th>
            <th className="text-right p-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
              {t('inmobiliaria.finance.cashFlow.disbursements')}
            </th>
            <th className="text-right p-3 text-xs font-semibold text-primary uppercase">
              {t('inmobiliaria.finance.cashFlow.commissions')}
            </th>
            <th className="text-right p-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
              {t('inmobiliaria.finance.cashFlow.balance')}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((month, index) => (
            <motion.tr
              key={month.month}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-b border-neutral-50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-muted/20 transition-colors"
            >
              <td className="p-3">
                <span className="font-medium text-neutral-900 dark:text-white capitalize">
                  {formatMonthFull(month.month, locale)}
                </span>
              </td>
              <td className="p-3 text-right">
                <span className="font-medium text-success">
                  {formatCurrency(month.ingresos)}
                </span>
              </td>
              <td className="p-3 text-right">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {formatCurrency(month.dispersiones)}
                </span>
              </td>
              <td className="p-3 text-right">
                <span className="font-medium text-primary">
                  {formatCurrency(month.comisiones)}
                </span>
              </td>
              <td className="p-3 text-right">
                <span
                  className={cn(
                    'font-semibold',
                    month.balance >= 0
                      ? 'text-success'
                      : 'text-danger'
                  )}
                >
                  {formatCurrency(month.balance)}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-t-2 border-neutral-200 dark:border-neutral-700">
            <td className="p-3">
              <span className="font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.finance.cashFlow.total')}</span>
            </td>
            <td className="p-3 text-right">
              <span className="font-bold text-success">
                {formatCurrency(data.reduce((sum, m) => sum + m.ingresos, 0))}
              </span>
            </td>
            <td className="p-3 text-right">
              <span className="font-bold text-neutral-700 dark:text-neutral-300">
                {formatCurrency(data.reduce((sum, m) => sum + m.dispersiones, 0))}
              </span>
            </td>
            <td className="p-3 text-right">
              <span className="font-bold text-primary">
                {formatCurrency(data.reduce((sum, m) => sum + m.comisiones, 0))}
              </span>
            </td>
            <td className="p-3 text-right">
              <span className="font-bold text-success">
                {formatCurrency(data.reduce((sum, m) => sum + m.balance, 0))}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * FlujoCajaChart - Cash flow visualization
 * Shows monthly ingresos, dispersiones, and comisiones
 */
export function FlujoCajaChart({
  data,
  variant = 'chart',
  onPeriodChange,
  className,
}: FlujoCajaChartProps) {
  const { t, locale } = useI18n();
  const [viewVariant, setViewVariant] = useState<'chart' | 'table'>(variant);

  // Calculate trend vs previous period
  const trend = useMemo(() => {
    if (data.months.length < 2) return null;
    const current = data.months[data.months.length - 1].comisiones;
    const previous = data.months[data.months.length - 2].comisiones;
    const diff = ((current - previous) / previous) * 100;
    if (diff > 5) return { type: 'up' as const, percent: Math.round(diff) };
    if (diff < -5) return { type: 'down' as const, percent: Math.round(Math.abs(diff)) };
    return null;
  }, [data.months]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <ChartBar className="w-5 h-5 text-neutral-700 dark:text-neutral-300" weight="fill" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.finance.cashFlow.title')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {data.period === 'quarter' && t('inmobiliaria.finance.cashFlow.lastQuarter')}
              {data.period === 'semester' && t('inmobiliaria.finance.cashFlow.lastSemester')}
              {data.period === 'year' && t('inmobiliaria.finance.cashFlow.currentYear')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          {onPeriodChange && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
              <button
                onClick={() => onPeriodChange('quarter')}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  data.period === 'quarter'
                    ? 'bg-white dark:bg-card text-neutral-900 dark:text-white'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                )}
              >
                3M
              </button>
              <button
                onClick={() => onPeriodChange('semester')}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  data.period === 'semester'
                    ? 'bg-white dark:bg-card text-neutral-900 dark:text-white'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                )}
              >
                6M
              </button>
              <button
                onClick={() => onPeriodChange('year')}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  data.period === 'year'
                    ? 'bg-white dark:bg-card text-neutral-900 dark:text-white'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                )}
              >
                1A
              </button>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <button
              onClick={() => setViewVariant('chart')}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-all',
                viewVariant === 'chart'
                  ? 'bg-white dark:bg-card text-neutral-900 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              )}
            >
              <SquaresFour className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewVariant('table')}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-all',
                viewVariant === 'table'
                  ? 'bg-white dark:bg-card text-neutral-900 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              )}
            >
              <ListBullets className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="p-4 rounded-xl bg-success text-white">
          <div className="flex items-center gap-2 mb-2">
            <ArrowsInSimple className="w-5 h-5 text-success" />
            <span className="text-sm font-medium text-success">{t('inmobiliaria.finance.cashFlow.totalIncome')}</span>
          </div>
          <p className="text-xl font-bold truncate">{formatCurrency(data.totals.totalIngresos)}</p>
        </div>

        {/* Total Dispersiones */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <ArrowsOutSimple className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('inmobiliaria.finance.cashFlow.disbursements')}
            </span>
          </div>
          <p className="text-xl font-bold text-neutral-700 dark:text-neutral-300 truncate">
            {formatCurrency(data.totals.totalDispersiones)}
          </p>
        </div>

        {/* Total Comisiones */}
        <div className="p-4 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary-soft">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollar className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t('inmobiliaria.finance.cashFlow.commissions')}
            </span>
          </div>
          <p className="text-xl font-bold text-primary truncate">
            {formatCurrency(data.totals.totalComisiones)}
          </p>
        </div>

        {/* Balance Neto */}
        <div
          className={cn(
            'p-4 rounded-xl border',
            data.totals.netBalance >= 0
              ? 'border-success/30 dark:border-success/40 bg-success-soft'
              : 'border-danger/30 dark:border-danger/40 bg-danger-soft'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {data.totals.netBalance >= 0 ? (
              <TrendUp className="w-5 h-5 text-success" />
            ) : (
              <TrendDown className="w-5 h-5 text-danger" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                data.totals.netBalance >= 0
                  ? 'text-success'
                  : 'text-danger'
              )}
            >
              {t('inmobiliaria.finance.cashFlow.netBalance')}
            </span>
          </div>
          <p
            className={cn(
              'text-xl font-bold truncate',
              data.totals.netBalance >= 0
                ? 'text-success'
                : 'text-danger'
            )}
          >
            {formatCurrency(data.totals.netBalance)}
          </p>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 mt-2 text-xs font-medium',
                trend.type === 'up' && 'text-success',
                trend.type === 'down' && 'text-danger'
              )}
            >
              {trend.type === 'up' ? (
                <TrendUp className="w-3 h-3" weight="bold" />
              ) : (
                <TrendDown className="w-3 h-3" weight="bold" />
              )}
              {trend.percent}% {t('inmobiliaria.finance.cashFlow.vsPrevMonth')}
            </div>
          )}
        </div>
      </div>

      {/* Chart or Table */}
      <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-card">
        {viewVariant === 'chart' ? (
          <BarChart data={data.months} locale={locale} t={t} />
        ) : (
          <TableView data={data.months} locale={locale} t={t} />
        )}
      </div>
    </div>
  );
}

export default FlujoCajaChart;
