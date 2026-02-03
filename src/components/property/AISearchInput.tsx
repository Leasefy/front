'use client';

import { useState, useCallback, KeyboardEvent, useRef } from 'react';
import { Sparkles, ArrowUp, MapPin, Building, DollarSign, Bed, ChevronDown, Check, Home, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types/property';

/**
 * Filter options with their values
 */
const FILTER_OPTIONS = {
  ubicacion: {
    label: 'Ubicacion',
    icon: MapPin,
    options: ['Chapinero', 'Usaquen', 'Suba', 'Cedritos', 'Santa Barbara', 'Chico'],
  },
  tipo: {
    label: 'Tipo',
    icon: Building,
    options: ['Apartamento', 'Casa', 'Estudio', 'Penthouse', 'Loft'],
  },
  habitaciones: {
    label: 'Habitaciones',
    icon: Bed,
    options: ['1 habitacion', '2 habitaciones', '3 habitaciones', '4+ habitaciones'],
  },
  precio: {
    label: 'Precio',
    icon: DollarSign,
    options: ['Hasta $1M', '$1M - $2M', '$2M - $3M', '$3M - $5M', 'Mas de $5M'],
  },
};

type FilterKey = keyof typeof FILTER_OPTIONS;

interface AISearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  isSearching?: boolean;
  /** AI search results to display */
  results?: Property[];
  /** Whether to show results panel */
  showResults?: boolean;
}

/**
 * Modern AI search input with results panel
 */
export function AISearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Describe el inmueble que buscas...',
  className,
  isSearching = false,
  results = [],
  showResults = false,
}: AISearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<FilterKey, string | null>>({
    ubicacion: null,
    tipo: null,
    habitaciones: null,
    precio: null,
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (value.trim() && !isSearching) {
      onSearch(value.trim());
    }
  }, [value, onSearch, isSearching]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleFilterClick = (filterKey: FilterKey) => {
    setActiveFilter(activeFilter === filterKey ? null : filterKey);
  };

  const handleOptionSelect = (filterKey: FilterKey, option: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterKey]: prev[filterKey] === option ? null : option,
    }));

    const currentValue = value.trim();
    let newValue = currentValue;
    const existingFilters = Object.entries(selectedFilters)
      .filter(([key, val]) => val && key === filterKey)
      .map(([, val]) => val);

    existingFilters.forEach(existing => {
      if (existing) {
        newValue = newValue.replace(existing, '').trim();
      }
    });

    if (selectedFilters[filterKey] !== option) {
      newValue = newValue ? `${newValue}, ${option}` : option;
    }

    onChange(newValue.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, ''));
    setActiveFilter(null);
  };

  const formatPrice = (price?: number) => {
    if (!price) return '$--';
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className={cn('w-full max-w-2xl', className)}>
      {/* Main Search Container */}
      <div
        className={cn(
          'relative bg-white dark:bg-card border transition-all duration-200 overflow-visible',
          'rounded-sm',
          isFocused || activeFilter
            ? 'border-border shadow-lg'
            : 'border-border shadow-md hover:shadow-lg'
        )}
      >
        {/* Top Row - Textarea */}
        <div className="relative px-5 pt-4 pb-3">
          <div className="flex items-start gap-3">
            {/* AI Sparkle Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {isSearching ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              ) : (
                <Sparkles className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              aria-label="Búsqueda inteligente de propiedades"
              disabled={isSearching}
              rows={2}
              className={cn(
                'flex-1 bg-transparent border-0 outline-none resize-none',
                'text-[15px] text-foreground placeholder:text-muted-foreground',
                'leading-relaxed',
                'disabled:cursor-not-allowed min-h-[52px]'
              )}
            />
          </div>
        </div>

        {/* Bottom Row - Filter Options */}
        <div className="px-4 pb-3 flex items-center justify-between gap-3 relative z-50">
          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-visible">
            {(Object.keys(FILTER_OPTIONS) as FilterKey[]).map((filterKey) => {
              const filter = FILTER_OPTIONS[filterKey];
              const Icon = filter.icon;
              const isActive = activeFilter === filterKey;
              const hasSelection = selectedFilters[filterKey] !== null;

              return (
                <div key={filterKey} className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFilterClick(filterKey);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5',
                      'text-xs rounded-full transition-all',
                      'whitespace-nowrap',
                      isActive || hasSelection
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground bg-black/[0.04] hover:bg-black/[0.08] hover:text-foreground/80'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {hasSelection ? selectedFilters[filterKey] : filter.label}
                    <ChevronDown className={cn(
                      'w-3 h-3 transition-transform',
                      isActive && 'rotate-180'
                    )} />
                  </button>

                  {/* Dropdown */}
                  {isActive && (
                    <div className="absolute top-full left-0 mt-2 py-1 bg-white dark:bg-card border border-border dark:border-border rounded-sm shadow-xl z-[100] min-w-[180px]">
                      {filter.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect(filterKey, option);
                          }}
                          className={cn(
                            'w-full px-3 py-2.5 text-left text-sm flex items-center justify-between',
                            'hover:bg-black/5 transition-colors',
                            selectedFilters[filterKey] === option
                              ? 'text-foreground font-medium bg-black/5'
                              : 'text-foreground/70'
                          )}
                        >
                          {option}
                          {selectedFilters[filterKey] === option && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Send Button - Circular */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || isSearching}
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all',
              value.trim() && !isSearching
                ? 'bg-black text-white hover:bg-black/90 hover:scale-105'
                : 'bg-black/10 text-muted-foreground cursor-not-allowed'
            )}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border overflow-hidden"
            >
              <div className="px-5 py-4 flex items-center gap-3">
                <motion.div className="flex items-center gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-black/60"
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </motion.div>
                <span className="text-sm text-muted-foreground">
                  AI esta buscando propiedades para ti...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Results Panel */}
        <AnimatePresence>
          {showResults && !isSearching && results.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-border overflow-hidden"
            >
              <div className="p-4">
                {/* AI Response Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-sm bg-black flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      Encontre <span className="font-medium">{results.length} propiedades</span> que coinciden con tu busqueda.
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Basado en: {value}
                    </p>
                  </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.slice(0, 4).map((property) => (
                    <Link
                      key={property.id}
                      href={`/propiedades/${property.id}`}
                      className="group flex gap-3 p-3 bg-black/[0.02] hover:bg-black/[0.05] rounded-sm border border-transparent hover:border-border transition-all"
                    >
                      {/* Property Image */}
                      <div className="w-16 h-16 rounded-sm bg-black/10 flex-shrink-0 overflow-hidden">
                        {property.images?.[0] ? (
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Property Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground truncate group-hover:underline">
                          {property.title}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {property.neighborhood || property.city || 'Sin ubicación'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-medium text-foreground">
                            {formatPrice(property.monthlyRent)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {property.bedrooms || '-'} hab · {property.area || '-'}m²
                          </span>
                        </div>
                      </div>

                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground flex-shrink-0 mt-1" />
                    </Link>
                  ))}
                </div>

                {/* View All Link */}
                {results.length > 4 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button className="text-sm text-foreground hover:underline font-medium">
                      Ver las {results.length} propiedades encontradas
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close dropdown */}
      {activeFilter && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={() => setActiveFilter(null)}
        />
      )}
    </div>
  );
}
