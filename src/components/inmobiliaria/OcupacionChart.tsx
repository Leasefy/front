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
import { SegmentedControl } from '@leasefy/cadence';
import { Badge } from '@/components/ui/badge';
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
          className="text-white dark:text-fg"
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
            <stop offset="0%" stopColor="#1A40FF" />
            <stop offset="100%" stopColor="#7B95FF" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-fg dark:text-white">
          {Math.round(percentage)}%
        </span>
        <span className="text-sm text-fg-muted dark:text-fg-subtle">{label}</span>
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
        <span className="text-sm font-medium text-fg dark:text-white">{zone.zone}</span>
        <span className="text-sm text-fg-muted dark:text-fg-subtle">
          {Math.round(zone.occupancyRate)}% {t('inmobiliaria.finance.occupancy.occupied')}
        </span>
      </div>
      <div className="h-3 rounded-full bg-surface-muted dark:bg-ink overflow-hidden flex">
        {occupiedPercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${occupiedPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="bg-success dark:bg-success h-full"
          />
        )}
        {inProcessPercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${inProcessPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="bg-primary dark:bg-primary h-full"
          />
        )}
        {availablePercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${availablePercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
            className="bg-muted dark:bg-ink h-full"
          />
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-fg-muted dark:text-fg-subtle">
        <span>
          <span className="font-medium text-success">{zone.occupied}</span>{' '}
          {t('inmobiliaria.finance.occupancy.occupiedPlural')}
        </span>
        <span>
          <span className="font-medium text-primary">{zone.inProcess}</span>{' '}
          {t('inmobiliaria.finance.occupancy.inProcess')}
        </span>
        <span>
          <span className="font-medium text-fg-muted dark:text-fg-subtle">{zone.available}</span>{' '}
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
      className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-bg"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-fg dark:text-white">{zone.zone}</h4>
        <span
          className={cn(
            'text-lg font-bold',
            zone.occupancyRate >= 80
              ? 'text-success'
              : zone.occupancyRate >= 60
              ? 'text-warning'
              : 'text-danger'
          )}
        >
          {Math.round(zone.occupancyRate)}%
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="h-2 rounded-full bg-surface-muted dark:bg-ink overflow-hidden flex mb-3">
        <div
          className="bg-success dark:bg-success h-full"
          style={{ width: `${(zone.occupied / zone.totalProperties) * 100}%` }}
        />
        <div
          className="bg-primary dark:bg-primary h-full"
          style={{ width: `${(zone.inProcess / zone.totalProperties) * 100}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="font-bold text-success">{zone.occupied}</p>
          <p className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.occupiedPlural')}</p>
        </div>
        <div>
          <p className="font-bold text-primary">{zone.inProcess}</p>
          <p className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.inProcess')}</p>
        </div>
        <div>
          <p className="font-bold text-fg-muted dark:text-fg-subtle">{zone.available}</p>
          <p className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.available')}</p>
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
          <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center">
            <ChartPie className="w-5 h-5 text-success" weight="fill" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">
              {t('inmobiliaria.finance.occupancy.occupancyByZone')}
            </h2>
            <p className="text-sm text-fg-muted">
              {t('inmobiliaria.finance.occupancy.portfolioDistribution')}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <SegmentedControl<'chart' | 'cards'>
          value={viewVariant}
          onChange={setViewVariant}
          options={[
            {
              value: 'chart',
              ariaLabel: t('inmobiliaria.finance.occupancy.bars'),
              label: (
                <span className="flex items-center gap-2">
                  <ListBullets className="w-4 h-4" />
                  {t('inmobiliaria.finance.occupancy.bars')}
                </span>
              ),
            },
            {
              value: 'cards',
              ariaLabel: t('inmobiliaria.finance.occupancy.cards'),
              label: (
                <span className="flex items-center gap-2">
                  <SquaresFour className="w-4 h-4" />
                  {t('inmobiliaria.finance.occupancy.cards')}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-bg">
          <DonutChart percentage={data.overallOccupancyRate} label={t('inmobiliaria.finance.occupancy.occupancy')} />

          {/* Trend indicator */}
          {trend && (
            <Badge
              variant={trend.type === 'up' ? 'success' : trend.type === 'down' ? 'destructive' : 'secondary'}
              className="mt-4 gap-2 px-3 py-1.5 text-sm"
            >
              {trend.type === 'up' && <TrendUp className="w-4 h-4" weight="bold" />}
              {trend.type === 'down' && <TrendDown className="w-4 h-4" weight="bold" />}
              {trend.type === 'stable' && <Minus className="w-4 h-4" weight="bold" />}
              {trend.type === 'up' && `+${trend.diff}% ${t('inmobiliaria.finance.occupancy.vsPrevMonth')}`}
              {trend.type === 'down' && `-${trend.diff}% ${t('inmobiliaria.finance.occupancy.vsPrevMonth')}`}
              {trend.type === 'stable' && t('inmobiliaria.finance.occupancy.noChange')}
            </Badge>
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="text-center">
              <p className="font-bold text-success">{data.totalOccupied}</p>
              <p className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.occupiedPlural')}</p>
            </div>
            <div className="w-px h-8 bg-surface-muted dark:bg-ink" />
            <div className="text-center">
              <p className="font-bold text-fg dark:text-white">{data.totalProperties}</p>
              <p className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.total')}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-bg">
            <div className="w-10 h-10 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center mb-3">
              <Buildings className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
            </div>
            <p className="text-2xl font-bold text-fg dark:text-white">{data.totalProperties}</p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.totalProperties')}</p>
          </div>

          <div className="p-4 rounded-xl border border-success/30 bg-success-soft">
            <div className="w-10 h-10 rounded-md bg-success-soft flex items-center justify-center mb-3">
              <HouseLine className="w-5 h-5 text-success" weight="fill" />
            </div>
            <p className="text-2xl font-bold text-success">{data.totalOccupied}</p>
            <p className="text-sm text-success">{t('inmobiliaria.finance.occupancy.occupiedPlural')}</p>
          </div>

          <div className="p-4 rounded-xl border border-primary/30 bg-primary-soft">
            <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center mb-3">
              <Hourglass className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{data.totalInProcess}</p>
            <p className="text-sm text-primary">{t('inmobiliaria.finance.occupancy.inProcess')}</p>
          </div>

          <div className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface-muted">
            <div className="w-10 h-10 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center mb-3">
              <Buildings className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
            </div>
            <p className="text-2xl font-bold text-fg dark:text-fg-subtle">{data.totalAvailable}</p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.available')}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-success dark:bg-success" />
          <span className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.occupied')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary dark:bg-primary" />
          <span className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.inProcess')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-muted dark:bg-ink" />
          <span className="text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.finance.occupancy.available')}</span>
        </div>
      </div>

      {/* Zone Breakdown */}
      {viewVariant === 'chart' ? (
        <div className="space-y-6 p-6 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-bg">
          <h3 className="font-semibold text-fg dark:text-white">{t('inmobiliaria.finance.occupancy.breakdownByZone')}</h3>
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
