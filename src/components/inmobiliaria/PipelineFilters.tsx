'use client';

import { useMemo, useCallback, useId, useState } from 'react';
import {
  MagnifyingGlass,
  X,
  Buildings,
  Funnel,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Chip, DatePicker, IconButton, Presence, Avatar } from '@leasefy/cadence';
import { aFechaIso, fechaLocal } from '@/lib/fechas-locales';
import type { Agente, Consignacion } from '@/lib/types/inmobiliaria';
import { useTr } from '@/lib/i18n/use-tr';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const tr = useTr();
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const idDelPanel = `pipeline-filtros-${useId().replace(/:/g, '')}`;
  /** Lo que está puesto en el panel (las fechas de «Entró»): el botón lo cuenta. */
  /*
   * Ronda 20 (390): un renglón, [Buscar] [Filtros (n)]. Asesor e Inmueble van adentro del panel de
   * «Filtros» en el celular (eran tres renglones de controles). El primer pintado es el de escritorio.
   */
  const esCelular = useIsMobile();
  const filtrosDelPanel =
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    (esCelular ? (filters.agenteId ? 1 : 0) + (filters.consignacionId ? 1 : 0) : 0);
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


  // Asesor e Inmueble: en la barra en escritorio; adentro de «Filtros» en el celular.
  const selectores = (
    <>
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
                    <Avatar name={agente.name} src={agente.avatar || undefined} size="xs" />
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
    </>
  );

  return (
    <div className="p-4 space-y-3 border-b border-border">
      {/* Ronda 18: UN renglón a la misma altura —buscar, asesor, inmueble, «Filtros (n)» y
          limpiar—; las fechas de «Entró» van al panel de «Filtros» (antes eran tres renglones
          de tres alturas y «Hoy» se leía como «visitas de hoy»). */}
      <div className="flex items-center gap-2 sm:flex-wrap">
      {/* Row 1: Search */}
      <div className="relative min-w-0 flex-1 sm:min-w-[16rem] sm:max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          type="text"
          placeholder={t('inmobiliaria.pipeline.searchPlaceholder')}
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          className="w-full pl-10 pr-4"
        />
        <Presence show={Boolean(filters.search)} direction="none" className="absolute right-2 top-1/2 -translate-y-1/2">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => updateFilter('search', undefined)}
            aria-label={tr("Limpiar búsqueda")}
            className="text-muted-foreground"
            icon={<X className="w-4 h-4" />}
          />
        </Presence>
      </div>

      {/* Row 2: Dropdowns + «Filtros» */}
      <div className="flex shrink-0 items-center gap-2 sm:shrink sm:flex-wrap">
        {esCelular ? null : selectores}

        <Button
          variant="secondary"
          hideArrow
          // Ronda 20: a la altura del buscador y los selects (44 px; medía 39).
          className="h-11 gap-2"
          aria-expanded={filtrosAbiertos}
          aria-controls={idDelPanel}
          onClick={() => setFiltrosAbiertos((v) => !v)}
          data-testid="pipeline-mas-filtros"
        >
          <Funnel className="h-4 w-4" aria-hidden />
          {tr('Filtros')}
          {filtrosDelPanel > 0 ? <span className="font-mono text-caption tabular-nums">({filtrosDelPanel})</span> : null}
        </Button>

        {/* Clear Filters */}
        {/* «Limpiar» aparece con el primer filtro y se va al limpiarlos. */}
        <Presence show={Boolean(hasAnyFilter) && !esCelular} direction="none" className="flex items-center gap-3">
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
        </Presence>
      </div>
      </div>

      {/* El panel de «Filtros»: cuándo ENTRÓ el interesado (montado siempre, visible al abrirlo). */}
      <div
        id={idDelPanel}
        className={cn('flex-wrap items-center gap-2 rounded-lg bg-surface-muted/60 p-3', filtrosAbiertos ? 'flex' : 'hidden')}
        data-testid="pipeline-panel-de-filtros"
      >
        {esCelular ? (
          <div className="flex w-full flex-wrap items-center gap-2" data-testid="pipeline-filtros-del-celular">
            {selectores}
          </div>
        ) : null}
        <span className="text-body-sm text-fg-muted">{tr('Entró')}</span>

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

        {/* Custom Date Range — ronda 18 (390): los dos campos se reparten el ancho (antes «Hasta» salía cortado). */}
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto">
          {/* PL-03: el calendario de la casa (días en español), no el
              `type="date"` del navegador («dd/mm/yyyy» en inglés). */}
          <DatePicker
            id="pipeline-desde"
            value={fechaLocal(filters.dateFrom ?? null)}
            onChange={(d) => updateFilter('dateFrom', d ? aFechaIso(d) : undefined)}
            placeholder={tr("Desde")}
            className="w-full sm:w-40"
          />
          <span className="text-muted-foreground text-sm">{t('inmobiliaria.pipeline.to')}</span>
          <DatePicker
            id="pipeline-hasta"
            value={fechaLocal(filters.dateTo ?? null)}
            onChange={(d) => updateFilter('dateTo', d ? aFechaIso(d) : undefined)}
            placeholder={tr("Hasta")}
            className="w-full sm:w-40"
          />
        </div>

        {esCelular && hasAnyFilter ? (
          <Button variant="ghost" size="sm" hideArrow onClick={clearAllFilters} className="gap-1.5 text-danger hover:bg-danger-soft hover:text-danger">
            <X className="w-4 h-4" />
            {t('inmobiliaria.pipeline.clear')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default PipelineFilters;
