'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChartPie,
  Buildings,
  HouseLine,
  Hourglass,
  TrendUp,
  TrendDown,
  Minus,
  SquaresFour,
  ListBullets,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { OcupacionReport, OcupacionZone } from '@/lib/types/inmobiliaria';

interface OcupacionChartProps {
  data: OcupacionReport;
  variant?: 'chart' | 'cards';
  className?: string;
}

/**
 * CSS-only donut chart
 */
function DonutChart({
  percentage,
  size = 180,
  strokeWidth = 18,
  label,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-100 dark:text-neutral-800"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#occupancy-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="occupancy-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-neutral-900 dark:text-white">
          {Math.round(percentage)}%
        </span>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
      </div>
    </div>
  );
}

/**
 * Horizontal stacked bar for zone breakdown
 */
function ZoneBar({ zone, t }: { zone: OcupacionZone; t: (key: string) => string }) {
  const occupiedPercent = (zone.occupied / zone.totalProperties) * 100;
  const inProcessPercent = (zone.inProcess / zone.totalProperties) * 100;
  const availablePercent = (zone.available / zone.totalProperties) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-900 dark:text-white">{zone.zone}</span>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {Math.round(zone.occupancyRate)}% {t('inmobiliaria.finance.occupancy.occupied')}
        </span>
      </div>
      <div className="h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
        {occupiedPercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${occupiedPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="bg-emerald-500 dark:bg-emerald-400 h-full"
          />
        )}
        {inProcessPercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${inProcessPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="bg-blue-500 dark:bg-blue-400 h-full"
          />
        )}
        {availablePercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${availablePercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
            className="bg-neutral-300 dark:bg-neutral-600 h-full"
          />
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{zone.occupied}</span>{' '}
          {t('inmobiliaria.finance.occupancy.occupiedPlural')}
        </span>
        <span>
          <span className="font-medium text-blue-600 dark:text-blue-400">{zone.inProcess}</span>{' '}
          {t('inmobiliaria.finance.occupancy.inProcess')}
        </span>
        <span>
          <span className="font-medium text-neutral-600 dark:text-neutral-300">{zone.available}</span>{' '}
          {t('inmobiliaria.finance.occupancy.available')}
        </span>
      </div>
    </div>
  );
}

/**
 * Zone card for card view
 */
function ZoneCard({ zone, t }: { zone: OcupacionZone; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-neutral-900 dark:text-white">{zone.zone}</h4>
        <span
          className={cn(
            'text-lg font-bold',
            zone.occupancyRate >= 80
              ? 'text-emerald-600 dark:text-emerald-400'
              : zone.occupancyRate >= 60
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400'
          )}
        >
          {Math.round(zone.occupancyRate)}%
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex mb-3">
        <div
          className="bg-emerald-500 dark:bg-emerald-400 h-full"
          style={{ width: `${(zone.occupied / zone.totalProperties) * 100}%` }}
        />
        <div
          className="bg-blue-500 dark:bg-blue-400 h-full"
          style={{ width: `${(zone.inProcess / zone.totalProperties) * 100}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="font-bold text-emerald-600 dark:text-emerald-400">{zone.occupied}</p>
          <p className="text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.occupiedPlural')}</p>
        </div>
        <div>
          <p className="font-bold text-blue-600 dark:text-blue-400">{zone.inProcess}</p>
          <p className="text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.inProcess')}</p>
        </div>
        <div>
          <p className="font-bold text-neutral-600 dark:text-neutral-300">{zone.available}</p>
          <p className="text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.available')}</p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * OcupacionChart - Occupancy visualization by zone
 * Shows overall occupancy donut chart and zone breakdown
 */
export function OcupacionChart({ data, variant = 'chart', className }: OcupacionChartProps) {
  const { t } = useI18n();
  const [viewVariant, setViewVariant] = useState<'chart' | 'cards'>(variant);

  // Calculate trend
  const trend = useMemo(() => {
    if (!data.previousMonthOccupancyRate) return null;
    const diff = data.overallOccupancyRate - data.previousMonthOccupancyRate;
    if (diff > 2) return { type: 'up' as const, diff: Math.round(diff) };
    if (diff < -2) return { type: 'down' as const, diff: Math.round(Math.abs(diff)) };
    return { type: 'stable' as const, diff: 0 };
  }, [data.overallOccupancyRate, data.previousMonthOccupancyRate]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <ChartPie className="w-5 h-5 text-emerald-600 dark:text-emerald-400" weight="fill" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.finance.occupancy.occupancyByZone')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.finance.occupancy.portfolioDistribution')}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 w-fit">
          <button
            onClick={() => setViewVariant('chart')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              viewVariant === 'chart'
                ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            <ListBullets className="w-4 h-4" />
            {t('inmobiliaria.finance.occupancy.bars')}
          </button>
          <button
            onClick={() => setViewVariant('cards')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              viewVariant === 'cards'
                ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            <SquaresFour className="w-4 h-4" />
            {t('inmobiliaria.finance.occupancy.cards')}
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <DonutChart percentage={data.overallOccupancyRate} label={t('inmobiliaria.finance.occupancy.occupancy')} />

          {/* Trend indicator */}
          {trend && (
            <div
              className={cn(
                'flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full text-sm font-medium',
                trend.type === 'up' && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
                trend.type === 'down' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                trend.type === 'stable' && 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              )}
            >
              {trend.type === 'up' && <TrendUp className="w-4 h-4" weight="bold" />}
              {trend.type === 'down' && <TrendDown className="w-4 h-4" weight="bold" />}
              {trend.type === 'stable' && <Minus className="w-4 h-4" weight="bold" />}
              {trend.type === 'up' && `+${trend.diff}% ${t('inmobiliaria.finance.occupancy.vsPrevMonth')}`}
              {trend.type === 'down' && `-${trend.diff}% ${t('inmobiliaria.finance.occupancy.vsPrevMonth')}`}
              {trend.type === 'stable' && t('inmobiliaria.finance.occupancy.noChange')}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="text-center">
              <p className="font-bold text-emerald-600 dark:text-emerald-400">{data.totalOccupied}</p>
              <p className="text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.occupiedPlural')}</p>
            </div>
            <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />
            <div className="text-center">
              <p className="font-bold text-neutral-900 dark:text-white">{data.totalProperties}</p>
              <p className="text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.total')}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
              <Buildings className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{data.totalProperties}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.totalProperties')}</p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
              <HouseLine className="w-5 h-5 text-emerald-600 dark:text-emerald-400" weight="fill" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{data.totalOccupied}</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-500">{t('inmobiliaria.finance.occupancy.occupiedPlural')}</p>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-3">
              <Hourglass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{data.totalInProcess}</p>
            <p className="text-sm text-blue-600 dark:text-blue-500">{t('inmobiliaria.finance.occupancy.inProcess')}</p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center mb-3">
              <Buildings className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </div>
            <p className="text-2xl font-bold text-neutral-700 dark:text-neutral-300">{data.totalAvailable}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.available')}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          <span className="text-neutral-600 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.occupied')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400" />
          <span className="text-neutral-600 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.inProcess')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="text-neutral-600 dark:text-neutral-400">{t('inmobiliaria.finance.occupancy.available')}</span>
        </div>
      </div>

      {/* Zone Breakdown */}
      {viewVariant === 'chart' ? (
        <div className="space-y-6 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <h3 className="font-semibold text-neutral-900 dark:text-white">{t('inmobiliaria.finance.occupancy.breakdownByZone')}</h3>
          <div className="space-y-6">
            {data.zones.map((zone, index) => (
              <motion.div
                key={zone.zone}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ZoneBar zone={zone} t={t} />
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.zones.map((zone, index) => (
            <motion.div
              key={zone.zone}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ZoneCard zone={zone} t={t} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OcupacionChart;
