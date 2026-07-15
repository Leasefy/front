'use client';

import { useMemo, useCallback } from 'react';
import {
  MagnifyingGlass,
  X,
  Buildings,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Chip, IconButton } from '@leasefy/cadence';
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

// Date preset values - labels are translated in the component
const DATE_PRESET_VALUES = ['today', 'week', 'month'] as const;

/**
 * PipelineFilters - Inline filter bar for the rental pipeline Kanban board
 * Uses pill-style date presets and compact dropdowns
 */
export function PipelineFilters({
  agentes,
  consignaciones,
  filters,
  onFilterChange,
}: PipelineFiltersProps) {
  const { t } = useI18n();

  const DATE_PRESETS = [
    { label: t('inmobiliaria.pipeline.today'), value: 'today' as const },
    { label: t('inmobiliaria.pipeline.week'), value: 'week' as const },
    { label: t('inmobiliaria.pipeline.monthPreset'), value: 'month' as const },
  ];

  // Get unique properties from consignaciones
  const uniqueProperties = useMemo(() => {
    const seen = new Set<string>();
    return consignaciones.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [consignaciones]);

  // Check if any filter is active
  const hasAnyFilter = filters.agenteId || filters.consignacionId || filters.dateFrom || filters.dateTo || filters.search;

  // Check which date preset is active
  const activeDatePreset = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return null;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (filters.dateTo === todayStr) {
      const fromDate = new Date(filters.dateFrom);
      const daysDiff = Math.round((today.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) return 'today';
      if (daysDiff === 7) return 'week';
      if (daysDiff >= 28 && daysDiff <= 31) return 'month';
    }
    return null;
  }, [filters.dateFrom, filters.dateTo]);

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
    if (!filters.agenteId) return t('inmobiliaria.pipeline.agent');
    const agente = agentes.find((a) => a.id === filters.agenteId);
    return agente?.name || t('inmobiliaria.pipeline.agent');
  };

  // Get label for property dropdown
  const getPropertyLabel = () => {
    if (!filters.consignacionId) return t('inmobiliaria.pipeline.property');
    const consignacion = uniqueProperties.find((c) => c.id === filters.consignacionId);
    return consignacion?.propertyTitle || t('inmobiliaria.pipeline.property');
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
    <div className="p-4 space-y-4 border-b border-border">
      {/* Row 1: Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          type="text"
          placeholder={t('inmobiliaria.pipeline.searchPlaceholder')}
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          className="w-full pl-10 pr-4"
        />
        {filters.search && (
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => updateFilter('search', undefined)}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            icon={<X className="w-4 h-4" />}
          />
        )}
      </div>

      {/* Row 2: Dropdowns + Date Presets */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Agente Dropdown */}
        <Select
          value={filters.agenteId ?? 'all'}
          onValueChange={(v) => updateFilter('agenteId', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-auto max-w-[180px] gap-2">
            <span className="truncate">{getAgenteLabel()}</span>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">{t('inmobiliaria.pipeline.allAgents')}</SelectItem>
            {agentes
              .filter((a) => a.status === 'active')
              .map((agente) => (
                <SelectItem key={agente.id} value={agente.id}>
                  <span className="flex items-center gap-2">
                    {agente.avatar ? (
                      <img
                        src={agente.avatar}
                        alt={agente.name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-surface-brand flex items-center justify-center text-xs font-medium text-primary">
                        {getInitials(agente.name)}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="truncate block">{agente.name}</span>
                      <span className="text-xs text-muted-foreground">{agente.zone}</span>
                    </span>
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Property Dropdown */}
        <Select
          value={filters.consignacionId ?? 'all'}
          onValueChange={(v) => updateFilter('consignacionId', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-auto max-w-[200px] gap-2">
            <span className="truncate">{getPropertyLabel()}</span>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">{t('inmobiliaria.pipeline.allProperties')}</SelectItem>
            {uniqueProperties.map((consignacion) => (
              <SelectItem key={consignacion.id} value={consignacion.id}>
                <span className="flex items-center gap-2">
                  {consignacion.propertyThumbnail ? (
                    <img
                      src={consignacion.propertyThumbnail}
                      alt={consignacion.propertyTitle}
                      className="w-8 h-8 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Buildings className="w-4 h-4 text-muted-foreground" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="truncate block font-medium">
                      {consignacion.propertyTitle}
                    </span>
                    <span className="text-xs text-muted-foreground truncate block">
                      {consignacion.propertyZone}, {consignacion.propertyCity}
                    </span>
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-border" />

        {/* Date Presets - Chip group */}
        <div className="flex items-center gap-1.5">
          {DATE_PRESETS.map((preset) => (
            <Chip
              key={preset.value}
              selected={activeDatePreset === preset.value}
              onClick={() => applyDatePreset(preset.value)}
              className="whitespace-nowrap"
            >
              {preset.label}
            </Chip>
          ))}
        </div>

        {/* Custom Date Range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
            className="w-auto"
          />
          <span className="text-muted-foreground text-sm">{t('inmobiliaria.pipeline.to')}</span>
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
            className="w-auto"
          />
        </div>

        {/* Clear Filters */}
        {hasAnyFilter && (
          <>
            <div className="hidden sm:block w-px h-6 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              onClick={clearAllFilters}
              className="gap-1.5 text-danger hover:bg-danger-soft hover:text-danger"
            >
              <X className="w-4 h-4" />
              {t('inmobiliaria.pipeline.clear')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default PipelineFilters;
