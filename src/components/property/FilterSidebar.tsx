'use client';

import { X, SlidersHorizontal, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PropertyFilters } from '@/lib/hooks/usePropertyFilters';
import type { PropertyType } from '@/lib/types/property';

export interface FilterSidebarProps {
  filters: PropertyFilters;
  onCityChange: (city: string | null) => void;
  onPriceRangeChange: (min: number | null, max: number | null) => void;
  onBedroomsChange: (bedrooms: number | null) => void;
  onPropertyTypeChange: (type: PropertyType | null) => void;
  onReset: () => void;
  availableCities: string[];
  resultsCount: number;
  hasActiveFilters: boolean;
  /** Show personalization filter (only for logged-in users with profile) */
  showPersonalization?: boolean;
  /** Whether "only for me" filter is active */
  onlyAffordable?: boolean;
  /** Toggle "only for me" filter */
  onOnlyAffordableChange?: (value: boolean) => void;
}

const BEDROOM_OPTIONS = [1, 2, 3, 4] as const;
const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Estudio' },
  { value: 'room', label: 'Habitacion' },
];

/**
 * FilterSidebar - Luxterra style with refined UI
 * Clean design with subtle borders, better spacing, improved mobile drawer
 */
export function FilterSidebar({
  filters,
  onCityChange,
  onPriceRangeChange,
  onBedroomsChange,
  onPropertyTypeChange,
  onReset,
  availableCities,
  resultsCount,
  hasActiveFilters,
  showPersonalization = false,
  onlyAffordable = false,
  onOnlyAffordableChange,
}: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState(
    filters.minPrice?.toString() ?? ''
  );
  const [maxPriceInput, setMaxPriceInput] = useState(
    filters.maxPrice?.toString() ?? ''
  );

  // Sync inputs with filter state
  useEffect(() => {
    setMinPriceInput(filters.minPrice?.toString() ?? '');
    setMaxPriceInput(filters.maxPrice?.toString() ?? '');
  }, [filters.minPrice, filters.maxPrice]);

  const handleMinPriceBlur = () => {
    const value = minPriceInput ? parseInt(minPriceInput, 10) : null;
    onPriceRangeChange(
      value && !isNaN(value) ? value : null,
      filters.maxPrice
    );
  };

  const handleMaxPriceBlur = () => {
    const value = maxPriceInput ? parseInt(maxPriceInput, 10) : null;
    onPriceRangeChange(
      filters.minPrice,
      value && !isNaN(value) ? value : null
    );
  };

  const handleReset = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    onReset();
  };

  // Count active filters for badge
  const activeFilterCount = [
    filters.city,
    filters.minPrice,
    filters.maxPrice,
    filters.bedrooms,
    filters.propertyType,
    onlyAffordable,
  ].filter(Boolean).length;

  const filterContent = (
    <div className="space-y-6">
      {/* Personalization toggle - premium feature */}
      {showPersonalization && onOnlyAffordableChange && (
        <div className="pb-6 border-b border-gray-100">
          <button
            onClick={() => onOnlyAffordableChange(!onlyAffordable)}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-sm transition-all duration-200',
              onlyAffordable
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all duration-200',
                onlyAffordable
                  ? 'bg-green-600 border-green-600'
                  : 'bg-white border-gray-300'
              )}
            >
              {onlyAffordable && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-gray-900 tracking-tight">
                Solo propiedades para mi
              </p>
              <p className="text-xs text-gray-500 tracking-tight mt-0.5">
                Filtrar por tu presupuesto y preferencias
              </p>
            </div>
            {onlyAffordable && (
              <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-sm">
                Activo
              </span>
            )}
          </button>
        </div>
      )}

      {/* Results count and reset */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 tracking-tight">
          <span className="font-medium text-gray-900">{resultsCount}</span>{' '}
          {resultsCount === 1 ? 'resultado' : 'resultados'}
        </p>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-xs text-violet-600 hover:text-violet-700 transition-colors tracking-tight hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* City filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700 tracking-tight">Ciudad</Label>
        <select
          value={filters.city ?? ''}
          onChange={(e) => onCityChange(e.target.value || null)}
          className={cn(
            'flex h-11 w-full rounded-sm border bg-white px-3 py-2',
            'text-sm text-gray-900 tracking-tight',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500',
            filters.city
              ? 'border-violet-300 bg-violet-50/50'
              : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <option value="">Todas las ciudades</option>
          {availableCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Price range filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700 tracking-tight">
          Precio mensual (COP)
        </Label>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              type="number"
              placeholder="Min"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              onBlur={handleMinPriceBlur}
              className={cn(
                'h-11 rounded-sm border bg-white text-sm placeholder:text-gray-400 tracking-tight',
                'transition-all duration-200',
                'focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500',
                filters.minPrice
                  ? 'border-violet-300 bg-violet-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            />
          </div>
          <span className="text-gray-300">-</span>
          <div className="flex-1 relative">
            <Input
              type="number"
              placeholder="Max"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              onBlur={handleMaxPriceBlur}
              className={cn(
                'h-11 rounded-sm border bg-white text-sm placeholder:text-gray-400 tracking-tight',
                'transition-all duration-200',
                'focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500',
                filters.maxPrice
                  ? 'border-violet-300 bg-violet-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            />
          </div>
        </div>
      </div>

      {/* Bedrooms filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700 tracking-tight">Habitaciones</Label>
        <div className="flex flex-wrap gap-2">
          {BEDROOM_OPTIONS.map((num) => (
            <button
              key={num}
              onClick={() =>
                onBedroomsChange(filters.bedrooms === num ? null : num)
              }
              className={cn(
                'h-10 min-w-[3rem] px-4 rounded-sm text-sm tracking-tight transition-all duration-200',
                filters.bedrooms === num
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              )}
            >
              {num === 4 ? '4+' : num}
            </button>
          ))}
        </div>
      </div>

      {/* Property type filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700 tracking-tight">Tipo de propiedad</Label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() =>
                onPropertyTypeChange(
                  filters.propertyType === value ? null : value
                )
              }
              className={cn(
                'h-10 px-4 rounded-sm text-sm tracking-tight transition-all duration-200',
                filters.propertyType === value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'mb-4 w-full flex items-center justify-center gap-2 h-11 rounded-sm',
            'bg-white text-gray-700 border border-gray-200',
            'text-sm tracking-tight transition-all duration-200',
            'hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99]'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-sm bg-gray-900 text-xs text-white font-medium">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in-up"
            style={{ animationDuration: '150ms' }}
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer */}
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white rounded-t-lg animate-fade-in-up"
            style={{ animationDuration: '200ms' }}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-white pt-3 pb-2 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900 tracking-tight">Filtros</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-sm bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {filterContent}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-white border-t border-gray-100">
              <button
                onClick={() => setIsOpen(false)}
                className={cn(
                  'w-full h-12 rounded-sm text-sm font-medium tracking-tight transition-all duration-200',
                  'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.99]'
                )}
              >
                Ver {resultsCount} {resultsCount === 1 ? 'resultado' : 'resultados'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-24 bg-white p-6 rounded-sm shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-medium text-gray-900 tracking-tight">Filtros</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-sm bg-violet-100 text-xs text-violet-700 font-medium">
                {activeFilterCount} activo{activeFilterCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {filterContent}
        </div>
      </aside>
    </>
  );
}
