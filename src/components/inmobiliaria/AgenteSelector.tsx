'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Buildings,
  Star,
  Briefcase,
  MapPin,
  ChartLineUp,
  Percent,
  CaretDown,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Agente } from '@/lib/types/inmobiliaria';

interface AgenteSelectorProps {
  agentes: Agente[];
  value: string | null;
  onChange: (id: string | null) => void;
  className?: string;
  allowNoAgent?: boolean;
}

type SortOption = 'recommended' | 'name' | 'workload' | 'performance';

// Role and specialization labels moved inside component for i18n

/**
 * AgenteSelector - Selector for assigning an agent to a consignment
 * Used in ConsignacionWizard Step 4
 */
export function AgenteSelector({
  agentes,
  value,
  onChange,
  className,
  allowNoAgent = true,
}: AgenteSelectorProps) {
  const { t } = useI18n();
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  const ROLE_LABELS: Record<Agente['role'], string> = {
    agent: t('inmobiliaria.agente.roleAgent'),
    coordinator: t('inmobiliaria.agente.roleCoordinator'),
    director: t('inmobiliaria.agente.roleDirector'),
  };

  const SPECIALIZATION_LABELS: Record<NonNullable<Agente['specialization']>, string> = {
    residential: t('inmobiliaria.agente.specResidential'),
    commercial: t('inmobiliaria.agente.specCommercial'),
    both: t('inmobiliaria.agente.specMixed'),
  };

  // Get unique zones for filter
  const zones = useMemo(() => {
    const uniqueZones = new Set<string>();
    agentes.forEach((a) => {
      if (a.zone) uniqueZones.add(a.zone);
    });
    return Array.from(uniqueZones).sort();
  }, [agentes]);

  // Filter to only active agents
  const activeAgentes = useMemo(() => {
    return agentes.filter((a) => a.status === 'active');
  }, [agentes]);

  // Filter by zone
  const filteredAgentes = useMemo(() => {
    if (zoneFilter === 'all') return activeAgentes;
    return activeAgentes.filter((a) => a.zone === zoneFilter);
  }, [activeAgentes, zoneFilter]);

  // Sort agentes
  const sortedAgentes = useMemo(() => {
    const sorted = [...filteredAgentes];

    switch (sortBy) {
      case 'recommended':
        // Sort by workload (lowest first) then by conversion rate (highest first)
        sorted.sort((a, b) => {
          const workloadDiff = a.assignedPropertyIds.length - b.assignedPropertyIds.length;
          if (workloadDiff !== 0) return workloadDiff;
          return b.metrics.conversionRate - a.metrics.conversionRate;
        });
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'workload':
        sorted.sort((a, b) => a.assignedPropertyIds.length - b.assignedPropertyIds.length);
        break;
      case 'performance':
        sorted.sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate);
        break;
    }

    return sorted;
  }, [filteredAgentes, sortBy]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // Determine if agent is recommended (lowest workload among sorted)
  const isRecommended = (agenteId: string) => {
    if (sortBy !== 'recommended') return false;
    return sortedAgentes[0]?.id === agenteId;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Zone Filter */}
        <div className="relative">
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">{t('inmobiliaria.agente.allZones')}</option>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <CaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>

        {/* Sort Selector */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none pl-4 pr-8 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="recommended">{t('inmobiliaria.agente.sortRecommended')}</option>
            <option value="name">{t('inmobiliaria.agente.sortByName')}</option>
            <option value="workload">{t('inmobiliaria.agente.sortLeastWorkload')}</option>
            <option value="performance">{t('inmobiliaria.agente.sortBestPerformance')}</option>
          </select>
          <CaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>

        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {filteredAgentes.length === 1
            ? t('inmobiliaria.agente.availableAgentSingular')
            : t('inmobiliaria.agente.availableAgentsPlural', { count: String(filteredAgentes.length) })}
        </span>
      </div>

      {/* Agents Grid */}
      {sortedAgentes.length > 0 || allowNoAgent ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* No Agent Option */}
          {allowNoAgent && (
            <motion.button
              onClick={() => onChange(null)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'relative p-4 rounded-xl border text-left transition-all duration-200',
                value === null
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md'
              )}
            >
              {/* Selected Indicator */}
              {value === null && (
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </motion.svg>
                </div>
              )}

              {/* No Agent Content */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">
                    {t('inmobiliaria.agente.noAgentAssigned')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('inmobiliaria.agente.noAgentAssignedDesc')}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {t('inmobiliaria.agente.assignLater')}
              </p>
            </motion.button>
          )}

          {sortedAgentes.map((agente) => (
            <motion.button
              key={agente.id}
              onClick={() => onChange(agente.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'relative p-4 rounded-xl border text-left transition-all duration-200',
                value === agente.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md'
              )}
            >
              {/* Recommended Badge */}
              {isRecommended(agente.id) && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3" weight="fill" />
                  {t('inmobiliaria.agente.recommended')}
                </div>
              )}

              {/* Selected Indicator */}
              {value === agente.id && (
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </motion.svg>
                </div>
              )}

              {/* Agent Header */}
              <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
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

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-neutral-900 dark:text-white truncate text-sm">
                    {agente.name}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      agente.role === 'director'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : agente.role === 'coordinator'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    )}>
                      {ROLE_LABELS[agente.role]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Agent Details */}
              <div className="space-y-2 text-sm">
                {/* Zone */}
                {agente.zone && (
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <MapPin className="w-4 h-4 text-neutral-400" />
                    <span>{agente.zone}</span>
                    {agente.specialization && (
                      <span className="text-neutral-400">
                        · {SPECIALIZATION_LABELS[agente.specialization]}
                      </span>
                    )}
                  </div>
                )}

                {/* Workload */}
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                  <Briefcase className="w-4 h-4 text-neutral-400" />
                  <span>
                    {agente.assignedPropertyIds.length === 1
                      ? t('inmobiliaria.agente.assignedPropertySingular')
                      : t('inmobiliaria.agente.assignedPropertiesPlural', { count: String(agente.assignedPropertyIds.length) })}
                  </span>
                </div>

                {/* Metrics Row */}
                <div className="flex items-center gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  {/* Commission Split */}
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-emerald-500" />
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {agente.commissionSplit}%
                    </span>
                  </div>

                  {/* Conversion Rate */}
                  <div className="flex items-center gap-1.5">
                    <ChartLineUp className="w-4 h-4 text-blue-500" />
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {Math.round(agente.metrics.conversionRate * 100)}%
                    </span>
                  </div>

                  {/* Closed This Month */}
                  <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                    <span>{agente.metrics.closedThisMonth} {t('inmobiliaria.agente.closedPerMonth')}</span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141416]">
          <User className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-500 dark:text-neutral-400">
            {zoneFilter !== 'all'
              ? t('inmobiliaria.agente.noAgentsInZone')
              : t('inmobiliaria.agente.noActiveAgentsAvailable')}
          </p>
        </div>
      )}

      {/* Selected Confirmation */}
      {(value !== undefined) && (
        <p className={cn(
          "text-sm flex items-center gap-2",
          value === null
            ? "text-muted-foreground"
            : "text-emerald-600 dark:text-emerald-400"
        )}>
          <span className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center",
            value === null
              ? "bg-muted"
              : "bg-emerald-100 dark:bg-emerald-900/30"
          )}>
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          </span>
          {value === null
            ? t('inmobiliaria.agente.noAgentAssigned')
            : t('inmobiliaria.agente.agentAssigned', { name: activeAgentes.find((a) => a.id === value)?.name || '' })
          }
        </p>
      )}
    </div>
  );
}

export default AgenteSelector;
