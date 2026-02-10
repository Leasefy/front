'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  X,
  CaretDown,
  Buildings,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { Agente, Consignacion } from '@/lib/types/inmobiliaria';

export interface PipelineFiltersState {
  agenteId?: string;
  consignacionId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface PipelineFiltersProps {
  agentes: Agente[];
  consignaciones: Consignacion[];
  filters: PipelineFiltersState;
  onFilterChange: (filters: PipelineFiltersState) => void;
}

// Date preset values - labels are translated in the component
const DATE_PRESET_VALUES = ['today', 'week', 'month'] as const;

/**
 * PipelineFilters - Inline filter bar for the rental pipeline Kanban board
 * Uses pill-style date presets and compact dropdowns
 */
export function PipelineFilters({
  agentes,
  consignaciones,
  filters,
  onFilterChange,
}: PipelineFiltersProps) {
  const { t } = useTranslation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const DATE_PRESETS = [
    { label: t('inmobiliaria.pipeline.today'), value: 'today' as const },
    { label: t('inmobiliaria.pipeline.week'), value: 'week' as const },
    { label: t('inmobiliaria.pipeline.monthPreset'), value: 'month' as const },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unique properties from consignaciones
  const uniqueProperties = useMemo(() => {
    const seen = new Set<string>();
    return consignaciones.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [consignaciones]);

  // Check if any filter is active
  const hasAnyFilter = filters.agenteId || filters.consignacionId || filters.dateFrom || filters.dateTo || filters.search;

  // Check which date preset is active
  const activeDatePreset = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return null;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (filters.dateTo === todayStr) {
      const fromDate = new Date(filters.dateFrom);
      const daysDiff = Math.round((today.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) return 'today';
      if (daysDiff === 7) return 'week';
      if (daysDiff >= 28 && daysDiff <= 31) return 'month';
    }
    return null;
  }, [filters.dateFrom, filters.dateTo]);

  // Update a specific filter
  const updateFilter = useCallback(
    <K extends keyof PipelineFiltersState>(key: K, value: PipelineFiltersState[K]) => {
      onFilterChange({ ...filters, [key]: value });
    },
    [filters, onFilterChange]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    onFilterChange({
      agenteId: undefined,
      consignacionId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      search: undefined,
    });
  }, [onFilterChange]);

  // Apply date preset
  const applyDatePreset = useCallback(
    (preset: 'today' | 'week' | 'month') => {
      const today = new Date();
      const dateFrom = new Date();

      switch (preset) {
        case 'today':
          // Already today
          break;
        case 'week':
          dateFrom.setDate(today.getDate() - 7);
          break;
        case 'month':
          dateFrom.setMonth(today.getMonth() - 1);
          break;
      }

      onFilterChange({
        ...filters,
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
      });
    },
    [filters, onFilterChange]
  );

  // Get label for agente dropdown
  const getAgenteLabel = () => {
    if (!filters.agenteId) return t('inmobiliaria.pipeline.agent');
    const agente = agentes.find((a) => a.id === filters.agenteId);
    return agente?.name || t('inmobiliaria.pipeline.agent');
  };

  // Get label for property dropdown
  const getPropertyLabel = () => {
    if (!filters.consignacionId) return t('inmobiliaria.pipeline.property');
    const consignacion = uniqueProperties.find((c) => c.id === filters.consignacionId);
    return consignacion?.propertyTitle || t('inmobiliaria.pipeline.property');
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="p-4 space-y-4 border-b border-border" ref={dropdownRef}>
      {/* Row 1: Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('inmobiliaria.pipeline.searchPlaceholder')}
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', undefined)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Row 2: Dropdowns + Date Presets */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Agente Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'agente' ? null : 'agente')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
              filters.agenteId
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            <span className="truncate max-w-[100px]">{getAgenteLabel()}</span>
            <CaretDown className={cn('w-4 h-4 shrink-0 transition-transform', openDropdown === 'agente' && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {openDropdown === 'agente' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-2 w-64 p-2 rounded-xl border border-border bg-card shadow-xl z-50 max-h-60 overflow-y-auto"
              >
                <button
                  onClick={() => {
                    updateFilter('agenteId', undefined);
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                    !filters.agenteId
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {t('inmobiliaria.pipeline.allAgents')}
                </button>
                {agentes
                  .filter((a) => a.status === 'active')
                  .map((agente) => (
                    <button
                      key={agente.id}
                      onClick={() => {
                        updateFilter('agenteId', agente.id);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                        filters.agenteId === agente.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      {agente.avatar ? (
                        <img
                          src={agente.avatar}
                          alt={agente.name}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {getInitials(agente.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{agente.name}</span>
                        <span className="text-xs text-muted-foreground">{agente.zone}</span>
                      </div>
                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Property Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'property' ? null : 'property')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
              filters.consignacionId
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            <span className="truncate max-w-[120px]">{getPropertyLabel()}</span>
            <CaretDown className={cn('w-4 h-4 shrink-0 transition-transform', openDropdown === 'property' && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {openDropdown === 'property' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-2 w-72 p-2 rounded-xl border border-border bg-card shadow-xl z-50 max-h-60 overflow-y-auto"
              >
                <button
                  onClick={() => {
                    updateFilter('consignacionId', undefined);
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                    !filters.consignacionId
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {t('inmobiliaria.pipeline.allProperties')}
                </button>
                {uniqueProperties.map((consignacion) => (
                  <button
                    key={consignacion.id}
                    onClick={() => {
                      updateFilter('consignacionId', consignacion.id);
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      filters.consignacionId === consignacion.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {consignacion.propertyThumbnail ? (
                      <img
                        src={consignacion.propertyThumbnail}
                        alt={consignacion.propertyTitle}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Buildings className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="truncate block font-medium">
                        {consignacion.propertyTitle}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {consignacion.propertyZone}, {consignacion.propertyCity}
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-border" />

        {/* Date Presets - Pill Style */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => applyDatePreset(preset.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                activeDatePreset === preset.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
            className="px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <span className="text-muted-foreground text-sm">{t('inmobiliaria.pipeline.to')}</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
            className="px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Clear Filters */}
        {hasAnyFilter && (
          <>
            <div className="hidden sm:block w-px h-6 bg-border" />
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <X className="w-4 h-4" />
              {t('inmobiliaria.pipeline.clear')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default PipelineFilters;
