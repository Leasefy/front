'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CalendarBlank,
  Buildings,
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

  return (
    <div className="relative">
      {/* Search and Filters Toggle - Main Row */}
      <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            type="text"
            placeholder={t('inmobiliaria.cobros.filters.searchPlaceholder')}
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
                updateFilter('search', undefined);
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
          {t('inmobiliaria.cobros.filters.filtersLabel')}
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
                    {t('inmobiliaria.cobros.filters.monthLabel')}
                  </label>
                  <Select
                    value={filters.month}
                    onValueChange={(value) => updateFilter('month', value)}
                  >
                    <SelectTrigger className="gap-2 capitalize">
                      <CalendarBlank className="w-4 h-4 text-muted-foreground shrink-0" />
                      <SelectValue placeholder={t('inmobiliaria.cobros.filters.selectMonth')} />
                    </SelectTrigger>
                    <SelectContent>
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
                    {t('inmobiliaria.cobros.filters.statusLabel')}
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {STATUS_TAB_KEYS.map((tab) => {
                      const count = cobroCountByStatus[tab.value] || 0;
                      const isActive = filters.status === tab.value;

                      return (
                        <Chip
                          key={tab.value}
                          selected={isActive}
                          onClick={() => updateFilter('status', tab.value)}
                          className="whitespace-nowrap"
                        >
                          {t(tab.key)}
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

              {/* Row 2: Property and Owner Filters */}
              <div className="flex flex-wrap gap-4">
                {/* Property (Consignacion) Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.cobros.filters.propertyLabel')}
                  </label>
                  <Select
                    value={filters.consignacionId ?? 'all'}
                    onValueChange={(value) =>
                      updateFilter('consignacionId', value === 'all' ? undefined : value)
                    }
                  >
                    <SelectTrigger className="gap-2 min-w-[180px]">
                      <Buildings className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">
                        {t('inmobiliaria.cobros.filters.allProperties')}
                      </SelectItem>
                      {consignaciones.map((consignacion) => (
                        <SelectItem key={consignacion.id} value={consignacion.id}>
                          {consignacion.propertyTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Propietario Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t('inmobiliaria.cobros.filters.ownerLabel')}
                  </label>
                  <Select
                    value={filters.propietarioId ?? 'all'}
                    onValueChange={(value) =>
                      updateFilter('propietarioId', value === 'all' ? undefined : value)
                    }
                  >
                    <SelectTrigger className="gap-2 min-w-[180px]">
                      <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">
                        {t('inmobiliaria.cobros.filters.allOwners')}
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
                  <div className="flex items-end">
                    <Button variant="link" hideArrow onClick={clearAllFilters}>
                      {t('inmobiliaria.cobros.filters.clearFilters')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CobroFilters;
