'use client';

import { useMemo } from 'react';
import {
  MagnifyingGlass,
  X,
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
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
import type { Consignacion, Propietario, Agente, PropertyAvailability } from '@/lib/types/inmobiliaria';

export interface ConsignacionFiltersState {
  search: string;
  availability: PropertyAvailability | 'all';
  agenteId: string | 'all';
  propietarioId: string | 'all';
  city: string | 'all';
  propertyType: Consignacion['propertyType'] | 'all';
}

interface ConsignacionFiltersProps {
  filters: ConsignacionFiltersState;
  onFiltersChange: (filters: ConsignacionFiltersState) => void;
  consignaciones: Consignacion[];
  propietarios: Propietario[];
  agentes: Agente[];
}

const AVAILABILITY_OPTIONS: { value: PropertyAvailability | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'inmobiliaria.consignaciones.filters.all' },
  { value: 'available', labelKey: 'inmobiliaria.consignaciones.filters.available' },
  { value: 'rented', labelKey: 'inmobiliaria.consignaciones.filters.rented' },
  { value: 'in_process', labelKey: 'inmobiliaria.consignaciones.filters.inProcess' },
  { value: 'maintenance', labelKey: 'inmobiliaria.consignaciones.filters.maintenance' },
];

const PROPERTY_TYPE_OPTIONS: { value: Consignacion['propertyType'] | 'all'; labelKey: string; icon: React.ElementType }[] = [
  { value: 'all', labelKey: 'inmobiliaria.consignaciones.filters.allTypes', icon: Buildings },
  { value: 'apartment', labelKey: 'inmobiliaria.consignaciones.filters.apartment', icon: Buildings },
  { value: 'house', labelKey: 'inmobiliaria.consignaciones.filters.house', icon: House },
  { value: 'studio', labelKey: 'inmobiliaria.consignaciones.filters.studio', icon: Buildings },
  { value: 'commercial', labelKey: 'inmobiliaria.consignaciones.filters.commercial', icon: Storefront },
  { value: 'office', labelKey: 'inmobiliaria.consignaciones.filters.office', icon: Briefcase },
  { value: 'warehouse', labelKey: 'inmobiliaria.consignaciones.filters.warehouse', icon: Warehouse },
];

/**
 * ConsignacionFilters - Inline filter bar for consignacion portfolio page
 * Uses pill-style tabs and compact dropdowns
 */
export function ConsignacionFilters({
  filters,
  onFiltersChange,
  consignaciones,
  propietarios,
  agentes,
}: ConsignacionFiltersProps) {
  const { t } = useI18n();

  // Extract unique cities from consignaciones
  const uniqueCities = useMemo(() => {
    const cities = new Set(consignaciones.map((c) => c.propertyCity));
    return Array.from(cities).sort();
  }, [consignaciones]);

  // Count active filters (excluding search and availability tabs)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.agenteId !== 'all') count++;
    if (filters.propietarioId !== 'all') count++;
    if (filters.city !== 'all') count++;
    if (filters.propertyType !== 'all') count++;
    return count;
  }, [filters]);

  const hasAnyFilter = filters.search || filters.availability !== 'all' || activeFiltersCount > 0;

  const updateFilter = <K extends keyof ConsignacionFiltersState>(
    key: K,
    value: ConsignacionFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      availability: 'all',
      agenteId: 'all',
      propietarioId: 'all',
      city: 'all',
      propertyType: 'all',
    });
  };

  // Get labels for current selections
  const getAgenteLabel = () => {
    if (filters.agenteId === 'all') return t('inmobiliaria.consignaciones.filters.agentLabel');
    const agente = agentes.find((a) => a.id === filters.agenteId);
    return agente?.name || t('inmobiliaria.consignaciones.filters.agentLabel');
  };

  const getPropietarioLabel = () => {
    if (filters.propietarioId === 'all') return t('inmobiliaria.consignaciones.filters.ownerLabel');
    const prop = propietarios.find((p) => p.id === filters.propietarioId);
    return prop?.name || t('inmobiliaria.consignaciones.filters.ownerLabel');
  };

  const getCityLabel = () => {
    return filters.city === 'all' ? t('inmobiliaria.consignaciones.filters.cityLabel') : filters.city;
  };

  const getPropertyTypeLabel = () => {
    if (filters.propertyType === 'all') return t('inmobiliaria.consignaciones.filters.typeLabel');
    const option = PROPERTY_TYPE_OPTIONS.find((o) => o.value === filters.propertyType);
    return option ? t(option.labelKey) : t('inmobiliaria.consignaciones.filters.typeLabel');
  };

  return (
    <div className="p-4 space-y-4 border-b border-border">
      {/* Row 1: Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          type="text"
          placeholder={t('inmobiliaria.consignaciones.filters.searchPlaceholder')}
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full pl-10 pr-4"
        />
        {filters.search && (
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => updateFilter('search', '')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            icon={<X className="w-4 h-4" />}
          />
        )}
      </div>

      {/* Row 2: Estado Tabs + Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Estado Tabs - Chip group */}
        <div className="flex items-center gap-1.5">
          {AVAILABILITY_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              selected={filters.availability === option.value}
              onClick={() => updateFilter('availability', option.value)}
              className="whitespace-nowrap"
            >
              {t(option.labelKey)}
            </Chip>
          ))}
        </div>

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-border" />

        {/* Agente Dropdown */}
        <Select
          value={filters.agenteId}
          onValueChange={(v) => updateFilter('agenteId', v as ConsignacionFiltersState['agenteId'])}
        >
          <SelectTrigger className="w-auto max-w-[160px] gap-2">
            <span className="truncate">{getAgenteLabel()}</span>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">{t('inmobiliaria.consignaciones.filters.allAgents')}</SelectItem>
            {agentes.map((agente) => (
              <SelectItem key={agente.id} value={agente.id}>
                <span className="flex items-center gap-2">
                  {agente.avatar ? (
                    <img src={agente.avatar} alt={agente.name} className="w-6 h-6 rounded-full" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs">
                      {agente.name.charAt(0)}
                    </span>
                  )}
                  <span className="truncate">{agente.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Propietario Dropdown */}
        <Select
          value={filters.propietarioId}
          onValueChange={(v) => updateFilter('propietarioId', v as ConsignacionFiltersState['propietarioId'])}
        >
          <SelectTrigger className="w-auto max-w-[160px] gap-2">
            <span className="truncate">{getPropietarioLabel()}</span>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">{t('inmobiliaria.consignaciones.filters.allOwners')}</SelectItem>
            {propietarios.map((prop) => (
              <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City Dropdown */}
        <Select
          value={filters.city}
          onValueChange={(v) => updateFilter('city', v as ConsignacionFiltersState['city'])}
        >
          <SelectTrigger className="w-auto min-w-[110px] gap-2">
            <span className="truncate">{getCityLabel()}</span>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">{t('inmobiliaria.consignaciones.filters.allCities')}</SelectItem>
            {uniqueCities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo Dropdown */}
        <Select
          value={filters.propertyType}
          onValueChange={(v) => updateFilter('propertyType', v as ConsignacionFiltersState['propertyType'])}
        >
          <SelectTrigger className="w-auto min-w-[120px] gap-2">
            <span className="truncate">{getPropertyTypeLabel()}</span>
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {t(option.labelKey)}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Clear Filters + Active Count */}
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
              {t('inmobiliaria.consignaciones.filters.clear')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default ConsignacionFilters;
