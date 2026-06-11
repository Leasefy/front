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
          <div className="w-10 h-10 rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/15 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" weight="fill" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.agente.agentRanking')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.agente.topPerformers')}
            </p>
          </div>
        </div>

        {/* Time Range Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 w-fit">
          <button
            onClick={() => setTimeRange('month')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
              timeRange === 'month'
                ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            <CalendarBlank className="w-4 h-4" />
            {t('inmobiliaria.agente.thisMonth')}
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
              timeRange === 'year'
                ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
          >
            <Calendar className="w-4 h-4" />
            {t('inmobiliaria.agente.thisYear')}
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
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
                    'grid grid-cols-12 gap-4 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer transition-all duration-200',
                    isFirst && 'bg-[#F8F0E0]/50 dark:bg-[#B7791F]/10',
                    !isFirst && 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  )}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center justify-center">
                    {isTopThree ? (
                      <span className="text-xl" role="img" aria-label={`Puesto ${rank}`}>
                        {MEDALS[rank - 1]}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Agent */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
                      isFirst
                        ? 'bg-[#F8F0E0] dark:bg-[#B7791F]/12'
                        : 'bg-gradient-to-br from-[#1A40FF] to-[#6B6B6B]'
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
                          ? 'text-[#B7791F] dark:text-[#D2992F]'
                          : 'text-neutral-900 dark:text-white'
                      )}>
                        {agente.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {agente.zone || t('inmobiliaria.agente.noZone')}
                      </p>
                    </div>
                  </div>

                  {/* Closings */}
                  <div className="col-span-2 flex items-center justify-center">
                    <span className={cn(
                      'text-lg font-bold',
                      closings > 0
                        ? 'text-[#2C7A53] dark:text-[#3EAE70]'
                        : 'text-neutral-400 dark:text-neutral-500'
                    )}>
                      {closings}
                    </span>
                  </div>

                  {/* Commissions */}
                  <div className="col-span-3 flex items-center justify-end">
                    <div className="flex items-center gap-1.5">
                      <CurrencyDollar className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(commissions)}
                      </span>
                    </div>
                  </div>

                  {/* Conversion Rate */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className={cn(
                      'text-sm font-medium',
                      agente.metrics.conversionRate >= 0.6
                        ? 'text-[#2C7A53] dark:text-[#3EAE70]'
                        : agente.metrics.conversionRate >= 0.4
                          ? 'text-[#B7791F] dark:text-[#D2992F]'
                          : 'text-neutral-500 dark:text-neutral-400'
                    )}>
                      {Math.round(agente.metrics.conversionRate * 100)}%
                    </span>
                  </div>

                  {/* Trend */}
                  <div className="col-span-1 flex items-center justify-center">
                    {trend === 'up' && (
                      <div className="w-6 h-6 rounded-full bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
                        <TrendUp className="w-3.5 h-3.5 text-[#2C7A53] dark:text-[#3EAE70]" weight="bold" />
                      </div>
                    )}
                    {trend === 'down' && (
                      <div className="w-6 h-6 rounded-full bg-[#F8EAE7] dark:bg-[#C4503B]/15 flex items-center justify-center">
                        <TrendDown className="w-3.5 h-3.5 text-[#C4503B] dark:text-[#E0664D]" weight="bold" />
                      </div>
                    )}
                    {trend === 'stable' && (
                      <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <Minus className="w-3.5 h-3.5 text-neutral-400" weight="bold" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="px-4 py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-neutral-500 dark:text-neutral-400">
                {t('inmobiliaria.agente.noActiveAgents')}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Summary Stats */}
      {rankedAgentes.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              {t('inmobiliaria.agente.totalClosings')} {timeRange === 'month' ? t('inmobiliaria.agente.monthLabel') : t('inmobiliaria.agente.yearLabel')}
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {rankedAgentes.reduce(
                (sum, a) =>
                  sum + (timeRange === 'month' ? a.metrics.closedThisMonth : a.metrics.closedThisYear),
                0
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              {t('inmobiliaria.agente.totalCommissions')}
            </p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white truncate">
              {formatCurrency(
                rankedAgentes.reduce(
                  (sum, a) =>
                    sum + (timeRange === 'month' ? a.metrics.commissionsThisMonth : a.metrics.totalCommissions),
                  0
                )
              )}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              {t('inmobiliaria.agente.avgConversion')}
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
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
