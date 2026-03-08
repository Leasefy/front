'use client';

import { X, SlidersHorizontal, Check } from '@phosphor-icons/react';
import { useState, useEffect, useCallback, useRef } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
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

  // Handle Escape key to close drawer
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  // Add keyboard listener when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the close button when drawer opens
      closeButtonRef.current?.focus();
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

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
          <button
            onClick={() => onOnlyAffordableChange(!onlyAffordable)}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-sm transition-all duration-200',
              onlyAffordable
                ? 'bg-[hsl(var(--success-50))] border border-[hsl(var(--success-100))]'
                : 'bg-muted border border-border hover:bg-muted hover:border-border'
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
              <span className="px-2 py-0.5 text-xs font-medium text-[hsl(var(--success-700))] bg-[hsl(var(--success-100))] rounded-sm">
                Activo
              </span>
            )}
          </button>
        </div>
      )}

      {/* Results count and reset */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground tracking-tight" aria-live="polite" aria-atomic="true">
          <span className="font-medium text-foreground">{resultsCount}</span>{' '}
          {resultsCount === 1 ? 'resultado' : 'resultados'}
        </p>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-xs text-foreground hover:text-foreground transition-colors tracking-tight hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* City filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground tracking-tight">Ciudad</Label>
        <select
          value={filters.city ?? ''}
          onChange={(e) => onCityChange(e.target.value || null)}
          aria-label="Filtrar por ciudad"
          className={cn(
            'flex h-11 w-full rounded-sm border bg-card px-3 py-2',
            'text-sm text-foreground tracking-tight',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground',
            filters.city
              ? 'border-border bg-muted/50'
              : 'border-border hover:border-border'
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
                'h-11 rounded-sm border bg-card text-sm placeholder:text-muted-foreground tracking-tight',
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
                'h-11 rounded-sm border bg-card text-sm placeholder:text-muted-foreground tracking-tight',
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
            <button
              key={num}
              onClick={() =>
                onBedroomsChange(filters.bedrooms === num ? null : num)
              }
              aria-pressed={filters.bedrooms === num}
              aria-label={`${num === 4 ? '4 o más' : num} habitaciones`}
              className={cn(
                'h-10 min-w-[3rem] px-4 rounded-sm text-sm tracking-tight transition-all duration-200',
                filters.bedrooms === num
                  ? 'bg-foreground text-white shadow-sm'
                  : 'bg-card text-foreground border border-border hover:bg-muted hover:border-border'
              )}
            >
              {num === 4 ? '4+' : num}
            </button>
          ))}
        </div>
      </div>

      {/* Property type filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground tracking-tight">Tipo de propiedad</Label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() =>
                onPropertyTypeChange(
                  filters.propertyType === value ? null : value
                )
              }
              aria-pressed={filters.propertyType === value}
              aria-label={`Tipo de propiedad: ${label}`}
              className={cn(
                'h-10 px-4 rounded-sm text-sm tracking-tight transition-all duration-200',
                filters.propertyType === value
                  ? 'bg-foreground text-white shadow-sm'
                  : 'bg-card text-foreground border border-border hover:bg-muted hover:border-border'
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
            'bg-card text-foreground border border-border',
            'text-sm tracking-tight transition-all duration-200',
            'hover:bg-muted hover:border-border active:scale-[0.99]'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeFunnelCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-sm bg-foreground text-xs text-white font-medium">
              {activeFunnelCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[300] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-drawer-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in-up"
            style={{ animationDuration: '150ms' }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div
            ref={drawerRef}
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-card rounded-t-[2px] animate-fade-in-up"
            style={{ animationDuration: '200ms' }}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-card pt-3 pb-2 border-b border-border">
              <div className="w-10 h-1 bg-border rounded-full mx-auto" aria-hidden="true" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <h2 id="filter-drawer-title" className="text-lg font-medium text-foreground tracking-tight">Filtros</h2>
              <button
                ref={closeButtonRef}
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-sm bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Cerrar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {filterContent}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-card border-t border-border">
              <button
                onClick={() => setIsOpen(false)}
                className={cn(
                  'w-full h-12 rounded-sm text-sm font-medium tracking-tight transition-all duration-200',
                  'bg-foreground text-white hover:bg-foreground active:scale-[0.99]'
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
        <div className="sticky top-24 bg-card p-6 rounded-sm shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-medium text-foreground tracking-tight">Filtros</h2>
            {activeFunnelCount > 0 && (
              <span className="px-2 py-0.5 rounded-sm bg-muted text-xs text-foreground font-medium">
                {activeFunnelCount} activo{activeFunnelCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {filterContent}
        </div>
      </aside>
    </>
  );
}
