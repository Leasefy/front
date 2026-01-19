'use client';

import { X, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
}

const BEDROOM_OPTIONS = [1, 2, 3, 4] as const;
const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Estudio' },
  { value: 'room', label: 'Habitacion' },
];

/**
 * Sidebar component for filtering properties
 * Collapsible on mobile, sticky on desktop
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
      {/* Results count and reset */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {resultsCount} {resultsCount === 1 ? 'propiedad' : 'propiedades'}
        </p>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* City filter */}
      <div className="space-y-2">
        <Label htmlFor="city-filter">Ciudad</Label>
        <select
          id="city-filter"
          value={filters.city ?? ''}
          onChange={(e) => onCityChange(e.target.value || null)}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1',
            'text-sm shadow-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
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
        <Label>Precio mensual (COP)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            onBlur={handleMinPriceBlur}
            className="h-9"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            onBlur={handleMaxPriceBlur}
            className="h-9"
          />
        </div>
      </div>

      {/* Bedrooms filter */}
      <div className="space-y-2">
        <Label>Habitaciones</Label>
        <div className="flex flex-wrap gap-2">
          {BEDROOM_OPTIONS.map((num) => (
            <Button
              key={num}
              variant={filters.bedrooms === num ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                onBedroomsChange(filters.bedrooms === num ? null : num)
              }
              className="min-w-[3rem]"
            >
              {num === 4 ? '4+' : num}
            </Button>
          ))}
        </div>
      </div>

      {/* Property type filter */}
      <div className="space-y-2">
        <Label>Tipo de propiedad</Label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPE_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              variant={filters.propertyType === value ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                onPropertyTypeChange(
                  filters.propertyType === value ? null : value
                )
              }
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="mb-4 w-full"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              Activos
            </span>
          )}
        </Button>
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
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {filterContent}
            <div className="mt-6">
              <Button className="w-full" onClick={() => setIsOpen(false)}>
                Ver resultados
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-8 rounded-lg border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Filtros</h2>
          {filterContent}
        </div>
      </aside>
    </>
  );
}
