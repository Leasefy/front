'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CaretDown,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { Agente, AgenteRole, AgenteStatus } from '@/lib/types/inmobiliaria';

export interface AgenteFiltersState {
  search: string;
  role: AgenteRole | 'all';
  status: AgenteStatus | 'all';
  sortBy: 'name' | 'closedThisMonth' | 'commissionsThisMonth';
}

interface AgenteFiltersProps {
  filters: AgenteFiltersState;
  onFiltersChange: (filters: AgenteFiltersState) => void;
  agentes: Agente[];
}

const ROLE_OPTIONS: { value: AgenteRole | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'agent', label: 'Agente' },
  { value: 'coordinator', label: 'Coordinador' },
  { value: 'director', label: 'Director' },
];

const STATUS_OPTIONS: { value: AgenteStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'on_leave', label: 'Licencia' },
];

const SORT_OPTIONS: { value: AgenteFiltersState['sortBy']; label: string }[] = [
  { value: 'name', label: 'Nombre' },
  { value: 'closedThisMonth', label: 'Cierres mes' },
  { value: 'commissionsThisMonth', label: 'Comisiones' },
];

/**
 * AgenteFilters - Filter bar for agentes page
 * Includes search, role, status, and sort filters
 */
export function AgenteFilters({
  filters,
  onFiltersChange,
  agentes,
}: AgenteFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.role !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.sortBy !== 'name') count++;
    return count;
  }, [filters]);

  const updateFilter = <K extends keyof AgenteFiltersState>(
    key: K,
    value: AgenteFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      role: 'all',
      status: 'all',
      sortBy: 'name',
    });
  };

  // Get labels for current selections
  const getRoleLabel = () => {
    const option = ROLE_OPTIONS.find((o) => o.value === filters.role);
    return option?.label || 'Todos';
  };

  const getStatusLabel = () => {
    const option = STATUS_OPTIONS.find((o) => o.value === filters.status);
    return option?.label || 'Todos';
  };

  const getSortLabel = () => {
    const option = SORT_OPTIONS.find((o) => o.value === filters.sortBy);
    return option?.label || 'Nombre';
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
            placeholder="Buscar por nombre o email..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
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
                {/* Role Filter */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Rol
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'role' ? null : 'role')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[130px] justify-between',
                      filters.role !== 'all'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <span>{getRoleLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'role' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-40 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20"
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { updateFilter('role', option.value); setOpenDropdown(null); }}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                              filters.role === option.value
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Estado
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[130px] justify-between',
                      filters.status !== 'all'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <span>{getStatusLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'status' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-40 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { updateFilter('status', option.value); setOpenDropdown(null); }}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                              filters.status === option.value
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sort Filter */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Ordenar por
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'sortBy' ? null : 'sortBy')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[130px] justify-between',
                      filters.sortBy !== 'name'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <span>{getSortLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'sortBy' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-40 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { updateFilter('sortBy', option.value); setOpenDropdown(null); }}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                              filters.sortBy === option.value
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
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
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}

export default AgenteFilters;
