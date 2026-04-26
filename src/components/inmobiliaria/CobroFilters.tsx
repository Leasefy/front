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
import { useI18n } from '@/lib/i18n';
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

// Status tabs configuration - keys for i18n
const STATUS_TAB_KEYS: { value: CobroStatus | 'all'; key: string }[] = [
  { value: 'all', key: 'inmobiliaria.cobros.filters.all' },
  { value: 'pending', key: 'inmobiliaria.cobros.filters.pending' },
  { value: 'paid', key: 'inmobiliaria.cobros.filters.paid' },
  { value: 'late', key: 'inmobiliaria.cobros.filters.late' },
  { value: 'partial', key: 'inmobiliaria.cobros.filters.partial' },
  { value: 'defaulted', key: 'inmobiliaria.cobros.filters.defaulted' },
];

/**
 * CobroFilters - Filter bar for cobros (collections) page
 * Designed to work inside a unified card container
 * Structure: Search + Filtros button (main row) → Collapsible panel with all filters
 */
export function CobroFilters({
  consignaciones,
  propietarios,
  filters,
  onFilterChange,
  cobroCountByStatus,
}: CobroFiltersProps) {
  const { t, formatDate } = useI18n();
  const [showFilters, setShowFilters] = useState(false);
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

  /**
   * Get last N months including current month
   */
  const recentMonths = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const today = new Date();

    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = formatDate(date, { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }

    return months;
  }, [formatDate]);

  // Count active filters (excluding month and 'all' status since those are always set)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.consignacionId) count++;
    if (filters.propietarioId) count++;
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
    return month?.label || t('inmobiliaria.cobros.filters.selectMonth');
  };

  const getConsignacionLabel = () => {
    if (!filters.consignacionId) return t('inmobiliaria.cobros.filters.allProperties');
    const consignacion = consignaciones.find((c) => c.id === filters.consignacionId);
    return consignacion?.propertyTitle || t('inmobiliaria.cobros.filters.allProperties');
  };

  const getPropietarioLabel = () => {
    if (!filters.propietarioId) return t('inmobiliaria.cobros.filters.allOwners');
    const propietario = propietarios.find((p) => p.id === filters.propietarioId);
    return propietario?.name || t('inmobiliaria.cobros.filters.allOwners');
  };

  return (
    <div className="relative">
      {/* Search and Filters Toggle - Main Row */}
      <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('inmobiliaria.cobros.filters.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                updateFilter('search', undefined);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium',
            showFilters || activeFiltersCount > 0
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
              : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'
          )}
        >
          <Funnel className="w-4 h-4" />
          <span>{t('inmobiliaria.cobros.filters.filtersLabel')}</span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wide font-mono text-xs font-bold min-w-[20px] text-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel (collapsible) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-border"
          >
            <div className="p-4 bg-muted/20 space-y-4">
              {/* Row 1: Month Selector + Status Tabs */}
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                {/* Month Selector */}
                <div className="relative shrink-0">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.cobros.filters.monthLabel')}
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-foreground hover:border-foreground/30 transition-all text-sm"
                  >
                    <CalendarBlank className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium capitalize min-w-[120px]">{getMonthLabel()}</span>
                    <CaretDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'month' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-56 p-2 rounded-xl border border-border bg-card shadow-xl z-50"
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
                                : 'text-foreground hover:bg-muted'
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
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.cobros.filters.statusLabel')}
                  </label>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-muted overflow-x-auto">
                    {STATUS_TAB_KEYS.map((tab) => {
                      const count = cobroCountByStatus[tab.value] || 0;
                      const isActive = filters.status === tab.value;

                      return (
                        <button
                          key={tab.value}
                          onClick={() => updateFilter('status', tab.value)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all',
                            isActive
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {t(tab.key)}
                          {count > 0 && (
                            <span className={cn(
                              'px-1.5 py-0.5 rounded-full text-xs min-w-[20px] text-center',
                              isActive
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                : 'bg-muted-foreground/20 text-muted-foreground'
                            )}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 2: Property and Owner Filters */}
              <div className="flex flex-wrap gap-4">
                {/* Property (Consignacion) Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.cobros.filters.propertyLabel')}
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'consignacion' ? null : 'consignacion')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[180px] justify-between border',
                      filters.consignacionId
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'border-border bg-background text-foreground hover:border-foreground/30'
                    )}
                  >
                    <Buildings className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">{getConsignacionLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'consignacion' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-64 p-2 rounded-xl border border-border bg-card shadow-xl z-50 max-h-60 overflow-y-auto"
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
                          {t('inmobiliaria.cobros.filters.allProperties')}
                        </button>
                        {consignaciones.map((consignacion) => (
                          <button
                            key={consignacion.id}
                            onClick={() => {
                              updateFilter('consignacionId', consignacion.id);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                              filters.consignacionId === consignacion.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-foreground hover:bg-muted'
                            )}
                          >
                            <span className="block truncate">{consignacion.propertyTitle}</span>
                            <span className="block text-xs text-muted-foreground truncate">
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.cobros.filters.ownerLabel')}
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'propietario' ? null : 'propietario')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[180px] justify-between border',
                      filters.propietarioId
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'border-border bg-background text-foreground hover:border-foreground/30'
                    )}
                  >
                    <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">{getPropietarioLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'propietario' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-56 p-2 rounded-xl border border-border bg-card shadow-xl z-50 max-h-60 overflow-y-auto"
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
                              : 'text-foreground hover:bg-muted'
                          )}
                        >
                          {t('inmobiliaria.cobros.filters.allOwners')}
                        </button>
                        {propietarios.map((propietario) => (
                          <button
                            key={propietario.id}
                            onClick={() => {
                              updateFilter('propietarioId', propietario.id);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                              filters.propietarioId === propietario.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-foreground hover:bg-muted'
                            )}
                          >
                            {propietario.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Clear Filters */}
                {activeFiltersCount > 0 && (
                  <div className="flex items-end">
                    <button
                      onClick={clearAllFilters}
                      className="px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    >
                      {t('inmobiliaria.cobros.filters.clearFilters')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close dropdown on click outside */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}

export default CobroFilters;
