'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CaretDown,
  CalendarBlank,
  User,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { DispersionStatus } from '@/lib/types/inmobiliaria';

export interface DispersionFiltersState {
  month: string; // '2026-02'
  status: DispersionStatus | 'all';
  propietarioId: string | 'all';
  search: string;
}

interface PropietarioOption {
  id: string;
  name: string;
}

interface DispersionFiltersProps {
  filters: DispersionFiltersState;
  onFiltersChange: (filters: DispersionFiltersState) => void;
  propietarios: PropietarioOption[];
  statusCounts: Record<DispersionStatus | 'all', number>;
}

// Status tabs values (labels resolved via i18n)
const STATUS_TAB_VALUES: (DispersionStatus | 'all')[] = [
  'all', 'pending', 'processing', 'completed', 'failed',
];

// Map status tab values to i18n keys
const STATUS_TAB_KEYS: Record<DispersionStatus | 'all', string> = {
  all: 'inmobiliaria.dispersiones.filtersPanel.statusAll',
  pending: 'inmobiliaria.dispersiones.filtersPanel.statusPending',
  processing: 'inmobiliaria.dispersiones.filtersPanel.statusProcessing',
  completed: 'inmobiliaria.dispersiones.filtersPanel.statusCompleted',
  failed: 'inmobiliaria.dispersiones.filtersPanel.statusFailed',
};

/**
 * Get last N months including current month
 */
function getRecentMonths(count: number, formatDateFn: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = formatDateFn(date, { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }

  return months;
}

/**
 * DispersionFilters - Filter bar for dispersiones page
 * Structure: Search + Filtros button → Collapsible panel with all filters
 */
export function DispersionFilters({
  filters,
  onFiltersChange,
  propietarios,
  statusCounts,
}: DispersionFiltersProps) {
  const { t, formatDate } = useI18n();
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  // Recent months for dropdown
  const recentMonths = useMemo(() => getRecentMonths(12, formatDate), [formatDate]);

  // Count active filters (excluding default values)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.propietarioId !== 'all') count++;
    return count;
  }, [filters]);

  const updateFilter = useCallback(
    <K extends keyof DispersionFiltersState>(
      key: K,
      value: DispersionFiltersState[K]
    ) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const clearAllFilters = useCallback(() => {
    const currentMonth = recentMonths[0]?.value || filters.month;
    onFiltersChange({
      month: currentMonth,
      status: 'all',
      propietarioId: 'all',
      search: '',
    });
    setSearchInput('');
  }, [recentMonths, filters.month, onFiltersChange]);

  // Get labels for current selections
  const getMonthLabel = () => {
    const month = recentMonths.find((m) => m.value === filters.month);
    return month?.label || t('inmobiliaria.dispersiones.filtersPanel.selectMonth');
  };

  const getPropietarioLabel = () => {
    if (filters.propietarioId === 'all') return t('inmobiliaria.dispersiones.filtersPanel.all');
    const propietario = propietarios.find((p) => p.id === filters.propietarioId);
    return propietario?.name || t('inmobiliaria.dispersiones.filtersPanel.all');
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
            placeholder={t('inmobiliaria.dispersiones.filtersPanel.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                updateFilter('search', '');
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
          <span>{t('inmobiliaria.dispersiones.filtersPanel.filtersButton')}</span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold min-w-[20px] text-center">
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
                    {t('inmobiliaria.dispersiones.filtersPanel.monthLabel')}
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
                        className="absolute top-full left-0 mt-1 w-56 p-2 rounded-xl border border-border bg-card shadow-xl z-50 max-h-64 overflow-y-auto"
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
                    {t('inmobiliaria.dispersiones.filtersPanel.statusLabel')}
                  </label>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-muted overflow-x-auto">
                    {STATUS_TAB_VALUES.map((tabValue) => {
                      const count = statusCounts[tabValue] || 0;
                      const isActive = filters.status === tabValue;

                      return (
                        <button
                          key={tabValue}
                          onClick={() => updateFilter('status', tabValue)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all',
                            isActive
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {t(STATUS_TAB_KEYS[tabValue])}
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

              {/* Row 2: Propietario Filter */}
              <div className="flex flex-wrap gap-4 items-end">
                {/* Propietario Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.dispersiones.filtersPanel.propietarioLabel')}
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'propietario' ? null : 'propietario')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[200px] justify-between border',
                      filters.propietarioId !== 'all'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'border-border bg-background text-foreground hover:border-foreground/30'
                    )}
                  >
                    <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate max-w-[140px]">{getPropietarioLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'propietario' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-64 p-2 rounded-xl border border-border bg-card shadow-xl z-50 max-h-60 overflow-y-auto"
                      >
                        <button
                          onClick={() => {
                            updateFilter('propietarioId', 'all');
                            setOpenDropdown(null);
                          }}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                            filters.propietarioId === 'all'
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                              : 'text-foreground hover:bg-muted'
                          )}
                        >
                          {t('inmobiliaria.dispersiones.filtersPanel.allOwners')}
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
                  <button
                    onClick={clearAllFilters}
                    className="px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  >
                    {t('inmobiliaria.dispersiones.filtersPanel.clearFilters')}
                  </button>
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

export default DispersionFilters;
