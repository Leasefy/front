'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CaretDown,
  CalendarBlank,
  Star,
  MapPin,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { ReportCategory } from '@/lib/types/inmobiliaria';

export interface ReporteFiltersState {
  period: { start: string; end: string };
  zone: string | null;
  category: 'all' | ReportCategory;
  search: string;
  favoritesOnly: boolean;
}

interface ReporteFiltersProps {
  filters: ReporteFiltersState;
  onFiltersChange: (filters: ReporteFiltersState) => void;
  reportCounts: {
    all: number;
    financiero: number;
    operativo: number;
    agentes: number;
  };
  zones: string[];
}

// Category tabs configuration
const CATEGORY_TABS: { value: 'all' | ReportCategory; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'financiero', label: 'Financieros' },
  { value: 'operativo', label: 'Operativos' },
  { value: 'agentes', label: 'Agentes' },
];

// Quick period options
const PERIOD_OPTIONS = [
  { value: 'this-month', label: 'Este mes' },
  { value: 'last-month', label: 'Mes anterior' },
  { value: 'last-quarter', label: 'Ultimo trimestre' },
  { value: 'this-year', label: 'Ano actual' },
  { value: 'custom', label: 'Personalizado' },
];

/**
 * Get period dates based on quick selection
 */
function getPeriodDates(option: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (option) {
    case 'this-month': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    }
    case 'last-month': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    }
    case 'last-quarter': {
      const currentQuarter = Math.floor(month / 3);
      const startMonth = (currentQuarter - 1) * 3;
      const start = new Date(year, startMonth < 0 ? startMonth + 12 : startMonth, 1);
      const startYear = startMonth < 0 ? year - 1 : year;
      const end = new Date(startYear, start.getMonth() + 3, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    }
    case 'this-year': {
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
    }
    default:
      return {
        start: new Date(year, month, 1).toISOString().split('T')[0],
        end: new Date(year, month + 1, 0).toISOString().split('T')[0],
      };
  }
}

/**
 * Format period for display
 */
function formatPeriodDisplay(period: { start: string; end: string }): string {
  const start = new Date(period.start);
  const end = new Date(period.end);

  const startStr = start.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
  const endStr = end.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `${startStr} - ${endStr}`;
}

/**
 * ReporteFilters - Filter bar for reports page
 * Includes period selection, category tabs, zone filter, search, and favorites toggle
 */
export function ReporteFilters({
  filters,
  onFiltersChange,
  reportCounts,
  zones,
}: ReporteFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [selectedPeriodOption, setSelectedPeriodOption] = useState('this-month');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.zone) count++;
    if (filters.search) count++;
    if (filters.favoritesOnly) count++;
    return count;
  }, [filters]);

  const updateFilter = useCallback(
    <K extends keyof ReporteFiltersState>(
      key: K,
      value: ReporteFiltersState[K]
    ) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const handlePeriodSelect = useCallback(
    (option: string) => {
      setSelectedPeriodOption(option);
      if (option !== 'custom') {
        const newPeriod = getPeriodDates(option);
        onFiltersChange({ ...filters, period: newPeriod });
      }
      setOpenDropdown(null);
    },
    [filters, onFiltersChange]
  );

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      period: getPeriodDates('this-month'),
      zone: null,
      category: 'all',
      search: '',
      favoritesOnly: false,
    });
    setSearchInput('');
    setSelectedPeriodOption('this-month');
  }, [onFiltersChange]);

  return (
    <div className="space-y-4">
      {/* Top Row: Period and Favorites */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === 'period' ? null : 'period')
              }
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all min-w-[240px] justify-between"
            >
              <div className="flex items-center gap-2">
                <CalendarBlank className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-sm">
                  {formatPeriodDisplay(filters.period)}
                </span>
              </div>
              <CaretDown className="w-4 h-4 text-neutral-400" />
            </button>
            <AnimatePresence>
              {openDropdown === 'period' && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 mt-1 w-56 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20"
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePeriodSelect(option.value)}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                        selectedPeriodOption === option.value
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
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

        {/* Favorites Toggle */}
        <button
          onClick={() => updateFilter('favoritesOnly', !filters.favoritesOnly)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
            filters.favoritesOnly
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
          )}
        >
          <Star
            className="w-4 h-4"
            weight={filters.favoritesOnly ? 'fill' : 'regular'}
          />
          Solo favoritos
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-x-auto">
        {CATEGORY_TABS.map((tab) => {
          const count = reportCounts[tab.value as keyof typeof reportCounts] || 0;
          const isActive = filters.category === tab.value;

          return (
            <button
              key={tab.value}
              onClick={() => updateFilter('category', tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                isActive
                  ? 'bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs min-w-[20px] text-center',
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search and Zone Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar reportes..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                updateFilter('search', '');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Zone Filter + Active Filters */}
        <div className="flex items-center gap-3">
          {/* Zone Dropdown */}
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === 'zone' ? null : 'zone')
              }
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-w-[160px] justify-between border',
                filters.zone
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[100px]">
                  {filters.zone || 'Todas las zonas'}
                </span>
              </div>
              <CaretDown className="w-4 h-4 shrink-0" />
            </button>
            <AnimatePresence>
              {openDropdown === 'zone' && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-full mt-1 w-56 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-64 overflow-y-auto"
                >
                  <button
                    onClick={() => {
                      updateFilter('zone', null);
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      !filters.zone
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    Todas las zonas
                  </button>
                  {zones.map((zone) => (
                    <button
                      key={zone}
                      onClick={() => {
                        updateFilter('zone', zone);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                        filters.zone === zone
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      )}
                    >
                      {zone}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Filters Indicator */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Funnel className="w-4 h-4" weight="fill" />
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Close dropdowns on click outside */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}

export default ReporteFilters;
