'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CalendarBlank,
  Star,
  MapPin,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Chip, SegmentedControl, IconButton } from '@leasefy/cadence';
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
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          type="text"
          placeholder={t('inmobiliaria.reporte.searchReports')}
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
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            icon={<X className="w-4 h-4" />}
          />
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
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      className="min-w-[18px] justify-center px-1.5 py-0 text-xs"
                    >
                      {count}
                    </Badge>
                  )}
                </span>
              ),
            };
          })}
        />

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-border" />

        {/* Period Selector */}
        <Select value={selectedPeriodOption} onValueChange={handlePeriodSelect}>
          <SelectTrigger className="w-auto gap-2">
            <CalendarBlank className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">
              {formatPeriodDisplayFn(filters.period, fmtDate)}
            </span>
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTION_KEYS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Zonas — sólo si hay zonas de verdad.

            Antes la lista venía quemada en la página («Chapinero», «El
            Poblado»…) y el desplegable siempre estaba. Ahora las zonas salen
            del reporte de ocupación: mientras carga, o si la agencia no tiene
            ninguna, el control no se dibuja. Un desplegable vacío que igual
            dice «Todas las zonas» sugiere que las zonas existen y que las
            mostramos todas. */}
        {zones.length > 0 && (
        <Select
          value={filters.zone ?? 'all'}
          onValueChange={(v) => updateFilter('zone', v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-auto min-w-[140px] gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="all">{t('inmobiliaria.reporte.allZones')}</SelectItem>
            {zones.map((zone) => (
              <SelectItem key={zone} value={zone}>{zone}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        )}

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
    </div>
  );
}

export default ReporteFilters;
