'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CalendarBlank,
  User,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button, Input } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconButton, Chip } from '@leasefy/cadence';
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

  return (
    <div className="relative">
      {/* Search and Filters Toggle - Main Row */}
      <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            type="text"
            placeholder={t('inmobiliaria.dispersiones.filtersPanel.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4"
          />
          {searchInput && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('');
                updateFilter('search', '');
              }}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              icon={<X className="w-4 h-4 text-muted-foreground" />}
            />
          )}
        </div>

        {/* Filters Toggle */}
        <Chip
          selected={showFilters || activeFiltersCount > 0}
          onClick={() => setShowFilters(!showFilters)}
          icon={<Funnel className="w-4 h-4" />}
          aria-expanded={showFilters}
        >
          {t('inmobiliaria.dispersiones.filtersPanel.filtersButton')}
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] text-center tabular-nums">
              {activeFiltersCount}
            </span>
          )}
        </Chip>
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
                <div className="shrink-0">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.dispersiones.filtersPanel.monthLabel')}
                  </label>
                  <Select
                    value={filters.month}
                    onValueChange={(value) => updateFilter('month', value)}
                  >
                    <SelectTrigger className="gap-2 capitalize">
                      <CalendarBlank className="w-4 h-4 text-muted-foreground shrink-0" />
                      <SelectValue placeholder={t('inmobiliaria.dispersiones.filtersPanel.selectMonth')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {recentMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value} className="capitalize">
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Tabs */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.dispersiones.filtersPanel.statusLabel')}
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {STATUS_TAB_VALUES.map((tabValue) => {
                      const count = statusCounts[tabValue] || 0;
                      const isActive = filters.status === tabValue;

                      return (
                        <Chip
                          key={tabValue}
                          selected={isActive}
                          onClick={() => updateFilter('status', tabValue)}
                          className="whitespace-nowrap"
                        >
                          {t(STATUS_TAB_KEYS[tabValue])}
                          {count > 0 && (
                            <span className={cn(
                              'px-1.5 py-0.5 rounded-full text-xs min-w-[20px] text-center',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted-foreground/20 text-muted-foreground'
                            )}>
                              {count}
                            </span>
                          )}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 2: Propietario Filter */}
              <div className="flex flex-wrap gap-4 items-end">
                {/* Propietario Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.dispersiones.filtersPanel.propietarioLabel')}
                  </label>
                  <Select
                    value={filters.propietarioId}
                    onValueChange={(value) => updateFilter('propietarioId', value)}
                  >
                    <SelectTrigger className="gap-2 min-w-[200px]">
                      <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">
                        {t('inmobiliaria.dispersiones.filtersPanel.allOwners')}
                      </SelectItem>
                      {propietarios.map((propietario) => (
                        <SelectItem key={propietario.id} value={propietario.id}>
                          {propietario.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                {activeFiltersCount > 0 && (
                  <Button variant="link" hideArrow onClick={clearAllFilters}>
                    {t('inmobiliaria.dispersiones.filtersPanel.clearFilters')}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DispersionFilters;
