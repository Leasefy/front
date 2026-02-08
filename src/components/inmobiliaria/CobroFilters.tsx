'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CaretDown,
  CalendarBlank,
  Buildings,
  User,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { Consignacion, Propietario, CobroStatus } from '@/lib/types/inmobiliaria';

export interface CobroFiltersState {
  month: string; // '2026-02'
  status: CobroStatus | 'all';
  consignacionId?: string;
  propietarioId?: string;
  search?: string;
}

interface CobroFiltersProps {
  consignaciones: Consignacion[];
  propietarios: Propietario[];
  filters: CobroFiltersState;
  onFilterChange: (filters: CobroFiltersState) => void;
  cobroCountByStatus: Record<CobroStatus | 'all', number>;
}

// Status tabs configuration
const STATUS_TABS: { value: CobroStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Pagados' },
  { value: 'late', label: 'En mora' },
  { value: 'partial', label: 'Parciales' },
  { value: 'defaulted', label: 'Incobrables' },
];

/**
 * Get last N months including current month
 */
function getRecentMonths(count: number): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }

  return months;
}

/**
 * CobroFilters - Filter bar for cobros (collections) page
 * Includes month selector, status tabs, property filter, and owner filter
 */
export function CobroFilters({
  consignaciones,
  propietarios,
  filters,
  onFilterChange,
  cobroCountByStatus,
}: CobroFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ ...filters, search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFilterChange]);

  // Recent months for dropdown
  const recentMonths = useMemo(() => getRecentMonths(6), []);

  // Count active advanced filters
  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.consignacionId) count++;
    if (filters.propietarioId) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const updateFilter = useCallback(<K extends keyof CobroFiltersState>(
    key: K,
    value: CobroFiltersState[K]
  ) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const clearAllFilters = useCallback(() => {
    const currentMonth = recentMonths[0]?.value || filters.month;
    onFilterChange({
      month: currentMonth,
      status: 'all',
      consignacionId: undefined,
      propietarioId: undefined,
      search: undefined,
    });
    setSearchInput('');
  }, [recentMonths, filters.month, onFilterChange]);

  // Get labels for current selections
  const getMonthLabel = () => {
    const month = recentMonths.find((m) => m.value === filters.month);
    return month?.label || 'Seleccionar mes';
  };

  const getConsignacionLabel = () => {
    if (!filters.consignacionId) return 'Todas';
    const consignacion = consignaciones.find((c) => c.id === filters.consignacionId);
    return consignacion?.propertyTitle || 'Todas';
  };

  const getPropietarioLabel = () => {
    if (!filters.propietarioId) return 'Todos';
    const propietario = propietarios.find((p) => p.id === filters.propietarioId);
    return propietario?.name || 'Todos';
  };

  return (
    <div className="space-y-4">
      {/* Month Selector and Status Tabs */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        {/* Month Selector */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all"
          >
            <CalendarBlank className="w-5 h-5 text-neutral-400" />
            <span className="font-medium capitalize">{getMonthLabel()}</span>
            <CaretDown className="w-4 h-4 text-neutral-400" />
          </button>
          <AnimatePresence>
            {openDropdown === 'month' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-1 w-56 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20"
              >
                {recentMonths.map((month) => (
                  <button
                    key={month.value}
                    onClick={() => {
                      updateFilter('month', month.value);
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left text-sm capitalize transition-colors',
                      filters.month === month.value
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    {month.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const count = cobroCountByStatus[tab.value] || 0;
            const isActive = filters.status === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => updateFilter('status', tab.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs min-w-[20px] text-center',
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Advanced Filters Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nombre del inquilino..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                updateFilter('search', undefined);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all',
            showAdvancedFilters || activeAdvancedFiltersCount > 0
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
          )}
        >
          <Funnel className="w-4 h-4" />
          <span className="text-sm font-medium">Filtros</span>
          {activeAdvancedFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold min-w-[20px] text-center">
              {activeAdvancedFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141416]">
              <div className="flex flex-wrap gap-4">
                {/* Property (Consignacion) Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Propiedad
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'consignacion' ? null : 'consignacion')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[180px] justify-between',
                      filters.consignacionId
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <Buildings className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-[120px]">{getConsignacionLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'consignacion' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-64 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-60 overflow-y-auto"
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
                        {consignaciones.map((consignacion) => (
                          <button
                            key={consignacion.id}
                            onClick={() => {
                              updateFilter('consignacionId', consignacion.id);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors truncate',
                              filters.consignacionId === consignacion.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                            )}
                          >
                            <span className="block truncate">{consignacion.propertyTitle}</span>
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {consignacion.propertyZone}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Propietario Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Propietario
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'propietario' ? null : 'propietario')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[180px] justify-between',
                      filters.propietarioId
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-[120px]">{getPropietarioLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'propietario' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-56 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-60 overflow-y-auto"
                      >
                        <button
                          onClick={() => {
                            updateFilter('propietarioId', undefined);
                            setOpenDropdown(null);
                          }}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                            !filters.propietarioId
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          )}
                        >
                          Todos los propietarios
                        </button>
                        {propietarios.map((propietario) => (
                          <button
                            key={propietario.id}
                            onClick={() => {
                              updateFilter('propietarioId', propietario.id);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors truncate',
                              filters.propietarioId === propietario.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                            )}
                          >
                            {propietario.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Clear Filters */}
              {activeAdvancedFiltersCount > 0 && (
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
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}

export default CobroFilters;
