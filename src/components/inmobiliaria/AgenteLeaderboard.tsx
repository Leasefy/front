'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  TrendUp,
  TrendDown,
  Minus,
  ChartLineUp,
  CurrencyDollar,
  Calendar,
  CalendarBlank,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SegmentedControl } from '@leasefy/cadence';
import type { Agente } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

interface AgenteLeaderboardProps {
  agentes: Agente[];
  className?: string;
}

type TimeRange = 'month' | 'year';

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Generate a mock trend based on agente performance
 * In production, this would compare against previous period
 */
function getMockTrend(agente: Agente): 'up' | 'down' | 'stable' {
  // Use conversion rate as a stable factor for mock trends
  if (agente.metrics.conversionRate >= 0.6) return 'up';
  if (agente.metrics.conversionRate <= 0.45) return 'down';
  return 'stable';
}

/**
 * AgenteLeaderboard - Ranked table of agentes by performance
 * Shows top performers with medals and trend indicators
 */
export function AgenteLeaderboard({ agentes, className }: AgenteLeaderboardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Filter to active agentes and sort by performance
  const rankedAgentes = useMemo(() => {
    const active = agentes.filter((a) => a.status === 'active');

    // Sort by closedThisMonth or closedThisYear
    const sorted = [...active].sort((a, b) => {
      const metricA = timeRange === 'month' ? a.metrics.closedThisMonth : a.metrics.closedThisYear;
      const metricB = timeRange === 'month' ? b.metrics.closedThisMonth : b.metrics.closedThisYear;

      // Primary: closings
      if (metricB !== metricA) return metricB - metricA;

      // Secondary: commissions
      const commA = timeRange === 'month' ? a.metrics.commissionsThisMonth : a.metrics.totalCommissions;
      const commB = timeRange === 'month' ? b.metrics.commissionsThisMonth : b.metrics.totalCommissions;
      if (commB !== commA) return commB - commA;

      // Tertiary: conversion rate
      return b.metrics.conversionRate - a.metrics.conversionRate;
    });

    return sorted;
  }, [agentes, timeRange]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleRowClick = (agenteId: string) => {
    router.push(`/panel/inmobiliaria/agentes/${agenteId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning-soft flex items-center justify-center">
            <Trophy className="w-5 h-5 text-warning" weight="fill" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-fg dark:text-white">
              {t('inmobiliaria.agente.agentRanking')}
            </h2>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.agente.topPerformers')}
            </p>
          </div>
        </div>

        {/* Time Range Toggle */}
        <SegmentedControl<TimeRange>
          aria-label={t('inmobiliaria.agente.thisMonth')}
          value={timeRange}
          onChange={setTimeRange}
          size="sm"
          options={[
            {
              value: 'month',
              ariaLabel: t('inmobiliaria.agente.thisMonth'),
              label: (
                <span className="inline-flex items-center gap-2">
                  <CalendarBlank className="w-4 h-4" />
                  {t('inmobiliaria.agente.thisMonth')}
                </span>
              ),
            },
            {
              value: 'year',
              ariaLabel: t('inmobiliaria.agente.thisYear'),
              label: (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('inmobiliaria.agente.thisYear')}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-surface-muted border-b border-border dark:border-border-strong text-xs font-medium text-fg-muted dark:text-fg-subtle uppercase tracking-wide">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4">{t('inmobiliaria.agente.agentLabel')}</div>
          <div className="col-span-2 text-center">
            <span className="hidden sm:inline">{t('inmobiliaria.agente.closings')}</span>
            <ChartLineUp className="sm:hidden w-4 h-4 mx-auto" />
          </div>
          <div className="col-span-3 text-right">{t('inmobiliaria.agente.commissions')}</div>
          <div className="col-span-1 text-center">
            <span className="hidden sm:inline">Conv.</span>
            <span className="sm:hidden">%</span>
          </div>
          <div className="col-span-1 text-center">Trend</div>
        </div>

        {/* Table Body */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {rankedAgentes.length > 0 ? (
            rankedAgentes.map((agente, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;
              const isFirst = rank === 1;
              const trend = getMockTrend(agente);

              const closings = timeRange === 'month'
                ? agente.metrics.closedThisMonth
                : agente.metrics.closedThisYear;

              const commissions = timeRange === 'month'
                ? agente.metrics.commissionsThisMonth
                : agente.metrics.totalCommissions;

              return (
                <motion.div
                  key={agente.id}
                  variants={rowVariants}
                  onClick={() => handleRowClick(agente.id)}
                  className={cn(
                    'grid grid-cols-12 gap-4 px-4 py-3 border-b border-border-faint dark:border-border-strong cursor-pointer transition-all duration-200',
                    isFirst && 'bg-warning-soft/50 dark:bg-warning/10',
                    !isFirst && 'hover:bg-surface-muted dark:hover:bg-ink'
                  )}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center justify-center">
                    {isTopThree ? (
                      <span className="text-xl" role="img" aria-label={`Puesto ${rank}`}>
                        {MEDALS[rank - 1]}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-fg-subtle dark:text-fg-muted">
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Agent */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
                      isFirst
                        ? 'bg-warning-soft'
                        : 'bg-gradient-to-br from-primary to-fg-muted'
                    )}>
                      {agente.avatar ? (
                        <img
                          src={agente.avatar}
                          alt={agente.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(agente.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        'font-medium truncate text-sm',
                        isFirst
                          ? 'text-warning'
                          : 'text-fg dark:text-white'
                      )}>
                        {agente.name}
                      </p>
                      <p className="text-xs text-fg-muted dark:text-fg-subtle truncate">
                        {agente.zone || t('inmobiliaria.agente.noZone')}
                      </p>
                    </div>
                  </div>

                  {/* Closings */}
                  <div className="col-span-2 flex items-center justify-center">
                    <span className={cn(
                      'text-lg font-bold',
                      closings > 0
                        ? 'text-success'
                        : 'text-fg-subtle dark:text-fg-muted'
                    )}>
                      {closings}
                    </span>
                  </div>

                  {/* Commissions */}
                  <div className="col-span-3 flex items-center justify-end">
                    <div className="flex items-center gap-1.5">
                      <CurrencyDollar className="w-4 h-4 text-fg-subtle" />
                      <span className="text-sm font-medium text-fg dark:text-fg-subtle">
                        {formatCurrency(commissions)}
                      </span>
                    </div>
                  </div>

                  {/* Conversion Rate */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className={cn(
                      'text-sm font-medium',
                      agente.metrics.conversionRate >= 0.6
                        ? 'text-success'
                        : agente.metrics.conversionRate >= 0.4
                          ? 'text-warning'
                          : 'text-fg-muted dark:text-fg-subtle'
                    )}>
                      {Math.round(agente.metrics.conversionRate * 100)}%
                    </span>
                  </div>

                  {/* Trend */}
                  <div className="col-span-1 flex items-center justify-center">
                    {trend === 'up' && (
                      <div className="w-6 h-6 rounded-full bg-success-soft flex items-center justify-center">
                        <TrendUp className="w-3.5 h-3.5 text-success" weight="bold" />
                      </div>
                    )}
                    {trend === 'down' && (
                      <div className="w-6 h-6 rounded-full bg-danger-soft flex items-center justify-center">
                        <TrendDown className="w-3.5 h-3.5 text-danger" weight="bold" />
                      </div>
                    )}
                    {trend === 'stable' && (
                      <div className="w-6 h-6 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center">
                        <Minus className="w-3.5 h-3.5 text-fg-subtle" weight="bold" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="px-4 py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-fg-subtle dark:text-fg-muted" />
              <p className="text-fg-muted dark:text-fg-subtle">
                {t('inmobiliaria.agente.noActiveAgents')}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Summary Stats */}
      {rankedAgentes.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
            <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">
              {t('inmobiliaria.agente.totalClosings')} {timeRange === 'month' ? t('inmobiliaria.agente.monthLabel') : t('inmobiliaria.agente.yearLabel')}
            </p>
            <p className="text-2xl font-bold text-fg dark:text-white">
              {rankedAgentes.reduce(
                (sum, a) =>
                  sum + (timeRange === 'month' ? a.metrics.closedThisMonth : a.metrics.closedThisYear),
                0
              )}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
            <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">
              {t('inmobiliaria.agente.totalCommissions')}
            </p>
            <p className="text-lg font-bold text-fg dark:text-white truncate">
              {formatCurrency(
                rankedAgentes.reduce(
                  (sum, a) =>
                    sum + (timeRange === 'month' ? a.metrics.commissionsThisMonth : a.metrics.totalCommissions),
                  0
                )
              )}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-bg">
            <p className="text-xs text-fg-muted dark:text-fg-subtle mb-1">
              {t('inmobiliaria.agente.avgConversion')}
            </p>
            <p className="text-2xl font-bold text-fg dark:text-white">
              {Math.round(
                (rankedAgentes.reduce((sum, a) => sum + a.metrics.conversionRate, 0) /
                  rankedAgentes.length) *
                  100
              )}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgenteLeaderboard;
