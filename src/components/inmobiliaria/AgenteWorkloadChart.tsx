'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBar,
  Buildings,
  Warning,
  CheckCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Agente } from '@/lib/types/inmobiliaria';

interface AgenteWorkloadChartProps {
  agentes: Agente[];
  className?: string;
}

// Recommended max properties per agent
const RECOMMENDED_MAX = 8;
// Overloaded threshold
const OVERLOADED_THRESHOLD = 10;

/**
 * Get workload status based on property count
 */
type WorkloadLevel = 'low' | 'optimal' | 'high' | 'overloaded';

function getWorkloadLevel(count: number): { level: WorkloadLevel; color: string } {
  if (count <= 5) {
    return { level: 'low', color: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (count <= RECOMMENDED_MAX) {
    return { level: 'optimal', color: 'text-indigo-600 dark:text-indigo-400' };
  }
  if (count <= OVERLOADED_THRESHOLD) {
    return { level: 'high', color: 'text-amber-600 dark:text-amber-400' };
  }
  return { level: 'overloaded', color: 'text-red-600 dark:text-red-400' };
}

/**
 * AgenteWorkloadChart - Horizontal bar chart showing workload distribution
 * Clean design following design token system
 */
export function AgenteWorkloadChart({ agentes, className }: AgenteWorkloadChartProps) {
  const { t } = useI18n();
  // Filter to active agentes and sort by workload (highest first)
  const sortedAgentes = useMemo(() => {
    return [...agentes]
      .filter((a) => a.status === 'active')
      .sort((a, b) => b.assignedPropertyIds.length - a.assignedPropertyIds.length);
  }, [agentes]);

  // Calculate stats
  const stats = useMemo(() => {
    if (sortedAgentes.length === 0) {
      return { max: 0, avg: 0, total: 0, overloaded: 0 };
    }

    const properties = sortedAgentes.map((a) => a.assignedPropertyIds.length);
    const total = properties.reduce((sum, p) => sum + p, 0);
    const max = Math.max(...properties);
    const avg = total / sortedAgentes.length;
    const overloaded = sortedAgentes.filter(
      (a) => a.assignedPropertyIds.length > OVERLOADED_THRESHOLD
    ).length;

    return { max, avg, total, overloaded };
  }, [sortedAgentes]);

  // Get max for scaling (at least OVERLOADED_THRESHOLD for consistent scale)
  const scaleMax = Math.max(stats.max, OVERLOADED_THRESHOLD);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden', className)}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <ChartBar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="fill" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t('inmobiliaria.agente.workload')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('inmobiliaria.agente.workloadDescription')}
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          {sortedAgentes.length > 0 && (
            <div className="flex items-center gap-2">
              {stats.overloaded > 0 ? (
                <>
                  <Warning className="w-4 h-4 text-amber-500" weight="fill" />
                  <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                    {stats.overloaded} {t('inmobiliaria.agente.overloaded')}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    {t('inmobiliaria.agente.balanced')}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-5 py-3 border-b border-border bg-muted/10 grid grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.agente.agentsLabel')}</p>
          <p className="text-lg font-bold text-foreground">{sortedAgentes.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.agente.propertiesLabel')}</p>
          <p className="text-lg font-bold text-foreground">{stats.total}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.agente.averageLabel')}</p>
          <p className="text-lg font-bold text-foreground">{stats.avg.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('inmobiliaria.agente.recommendedMax')}</p>
          <p className="text-lg font-bold text-foreground">{RECOMMENDED_MAX}</p>
        </div>
      </div>

      {/* Chart */}
      <div>
        {sortedAgentes.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="divide-y divide-border"
          >
            {sortedAgentes.map((agente, index) => {
              const propertyCount = agente.assignedPropertyIds.length;
              const percentage = scaleMax > 0 ? (propertyCount / scaleMax) * 100 : 0;
              const { level, color } = getWorkloadLevel(propertyCount);
              const workloadLabels: Record<WorkloadLevel, string> = {
                low: t('inmobiliaria.agente.workloadLow'),
                optimal: t('inmobiliaria.agente.workloadOptimal'),
                high: t('inmobiliaria.agente.workloadHigh'),
                overloaded: t('inmobiliaria.agente.workloadOverloaded'),
              };

              return (
                <motion.div
                  key={agente.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4 mb-2">
                    {/* Avatar */}
                    {agente.avatar ? (
                      <img
                        src={agente.avatar}
                        alt={agente.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {getInitials(agente.name)}
                        </span>
                      </div>
                    )}

                    {/* Name and Zone */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {agente.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {agente.zone || t('inmobiliaria.agente.allZones')}
                      </p>
                    </div>

                    {/* Property Count */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Buildings className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold text-sm text-foreground tabular-nums">
                        {propertyCount}
                      </span>
                      <span className={cn('text-xs font-medium', color)}>
                        {workloadLabels[level]}
                      </span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    {/* Recommended Max Line */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-border z-10"
                      style={{ left: `${(RECOMMENDED_MAX / scaleMax) * 100}%` }}
                    />

                    {/* Progress Bar */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
                      className={cn(
                        'h-full rounded-full',
                        propertyCount > OVERLOADED_THRESHOLD
                          ? 'bg-red-500'
                          : propertyCount > RECOMMENDED_MAX
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      )}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="px-5 py-12 text-center">
            <ChartBar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {t('inmobiliaria.agente.noActiveAgentsToShow')}
            </p>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/10 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span className="text-muted-foreground">{t('inmobiliaria.agente.legendNormal')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">{t('inmobiliaria.agente.legendHigh')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-muted-foreground">{t('inmobiliaria.agente.legendOverloaded')}</span>
        </div>
      </div>
    </div>
  );
}

export default AgenteWorkloadChart;
