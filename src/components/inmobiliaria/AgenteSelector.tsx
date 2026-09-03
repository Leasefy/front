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
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitación',
    all: 'Todos',
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

  // Sin agentes activos no hay nada que filtrar ni que elegir: la grilla
  // quedaba con una sola tarjeta —«Sin agente asignado»— apretada en una
  // columna de tres, con el texto cayendo palabra por palabra, debajo de dos
  // filtros de «0 agentes disponibles» (Nico lo vio, 2026-09-01). Una línea
  // que diga lo que pasa es todo lo que hay que mostrar.
  if (activeAgentes.length === 0 && allowNoAgent) {
    return (
      <p
        className={cn('text-sm text-fg-muted dark:text-fg-subtle', className)}
        data-testid="agente-selector-sin-agentes"
      >
        {t('inmobiliaria.agente.sinAgentesTodavia')}
      </p>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Zone Filter */}
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inmobiliaria.agente.allZones')}</SelectItem>
            {zones.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Selector */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">{t('inmobiliaria.agente.sortRecommended')}</SelectItem>
            <SelectItem value="name">{t('inmobiliaria.agente.sortByName')}</SelectItem>
            <SelectItem value="workload">{t('inmobiliaria.agente.sortLeastWorkload')}</SelectItem>
            <SelectItem value="performance">{t('inmobiliaria.agente.sortBestPerformance')}</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-fg-muted dark:text-fg-subtle">
          {filteredAgentes.length === 1
            ? t('inmobiliaria.agente.availableAgentSingular')
            : t('inmobiliaria.agente.availableAgentsPlural', { count: String(filteredAgentes.length) })}
        </span>
      </div>

      {/* Agents Grid */}
      {sortedAgentes.length > 0 || allowNoAgent ? (
        // Columnas según el ANCHO DEL CONTENEDOR, no de la ventana: adentro de
        // un diálogo de 512 px, `lg:grid-cols-3` partía el espacio en tres
        // columnas de 150 px y las tarjetas quedaban ilegibles.
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {/* No Agent Option */}
          {allowNoAgent && (
            <motion.button
              onClick={() => onChange(null)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'relative p-4 rounded-lg border text-left transition-all duration-200',
                value === null
                  ? 'border-primary/30 bg-primary-soft ring-2 ring-primary/30'
                  : 'border-border dark:border-border-strong bg-surface dark:bg-bg hover:border-border dark:hover:border-border-strong hover:'
              )}
            >
              {/* Selected Indicator */}
              {value === null && (
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
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
                'relative p-4 rounded-lg border text-left transition-all duration-200',
                value === agente.id
                  ? 'border-primary/30 bg-primary-soft ring-2 ring-primary/30'
                  : 'border-border dark:border-border-strong bg-surface dark:bg-bg hover:border-border dark:hover:border-border-strong hover:'
              )}
            >
              {/* Recommended Badge */}
              {isRecommended(agente.id) && (
                <Badge variant="warning" className="absolute -top-2 -right-2 gap-1">
                  <Star className="w-3 h-3" weight="fill" />
                  {t('inmobiliaria.agente.recommended')}
                </Badge>
              )}

              {/* Selected Indicator */}
              {value === agente.id && (
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
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
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-fg-muted flex items-center justify-center text-white font-semibold text-sm shrink-0">
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
                  <h3 className="font-semibold text-fg dark:text-white truncate text-sm">
                    {agente.name}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={agente.role === 'coordinator' ? 'default' : 'secondary'}>
                      {ROLE_LABELS[agente.role]}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Agent Details */}
              <div className="space-y-2 text-sm">
                {/* Zone */}
                {agente.zone && (
                  <div className="flex items-center gap-2 text-fg-muted dark:text-fg-subtle">
                    <MapPin className="w-4 h-4 text-fg-subtle" />
                    <span>{agente.zone}</span>
                    {agente.specialization && (
                      <span className="text-fg-subtle">
                        · {SPECIALIZATION_LABELS[agente.specialization]}
                      </span>
                    )}
                  </div>
                )}

                {/* Workload */}
                <div className="flex items-center gap-2 text-fg-muted dark:text-fg-subtle">
                  <Briefcase className="w-4 h-4 text-fg-subtle" />
                  <span>
                    {agente.assignedPropertyIds.length === 1
                      ? t('inmobiliaria.agente.assignedPropertySingular')
                      : t('inmobiliaria.agente.assignedPropertiesPlural', { count: String(agente.assignedPropertyIds.length) })}
                  </span>
                </div>

                {/* Metrics Row */}
                <div className="flex items-center gap-4 pt-2 border-t border-border-faint dark:border-border-strong">
                  {/* Commission Split */}
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-success" />
                    <span className="text-fg font-mono tabular-nums font-medium">
                      {agente.commissionSplit}%
                    </span>
                  </div>

                  {/* Conversion Rate */}
                  <div className="flex items-center gap-1.5">
                    <ChartLineUp className="w-4 h-4 text-primary" />
                    <span className="text-fg font-mono tabular-nums font-medium">
                      {Math.round(agente.metrics.conversionRate * 100)}%
                    </span>
                  </div>

                  {/* Closed This Month */}
                  <div className="flex items-center gap-1.5 text-fg-muted">
                    <span><span className="font-mono tabular-nums">{agente.metrics.closedThisMonth}</span> {t('inmobiliaria.agente.closedPerMonth')}</span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-lg border border-border dark:border-border-strong bg-surface-muted dark:bg-bg">
          <User className="w-12 h-12 mx-auto mb-3 text-fg-subtle dark:text-fg-muted" />
          <p className="text-fg-muted dark:text-fg-subtle">
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
            : "text-success"
        )}>
          <span className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center",
            value === null
              ? "bg-muted"
              : "bg-success-soft"
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
