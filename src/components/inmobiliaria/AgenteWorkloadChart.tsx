'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBar,
  Buildings,
  Warning,
  CheckCircle,
  Info,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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
 * Get workload color based on property count
 */
function getWorkloadColor(count: number): {
  bar: string;
  bg: string;
  text: string;
  label: string;
} {
  if (count <= 5) {
    return {
      bar: 'bg-emerald-500 dark:bg-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      label: 'Baja',
    };
  }
  if (count <= RECOMMENDED_MAX) {
    return {
      bar: 'bg-blue-500 dark:bg-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      label: 'Optima',
    };
  }
  if (count <= OVERLOADED_THRESHOLD) {
    return {
      bar: 'bg-amber-500 dark:bg-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'Alta',
    };
  }
  return {
    bar: 'bg-rose-500 dark:bg-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-600 dark:text-rose-400',
    label: 'Sobrecargado',
  };
}

/**
 * AgenteWorkloadChart - Horizontal bar chart showing workload distribution
 * Pure CSS implementation without charting libraries
 */
export function AgenteWorkloadChart({ agentes, className }: AgenteWorkloadChartProps) {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const barVariants = {
    hidden: { width: 0, opacity: 0 },
    visible: { width: '100%', opacity: 1 },
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <ChartBar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="fill" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Carga de Trabajo
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Distribucion de propiedades por agente
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-neutral-600 dark:text-neutral-400">Baja (0-5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-neutral-600 dark:text-neutral-400">Optima (6-8)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-neutral-600 dark:text-neutral-400">Alta (9-10)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-500" />
            <span className="text-neutral-600 dark:text-neutral-400">Sobrecargado (+10)</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Agentes Activos</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">{sortedAgentes.length}</p>
        </div>
        <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Propiedades</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Promedio</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">{stats.avg.toFixed(1)}</p>
        </div>
        <div className={cn(
          'p-3 rounded-xl border',
          stats.overloaded > 0
            ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]'
        )}>
          <p className={cn(
            'text-xs',
            stats.overloaded > 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-neutral-500 dark:text-neutral-400'
          )}>
            Sobrecargados
          </p>
          <p className={cn(
            'text-xl font-bold',
            stats.overloaded > 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-neutral-900 dark:text-white'
          )}>
            {stats.overloaded}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="divide-y divide-neutral-100 dark:divide-neutral-800"
        >
          {sortedAgentes.length > 0 ? (
            sortedAgentes.map((agente) => {
              const propertyCount = agente.assignedPropertyIds.length;
              const percentage = scaleMax > 0 ? (propertyCount / scaleMax) * 100 : 0;
              const colors = getWorkloadColor(propertyCount);

              return (
                <div
                  key={agente.id}
                  className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4 mb-2">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
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

                    {/* Name and Zone */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-white text-sm truncate">
                        {agente.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {agente.zone || 'Sin zona asignada'}
                      </p>
                    </div>

                    {/* Property Count */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Buildings className="w-4 h-4 text-neutral-400" />
                      <span className={cn('font-bold text-sm', colors.text)}>
                        {propertyCount}
                      </span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        colors.bg,
                        colors.text
                      )}>
                        {colors.label}
                      </span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="relative h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    {/* Recommended Max Line */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-neutral-300 dark:bg-neutral-600 z-10"
                      style={{ left: `${(RECOMMENDED_MAX / scaleMax) * 100}%` }}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-neutral-400">
                        Max recomendado
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <motion.div
                      variants={barVariants}
                      className={cn('h-full rounded-full', colors.bar)}
                      style={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-12 text-center">
              <ChartBar className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <p className="text-neutral-500 dark:text-neutral-400">
                No hay agentes activos para mostrar
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recommendations */}
      {stats.overloaded > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <Warning className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400 text-sm">
              {stats.overloaded} agente{stats.overloaded > 1 ? 's' : ''} con carga alta
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              Considera redistribuir propiedades para mejorar el servicio al cliente.
              La carga optima es de 6-8 propiedades por agente.
            </p>
          </div>
        </div>
      )}

      {stats.overloaded === 0 && sortedAgentes.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" weight="fill" />
          <div>
            <p className="font-medium text-emerald-700 dark:text-emerald-400 text-sm">
              Carga de trabajo balanceada
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
              Todos los agentes tienen una carga de trabajo dentro del rango optimo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgenteWorkloadChart;
