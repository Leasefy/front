'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  X,
  CaretDown,
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="p-4 space-y-4 border-b border-border" ref={dropdownRef}>
      {/* Row 1: Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('inmobiliaria.consignaciones.filters.searchPlaceholder')}
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Row 2: Estado Tabs + Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Estado Tabs - Pill Style */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
          {AVAILABILITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateFilter('availability', option.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                filters.availability === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-border" />

        {/* Agente Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'agente' ? null : 'agente')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
              filters.agenteId !== 'all'
                ? 'bg-indigo-600 text-white uppercase tracking-wide font-mono border-indigo-500'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            <span className="truncate max-w-[100px]">{getAgenteLabel()}</span>
            <CaretDown className={cn('w-4 h-4 shrink-0 transition-transform', openDropdown === 'agente' && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {openDropdown === 'agente' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-2 w-56 p-2 rounded-xl border border-border bg-card shadow-xl z-50 max-h-60 overflow-y-auto"
              >
                <button
                  onClick={() => { updateFilter('agenteId', 'all'); setOpenDropdown(null); }}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                    filters.agenteId === 'all'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {t('inmobiliaria.consignaciones.filters.allAgents')}
                </button>
                {agentes.map((agente) => (
                  <button
                    key={agente.id}
                    onClick={() => { updateFilter('agenteId', agente.id); setOpenDropdown(null); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      filters.agenteId === agente.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {agente.avatar ? (
                      <img src={agente.avatar} alt={agente.name} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {agente.name.charAt(0)}
                      </div>
                    )}
                    <span className="truncate">{agente.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Propietario Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'propietario' ? null : 'propietario')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
              filters.propietarioId !== 'all'
                ? 'bg-indigo-600 text-white uppercase tracking-wide font-mono border-indigo-500'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            <span className="truncate max-w-[100px]">{getPropietarioLabel()}</span>
            <CaretDown className={cn('w-4 h-4 shrink-0 transition-transform', openDropdown === 'propietario' && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {openDropdown === 'propietario' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-2 w-56 p-2 rounded-xl border border-border bg-card shadow-xl z-50 max-h-60 overflow-y-auto"
              >
                <button
                  onClick={() => { updateFilter('propietarioId', 'all'); setOpenDropdown(null); }}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                    filters.propietarioId === 'all'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {t('inmobiliaria.consignaciones.filters.allOwners')}
                </button>
                {propietarios.map((prop) => (
                  <button
                    key={prop.id}
                    onClick={() => { updateFilter('propietarioId', prop.id); setOpenDropdown(null); }}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors truncate',
                      filters.propietarioId === prop.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {prop.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* City Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'city' ? null : 'city')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
              filters.city !== 'all'
                ? 'bg-indigo-600 text-white uppercase tracking-wide font-mono border-indigo-500'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            <span>{getCityLabel()}</span>
            <CaretDown className={cn('w-4 h-4 shrink-0 transition-transform', openDropdown === 'city' && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {openDropdown === 'city' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-2 w-44 p-2 rounded-xl border border-border bg-card shadow-xl z-50 max-h-60 overflow-y-auto"
              >
                <button
                  onClick={() => { updateFilter('city', 'all'); setOpenDropdown(null); }}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                    filters.city === 'all'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {t('inmobiliaria.consignaciones.filters.allCities')}
                </button>
                {uniqueCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => { updateFilter('city', city); setOpenDropdown(null); }}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      filters.city === city
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {city}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tipo Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'propertyType' ? null : 'propertyType')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
              filters.propertyType !== 'all'
                ? 'bg-indigo-600 text-white uppercase tracking-wide font-mono border-indigo-500'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            <span>{getPropertyTypeLabel()}</span>
            <CaretDown className={cn('w-4 h-4 shrink-0 transition-transform', openDropdown === 'propertyType' && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {openDropdown === 'propertyType' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-2 w-44 p-2 rounded-xl border border-border bg-card shadow-xl z-50"
              >
                {PROPERTY_TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => { updateFilter('propertyType', option.value); setOpenDropdown(null); }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                        filters.propertyType === option.value
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clear Filters + Active Count */}
        {hasAnyFilter && (
          <>
            <div className="hidden sm:block w-px h-6 bg-border" />
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <X className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.filters.clear')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ConsignacionFilters;
