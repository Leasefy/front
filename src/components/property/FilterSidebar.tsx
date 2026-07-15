'use client';

import { X, SlidersHorizontal, Check } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { Chip, IconButton } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { PropertyFilters } from '@/lib/hooks/usePropertyFilters';
import type { PropertyType } from '@/lib/types/property';

export interface FunnelSidebarProps {
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

// Radix Select forbids empty-string item values — sentinel for "all cities".
const CITY_ALL = '__all__';

const BEDROOM_OPTIONS = [1, 2, 3, 4] as const;
const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Estudio' },
  { value: 'room', label: 'Habitación' },
];

/**
 * FunnelSidebar - Luxterra style with refined UI
 * Clean design with subtle borders, better spacing, improved mobile drawer
 */
export function FunnelSidebar({
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
}: FunnelSidebarProps) {
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

  // Escape, scroll-lock and focus-trap are handled by Cadence Sheet (Radix Dialog).

  // Count active filters for badge
  const activeFunnelCount = [
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
        <div className="pb-6 border-b border-border">
          <Button
            variant="ghost"
            hideArrow
            onClick={() => onOnlyAffordableChange(!onlyAffordable)}
            className={cn(
              'w-full justify-start gap-3 p-4 h-auto rounded-md',
              onlyAffordable
                ? 'bg-[hsl(var(--success-50))] border border-[hsl(var(--success-100))] hover:bg-[hsl(var(--success-50))]'
                : 'bg-muted border border-border hover:bg-muted'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all duration-200',
                onlyAffordable
                  ? 'bg-[hsl(var(--success-500))] border-[hsl(var(--success-500))]'
                  : 'bg-card border-border'
              )}
            >
              {onlyAffordable && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-foreground tracking-tight">
                Solo propiedades para mí
              </p>
              <p className="text-xs text-muted-foreground tracking-tight mt-0.5">
                Filtrar por tu presupuesto y preferencias
              </p>
            </div>
            {onlyAffordable && (
              <span className="px-2 py-0.5 text-xs font-medium text-[hsl(var(--success-700))] bg-[hsl(var(--success-100))] rounded-full">
                Activo
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Results count and reset */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground tracking-tight" aria-live="polite" aria-atomic="true">
          <span className="font-medium text-foreground font-mono tabular-nums">{resultsCount}</span>{' '}
          {resultsCount === 1 ? 'resultado' : 'resultados'}
        </p>
        {hasActiveFilters && (
          <Button
            variant="link"
            hideArrow
            onClick={handleReset}
            className="h-auto p-0 text-xs tracking-tight text-foreground"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* City filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground tracking-tight">Ciudad</Label>
        <Select
          value={filters.city ?? CITY_ALL}
          onValueChange={(v) => onCityChange(v === CITY_ALL ? null : v)}
        >
          <SelectTrigger className="w-full" aria-label="Filtrar por ciudad">
            <SelectValue placeholder="Todas las ciudades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CITY_ALL}>Todas las ciudades</SelectItem>
            {availableCities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price range filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground tracking-tight">
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
              aria-label="Precio mínimo"
              className={cn(
                'h-11 rounded-md border bg-card text-sm placeholder:text-muted-foreground tracking-tight',
                'transition-all duration-200',
                'focus:ring-2 focus:ring-ring/20 focus:border-foreground',
                filters.minPrice
                  ? 'border-border bg-muted/50'
                  : 'border-border hover:border-border'
              )}
            />
          </div>
          <span className="text-muted-foreground">-</span>
          <div className="flex-1 relative">
            <Input
              type="number"
              placeholder="Max"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              onBlur={handleMaxPriceBlur}
              aria-label="Precio máximo"
              className={cn(
                'h-11 rounded-md border bg-card text-sm placeholder:text-muted-foreground tracking-tight',
                'transition-all duration-200',
                'focus:ring-2 focus:ring-ring/20 focus:border-foreground',
                filters.maxPrice
                  ? 'border-border bg-muted/50'
                  : 'border-border hover:border-border'
              )}
            />
          </div>
        </div>
      </div>

      {/* Bedrooms filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground tracking-tight">Habitaciones</Label>
        <div className="flex flex-wrap gap-2">
          {BEDROOM_OPTIONS.map((num) => (
            <Chip
              key={num}
              selected={filters.bedrooms === num}
              onClick={() =>
                onBedroomsChange(filters.bedrooms === num ? null : num)
              }
              aria-pressed={filters.bedrooms === num}
              aria-label={`${num === 4 ? '4 o más' : num} habitaciones`}
              className="font-mono tabular-nums"
            >
              {num === 4 ? '4+' : num}
            </Chip>
          ))}
        </div>
      </div>

      {/* Property type filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground tracking-tight">Tipo de propiedad</Label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPE_OPTIONS.map(({ value, label }) => (
            <Chip
              key={value}
              selected={filters.propertyType === value}
              onClick={() =>
                onPropertyTypeChange(
                  filters.propertyType === value ? null : value
                )
              }
              aria-pressed={filters.propertyType === value}
              aria-label={`Tipo de propiedad: ${label}`}
            >
              {label}
            </Chip>
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
          hideArrow
          onClick={() => setIsOpen(true)}
          className="mb-4 w-full gap-2 rounded-full"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeFunnelCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-foreground text-xs text-background font-medium font-mono tabular-nums">
              {activeFunnelCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile drawer — Cadence Sheet (bottom) */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          hideCloseButton
          data-lenis-prevent
          className="lg:hidden max-h-[85vh] overflow-y-auto rounded-t-[2px] p-0"
        >
          {/* Handle */}
          <div className="sticky top-0 z-10 bg-card pt-3 pb-2 border-b border-border">
            <div className="w-10 h-1 bg-border rounded-full mx-auto" aria-hidden="true" />
          </div>

          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-border">
            <SheetTitle className="text-lg font-medium text-foreground tracking-tight">Filtros</SheetTitle>
            <SheetClose asChild>
              <IconButton
                variant="ghost"
                icon={<X className="h-4 w-4" />}
                aria-label="Cerrar filtros"
                className="h-9 w-9 rounded-full bg-muted text-muted-foreground hover:bg-muted"
              />
            </SheetClose>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {filterContent}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 bg-card border-t border-border">
            <SheetClose asChild>
              <Button hideArrow className="w-full h-12 rounded-full text-sm">
                Ver {resultsCount} {resultsCount === 1 ? 'resultado' : 'resultados'}
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <Card className="sticky top-24 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-medium text-foreground tracking-tight">Filtros</h2>
            {activeFunnelCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-foreground font-medium font-mono tabular-nums">
                {activeFunnelCount} activo{activeFunnelCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {filterContent}
        </Card>
      </aside>
    </>
  );
}
