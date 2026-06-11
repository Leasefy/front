'use client';

import { useState, useEffect } from 'react';
import { CaretDown, SlidersHorizontal, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PropertyFilters } from '@/lib/hooks/usePropertyFilters';
import type { PropertyType } from '@/lib/types/property';

export interface FilterBarProps {
  filters: PropertyFilters;
  onCityChange: (city: string | null) => void;
  onPriceRangeChange: (min: number | null, max: number | null) => void;
  onBedroomsChange: (bedrooms: number | null) => void;
  onPropertyTypeChange: (type: PropertyType | null) => void;
  onReset: () => void;
  availableCities: string[];
  resultsCount: number;
  hasActiveFilters: boolean;
}

const BEDROOM_OPTIONS = [
  { value: null, label: 'Cualquiera' },
  { value: 1, label: '1 hab' },
  { value: 2, label: '2 hab' },
  { value: 3, label: '3 hab' },
  { value: 4, label: '4+ hab' },
] as const;

const PROPERTY_TYPE_OPTIONS: { value: PropertyType | null; label: string }[] = [
  { value: null, label: 'Todos los tipos' },
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Estudio' },
  { value: 'room', label: 'Habitacion' },
];

const PRICE_RANGES = [
  { min: null, max: null, label: 'Cualquier precio' },
  { min: null, max: 1000000, label: 'Hasta $1M' },
  { min: 1000000, max: 2000000, label: '$1M - $2M' },
  { min: 2000000, max: 3500000, label: '$2M - $3.5M' },
  { min: 3500000, max: 5000000, label: '$3.5M - $5M' },
  { min: 5000000, max: null, label: 'Mas de $5M' },
];

/**
 * Horizontal filter bar with dropdowns - Zillow style
 */
export function FilterBar({
  filters,
  onCityChange,
  onPriceRangeChange,
  onBedroomsChange,
  onPropertyTypeChange,
  onReset,
  availableCities,
  resultsCount,
  hasActiveFilters,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openDropdown && !(e.target as Element).closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Get current price range label
  const getPriceLabel = () => {
    const range = PRICE_RANGES.find(
      r => r.min === filters.minPrice && r.max === filters.maxPrice
    );
    if (range) return range.label;
    if (filters.minPrice || filters.maxPrice) {
      const min = filters.minPrice ? `$${(filters.minPrice / 1000000).toFixed(1)}M` : '';
      const max = filters.maxPrice ? `$${(filters.maxPrice / 1000000).toFixed(1)}M` : '';
      return `${min} - ${max}`.replace(' - ', ' - ').replace(/^- | -$/g, '').trim() || 'Precio';
    }
    return 'Precio';
  };

  const getBedroomsLabel = () => {
    if (!filters.bedrooms) return 'Habitaciones';
    return filters.bedrooms === 4 ? '4+ hab' : `${filters.bedrooms} hab`;
  };

  const getTextTLabel = () => {
    const type = PROPERTY_TYPE_OPTIONS.find(t => t.value === filters.propertyType);
    return type?.label || 'Tipo';
  };

  const getCityLabel = () => {
    return filters.city || 'Ciudad';
  };

  return (
    <div className="bg-card border-b border-border z-40">
      <div className="px-4 lg:px-6 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* City Dropdown */}
          <FilterDropdown
            label={getCityLabel()}
            isOpen={openDropdown === 'city'}
            onToggle={() => toggleDropdown('city')}
            hasValue={!!filters.city}
          >
            <div className="p-2 w-48">
              <button
                onClick={() => { onCityChange(null); setOpenDropdown(null); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded hover:bg-muted',
                  !filters.city && 'bg-muted font-medium'
                )}
              >
                Todas las ciudades
              </button>
              {availableCities.map(city => (
                <button
                  key={city}
                  onClick={() => { onCityChange(city); setOpenDropdown(null); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded hover:bg-muted',
                    filters.city === city && 'bg-muted font-medium'
                  )}
                >
                  {city}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {/* Price Dropdown */}
          <FilterDropdown
            label={getPriceLabel()}
            isOpen={openDropdown === 'price'}
            onToggle={() => toggleDropdown('price')}
            hasValue={!!(filters.minPrice || filters.maxPrice)}
          >
            <div className="p-2 w-52">
              {PRICE_RANGES.map((range, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onPriceRangeChange(range.min, range.max);
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded hover:bg-muted',
                    filters.minPrice === range.min && filters.maxPrice === range.max && 'bg-muted font-medium'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {/* Bedrooms Dropdown */}
          <FilterDropdown
            label={getBedroomsLabel()}
            isOpen={openDropdown === 'bedrooms'}
            onToggle={() => toggleDropdown('bedrooms')}
            hasValue={!!filters.bedrooms}
          >
            <div className="p-2 w-40">
              {BEDROOM_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => { onBedroomsChange(opt.value); setOpenDropdown(null); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded hover:bg-muted',
                    filters.bedrooms === opt.value && 'bg-muted font-medium'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {/* Property TextT Dropdown */}
          <FilterDropdown
            label={getTextTLabel()}
            isOpen={openDropdown === 'type'}
            onToggle={() => toggleDropdown('type')}
            hasValue={!!filters.propertyType}
          >
            <div className="p-2 w-44">
              {PROPERTY_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => { onPropertyTypeChange(opt.value); setOpenDropdown(null); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded hover:bg-muted',
                    filters.propertyType === opt.value && 'bg-muted font-medium'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {/* More Filters Button */}
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>

        {/* Results count and sort */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{resultsCount}</span>{' '}
            {resultsCount === 1 ? 'propiedad' : 'propiedades'} en arriendo
          </p>
          <select
            className="text-sm text-muted-foreground bg-transparent border-none cursor-pointer hover:text-foreground"
            defaultValue="recommended"
            aria-label="Ordenar propiedades"
          >
            <option value="recommended">Ordenar: Recomendado</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="newest">Mas recientes</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/**
 * Dropdown component for filter bar
 */
function FilterDropdown({
  label,
  isOpen,
  onToggle,
  hasValue,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  hasValue: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative filter-dropdown">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm border rounded-sm transition-colors',
          hasValue
            ? 'border-foreground bg-foreground text-white'
            : 'border-border hover:bg-muted'
        )}
      >
        {label}
        <CaretDown className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-full left-0 mt-2 bg-card rounded-sm border border-border z-50 max-h-64 overflow-auto origin-top-left"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
