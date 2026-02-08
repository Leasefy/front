'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  X,
  CaretDown,
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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

const AVAILABILITY_OPTIONS: { value: PropertyAvailability | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'available', label: 'Disponible' },
  { value: 'rented', label: 'Arrendado' },
  { value: 'in_process', label: 'En proceso' },
  { value: 'maintenance', label: 'Mantenimiento' },
];

const PROPERTY_TYPE_OPTIONS: { value: Consignacion['propertyType'] | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Todos', icon: Buildings },
  { value: 'apartment', label: 'Apartamento', icon: Buildings },
  { value: 'house', label: 'Casa', icon: House },
  { value: 'studio', label: 'Estudio', icon: Buildings },
  { value: 'commercial', label: 'Local', icon: Storefront },
  { value: 'office', label: 'Oficina', icon: Briefcase },
  { value: 'warehouse', label: 'Bodega', icon: Warehouse },
];

/**
 * ConsignacionFilters - Filter bar for consignacion portfolio page
 * Includes search, availability, agente, propietario, city, and property type filters
 */
export function ConsignacionFilters({
  filters,
  onFiltersChange,
  consignaciones,
  propietarios,
  agentes,
}: ConsignacionFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Extract unique cities from consignaciones
  const uniqueCities = useMemo(() => {
    const cities = new Set(consignaciones.map((c) => c.propertyCity));
    return Array.from(cities).sort();
  }, [consignaciones]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.availability !== 'all') count++;
    if (filters.agenteId !== 'all') count++;
    if (filters.propietarioId !== 'all') count++;
    if (filters.city !== 'all') count++;
    if (filters.propertyType !== 'all') count++;
    return count;
  }, [filters]);

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
    if (filters.agenteId === 'all') return 'Todos';
    const agente = agentes.find((a) => a.id === filters.agenteId);
    return agente?.name || 'Todos';
  };

  const getPropietarioLabel = () => {
    if (filters.propietarioId === 'all') return 'Todos';
    const prop = propietarios.find((p) => p.id === filters.propietarioId);
    return prop?.name || 'Todos';
  };

  const getPropertyTypeLabel = () => {
    const option = PROPERTY_TYPE_OPTIONS.find((o) => o.value === filters.propertyType);
    return option?.label || 'Todos';
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por título o dirección..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all',
            showFilters || activeFiltersCount > 0
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
          )}
        >
          <Funnel className="w-4 h-4" />
          <span className="text-sm font-medium">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold min-w-[20px] text-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141416]">
              <div className="flex flex-wrap gap-4">
                {/* Availability Filter */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Estado
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateFilter('availability', option.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                          filters.availability === option.value
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agente Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Agente
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'agente' ? null : 'agente')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[150px] justify-between',
                      filters.agenteId !== 'all'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <span className="truncate max-w-[120px]">{getAgenteLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'agente' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-56 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-60 overflow-y-auto"
                      >
                        <button
                          onClick={() => { updateFilter('agenteId', 'all'); setOpenDropdown(null); }}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                            filters.agenteId === 'all'
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          )}
                        >
                          Todos
                        </button>
                        {agentes.map((agente) => (
                          <button
                            key={agente.id}
                            onClick={() => { updateFilter('agenteId', agente.id); setOpenDropdown(null); }}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
                              filters.agenteId === agente.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
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
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Propietario
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'propietario' ? null : 'propietario')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[150px] justify-between',
                      filters.propietarioId !== 'all'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <span className="truncate max-w-[120px]">{getPropietarioLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'propietario' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-56 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-60 overflow-y-auto"
                      >
                        <button
                          onClick={() => { updateFilter('propietarioId', 'all'); setOpenDropdown(null); }}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                            filters.propietarioId === 'all'
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          )}
                        >
                          Todos
                        </button>
                        {propietarios.map((prop) => (
                          <button
                            key={prop.id}
                            onClick={() => { updateFilter('propietarioId', prop.id); setOpenDropdown(null); }}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors truncate',
                              filters.propietarioId === prop.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
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
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Ciudad
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'city' ? null : 'city')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[120px] justify-between',
                      filters.city !== 'all'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <span>{filters.city === 'all' ? 'Todas' : filters.city}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'city' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-40 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20 max-h-60 overflow-y-auto"
                      >
                        <button
                          onClick={() => { updateFilter('city', 'all'); setOpenDropdown(null); }}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                            filters.city === 'all'
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          )}
                        >
                          Todas
                        </button>
                        {uniqueCities.map((city) => (
                          <button
                            key={city}
                            onClick={() => { updateFilter('city', city); setOpenDropdown(null); }}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                              filters.city === city
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                            )}
                          >
                            {city}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Property Type Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    Tipo
                  </label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'propertyType' ? null : 'propertyType')}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[120px] justify-between',
                      filters.propertyType !== 'all'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-[#1a1a1c] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    <span>{getPropertyTypeLabel()}</span>
                    <CaretDown className="w-4 h-4 shrink-0" />
                  </button>
                  <AnimatePresence>
                    {openDropdown === 'propertyType' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-40 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-20"
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
                                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              {option.label}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close dropdown on click outside */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}

export default ConsignacionFilters;
