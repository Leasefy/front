'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CaretDown,
  Calendar,
  User,
  Buildings,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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

const DATE_PRESETS = [
  { label: 'Hoy', value: 'today' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
] as const;

/**
 * PipelineFilters - Filter bar for the rental pipeline Kanban board
 * Includes filters for agente, property, date range, and search
 */
export function PipelineFilters({
  agentes,
  consignaciones,
  filters,
  onFilterChange,
}: PipelineFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Get unique properties from consignaciones
  const uniqueProperties = useMemo(() => {
    const seen = new Set<string>();
    return consignaciones.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [consignaciones]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.agenteId) count++;
    if (filters.consignacionId) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

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
    if (!filters.agenteId) return 'Todos los agentes';
    const agente = agentes.find((a) => a.id === filters.agenteId);
    return agente?.name || 'Todos los agentes';
  };

  // Get label for property dropdown
  const getPropertyLabel = () => {
    if (!filters.consignacionId) return 'Todas las propiedades';
    const consignacion = uniqueProperties.find((c) => c.id === filters.consignacionId);
    return consignacion?.propertyTitle || 'Todas las propiedades';
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
    <div className="space-y-4">
      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por candidato..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', undefined)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all',
            showFilters || activeFiltersCount > 0
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
          )}
        >
          <Funnel className="w-4 h-4" />
          <span className="text-sm font-medium">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold min-w-[20px] text-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141416]">
              <div className="flex flex-wrap gap-4">
                {/* Agente Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    <User className="w-3.5 h-3.5 inline mr-1" />
                    Agente
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'agente' ? null : 'agente')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[180px] justify-between',
                      filters.agenteId
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <span className="truncate max-w-[140px]">{getAgenteLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'agente' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-64 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-60 overflow-y-auto"
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
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          )}
                        >
                          Todos los agentes
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
                                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
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
                                <span className="text-xs text-neutral-400">{agente.zone}</span>
                              </div>
                            </button>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Property Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    <Buildings className="w-3.5 h-3.5 inline mr-1" />
                    Propiedad
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'property' ? null : 'property')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[200px] justify-between',
                      filters.consignacionId
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <span className="truncate max-w-[160px]">{getPropertyLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'property' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-72 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-60 overflow-y-auto"
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
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          )}
                        >
                          Todas las propiedades
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
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                            )}
                          >
                            {consignacion.propertyThumbnail ? (
                              <img
                                src={consignacion.propertyThumbnail}
                                alt={consignacion.propertyTitle}
                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                                <Buildings className="w-4 h-4 text-neutral-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="truncate block font-medium">
                                {consignacion.propertyTitle}
                              </span>
                              <span className="text-xs text-neutral-400 truncate block">
                                {consignacion.propertyZone}, {consignacion.propertyCity}
                              </span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Rango de fechas
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                      className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Desde"
                    />
                    <span className="text-neutral-400">-</span>
                    <input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                      className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Hasta"
                    />
                  </div>
                </div>

                {/* Date Presets */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Atajos
                  </label>
                  <div className="flex gap-2">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => applyDatePreset(preset.value)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close dropdown on click outside */}
      {openDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  );
}

export default PipelineFilters;
