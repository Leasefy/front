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
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Chip, SegmentedControl } from '@leasefy/ui';
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
  /** Minimal mode for embedded use in unified cards */
  minimal?: boolean;
}

// Category tabs configuration
const CATEGORY_TAB_KEYS: { value: 'all' | ReportCategory; labelKey: string }[] = [
  { value: 'all', labelKey: 'inmobiliaria.reporte.all' },
  { value: 'financiero', labelKey: 'inmobiliaria.reporte.financial' },
  { value: 'operativo', labelKey: 'inmobiliaria.reporte.operative' },
  { value: 'agentes', labelKey: 'inmobiliaria.reporte.agents' },
];

// Quick period options
const PERIOD_OPTION_KEYS = [
  { value: 'this-month', labelKey: 'inmobiliaria.reporte.thisMonth' },
  { value: 'last-month', labelKey: 'inmobiliaria.reporte.lastMonth' },
  { value: 'last-quarter', labelKey: 'inmobiliaria.reporte.lastQuarter' },
  { value: 'this-year', labelKey: 'inmobiliaria.reporte.thisYear' },
  { value: 'custom', labelKey: 'inmobiliaria.reporte.custom' },
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
function formatPeriodDisplayFn(period: { start: string; end: string }, fmtDate: (d: string) => string): string {
  return `${fmtDate(period.start)} - ${fmtDate(period.end)}`;
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
  minimal = false,
}: ReporteFiltersProps) {
  const { t, formatDate: fmtDate } = useI18n();
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
      {/* Row 1: Search */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('inmobiliaria.reporte.searchReports')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/30 transition-all"
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

      {/* Row 2: All Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category Tabs */}
        <SegmentedControl<'all' | ReportCategory>
          value={filters.category}
          onChange={(v) => updateFilter('category', v)}
          options={CATEGORY_TAB_KEYS.map((tab) => {
            const count = reportCounts[tab.value as keyof typeof reportCounts] || 0;
            const isActive = filters.category === tab.value;
            return {
              value: tab.value,
              ariaLabel: t(tab.labelKey),
              label: (
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {t(tab.labelKey)}
                  {count > 0 && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-xs min-w-[18px] text-center',
                        isActive ? 'bg-primary-soft text-primary' : 'bg-muted-foreground/20'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </span>
              ),
            };
          })}
        />

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-border" />

        {/* Period Selector */}
        <div className="relative">
          <button
            onClick={() =>
              setOpenDropdown(openDropdown === 'period' ? null : 'period')
            }
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-all"
          >
            <CalendarBlank className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">
              {formatPeriodDisplayFn(filters.period, fmtDate)}
            </span>
            <CaretDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {openDropdown === 'period' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-1 w-52 p-2 rounded-xl border border-border bg-card z-20"
              >
                {PERIOD_OPTION_KEYS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePeriodSelect(option.value)}
                    className={cn(
                      'w-full px-3 py-2 rounded-md text-left text-sm transition-colors',
                      selectedPeriodOption === option.value
                        ? 'bg-primary-soft text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {t(option.labelKey)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Zone Dropdown */}
        <div className="relative">
          <Chip
            selected={!!filters.zone}
            onClick={() =>
              setOpenDropdown(openDropdown === 'zone' ? null : 'zone')
            }
            icon={<MapPin className="w-3.5 h-3.5" />}
          >
            <span className="flex items-center gap-1.5">
              <span className="max-w-[100px] truncate">
                {filters.zone || t('inmobiliaria.reporte.zone')}
              </span>
              <CaretDown className="w-3.5 h-3.5" />
            </span>
          </Chip>
          <AnimatePresence>
            {openDropdown === 'zone' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 top-full mt-1 w-52 p-2 rounded-xl border border-border bg-card z-20 max-h-64 overflow-y-auto"
              >
                <button
                  onClick={() => {
                    updateFilter('zone', null);
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    'w-full px-3 py-2 rounded-md text-left text-sm transition-colors',
                    !filters.zone
                      ? 'bg-primary-soft text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {t('inmobiliaria.reporte.allZones')}
                </button>
                {zones.map((zone) => (
                  <button
                    key={zone}
                    onClick={() => {
                      updateFilter('zone', zone);
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      'w-full px-3 py-2 rounded-md text-left text-sm transition-colors',
                      filters.zone === zone
                        ? 'bg-primary-soft text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {zone}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Favorites Toggle */}
        <Chip
          selected={filters.favoritesOnly}
          onClick={() => updateFilter('favoritesOnly', !filters.favoritesOnly)}
          icon={
            <Star
              className="w-3.5 h-3.5"
              weight={filters.favoritesOnly ? 'fill' : 'regular'}
            />
          }
        >
          {t('inmobiliaria.reporte.favorites')}
        </Chip>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={clearAllFilters}
            className="gap-1.5"
          >
            <Funnel className="w-4 h-4" weight="fill" />
            {t('inmobiliaria.reporte.clear')}
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
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
