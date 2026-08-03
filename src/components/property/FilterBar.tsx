'use client';

import { SlidersHorizontal, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// Radix Select forbids empty-string item values — use a sentinel for "no filter".
const ALL = '__all__';
const priceKey = (min: number | null, max: number | null) => `${min ?? ''}~${max ?? ''}`;

/**
 * Horizontal filter bar with dropdowns - Zillow style.
 * Each filter is a real Cadence Select; actions are real Cadence Buttons.
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
  const cityValue = filters.city ?? ALL;
  const bedroomsValue = filters.bedrooms != null ? String(filters.bedrooms) : ALL;
  const typeValue = filters.propertyType ?? ALL;
  const priceValue = priceKey(filters.minPrice, filters.maxPrice);

  return (
    <div className="bg-card border-b border-border z-40">
      <div className="px-4 lg:px-6 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* City */}
          <Select value={cityValue} onValueChange={(v) => onCityChange(v === ALL ? null : v)}>
            <SelectTrigger className="h-9 w-auto min-w-[8rem] rounded-full" aria-label="Filtrar por ciudad">
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las ciudades</SelectItem>
              {availableCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Price */}
          <Select
            value={priceValue}
            onValueChange={(v) => {
              const range = PRICE_RANGES.find((r) => priceKey(r.min, r.max) === v) ?? PRICE_RANGES[0];
              onPriceRangeChange(range.min, range.max);
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-[8rem] rounded-full" aria-label="Filtrar por precio">
              <SelectValue placeholder="Precio" />
            </SelectTrigger>
            <SelectContent>
              {PRICE_RANGES.map((range) => (
                <SelectItem key={range.label} value={priceKey(range.min, range.max)}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bedrooms */}
          <Select
            value={bedroomsValue}
            onValueChange={(v) => onBedroomsChange(v === ALL ? null : Number(v))}
          >
            <SelectTrigger className="h-9 w-auto min-w-[8rem] rounded-full" aria-label="Filtrar por habitaciones">
              <SelectValue placeholder="Habitaciones" />
            </SelectTrigger>
            <SelectContent>
              {BEDROOM_OPTIONS.map((opt) => (
                <SelectItem key={opt.label} value={opt.value == null ? ALL : String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Property type */}
          <Select
            value={typeValue}
            onValueChange={(v) => onPropertyTypeChange(v === ALL ? null : (v as PropertyType))}
          >
            <SelectTrigger className="h-9 w-auto min-w-[8rem] rounded-full" aria-label="Filtrar por tipo">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.label} value={opt.value == null ? ALL : opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* More Filters Button */}
          <Button variant="outline" size="sm" hideArrow className="gap-2 rounded-full">
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </Button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              onClick={onReset}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Results count and sort */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="text-sm text-foreground">
            <span className="font-semibold font-mono tabular-nums">{resultsCount}</span>{' '}
            {resultsCount === 1 ? 'propiedad' : 'propiedades'} en arriendo
          </p>
          <Select defaultValue="recommended">
            <SelectTrigger
              className="h-9 w-auto gap-1 border-none bg-transparent px-2 text-sm text-muted-foreground hover:text-foreground"
              aria-label="Ordenar propiedades"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Ordenar: Recomendado</SelectItem>
              <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
              <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
              <SelectItem value="newest">Mas recientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
