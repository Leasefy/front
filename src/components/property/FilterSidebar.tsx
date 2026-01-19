'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

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
 * FilterSidebar - Luxterra style
 * Minimal design, square corners, small text
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

  const filterContent = (
    <div className="space-y-6">
      {/* Personalization toggle - only for logged-in users with profile */}
      {showPersonalization && onOnlyAffordableChange && (
        <div className="pb-4 border-b border-gray-200">
          <button
            onClick={() => onOnlyAffordableChange(!onlyAffordable)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-sm transition-all',
              onlyAffordable
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-sm border flex items-center justify-center transition-colors',
                onlyAffordable
                  ? 'bg-green-600 border-green-600'
                  : 'bg-white border-gray-300'
              )}
            >
              {onlyAffordable && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-gray-900 tracking-tight">
                Solo propiedades para mi
              </p>
              <p className="text-xs text-gray-500 tracking-tight mt-0.5">
                Ver solo lo que calificas segun tu perfil
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Results count and reset */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 tracking-tight">
          {resultsCount} {resultsCount === 1 ? 'propiedad' : 'propiedades'}
        </p>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors tracking-tight"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* City filter */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-900 tracking-tight">Ciudad</Label>
        <select
          value={filters.city ?? ''}
          onChange={(e) => onCityChange(e.target.value || null)}
          className={cn(
            'flex h-10 w-full rounded-sm border border-gray-200 bg-white px-3 py-2',
            'text-xs text-gray-900 tracking-tight transition-colors',
            'focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300'
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
        <Label className="text-xs text-gray-900 tracking-tight">Precio mensual (COP)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            onBlur={handleMinPriceBlur}
            className="h-10 rounded-sm border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 tracking-tight"
          />
          <span className="text-gray-400 text-xs">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            onBlur={handleMaxPriceBlur}
            className="h-10 rounded-sm border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 tracking-tight"
          />
        </div>
      </div>

      {/* Bedrooms filter */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-900 tracking-tight">Habitaciones</Label>
        <div className="flex flex-wrap gap-2">
          {BEDROOM_OPTIONS.map((num) => (
            <button
              key={num}
              onClick={() =>
                onBedroomsChange(filters.bedrooms === num ? null : num)
              }
              className={cn(
                'h-9 min-w-[2.5rem] px-3 rounded-sm text-xs tracking-tight transition-all',
                filters.bedrooms === num
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              )}
            >
              {num === 4 ? '4+' : num}
            </button>
          ))}
        </div>
      </div>

      {/* Property type filter */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-900 tracking-tight">Tipo de propiedad</Label>
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
                'h-9 px-3 rounded-sm text-xs tracking-tight transition-all',
                filters.propertyType === value
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
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
            'mb-4 w-full flex items-center justify-center gap-2 h-10 rounded-sm',
            'bg-white text-gray-700 border border-gray-200',
            'text-xs tracking-tight transition-colors hover:bg-gray-50'
          )}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18M6 12h12M9 18h6" />
          </svg>
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 rounded-sm bg-gray-900 px-2 py-0.5 text-xs text-white">
              Activos
            </span>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-normal text-gray-900 tracking-tight">Filtros</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-sm bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {filterContent}
            <div className="mt-8">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full h-10 rounded-sm bg-gray-900 text-white text-xs tracking-tight hover:bg-gray-800 transition-colors"
              >
                Ver {resultsCount} resultados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 bg-white p-5 rounded-sm">
          <h2 className="mb-6 text-base font-normal text-gray-900 tracking-tight">Filtros</h2>
          {filterContent}
        </div>
      </aside>
    </>
  );
}
