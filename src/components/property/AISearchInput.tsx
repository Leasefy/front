'use client';

import { useState, useCallback, KeyboardEvent, useRef } from 'react';
import { ArrowUp, MapPin, Bed, House, ArrowSquareOut, X } from '@phosphor-icons/react';

/** Sparkle icon with 3 four-pointed stars */
function SparkleGradient({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sparkles-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8A9CFF" />
          <stop offset="100%" stopColor="#1A40FF" />
        </linearGradient>
      </defs>
      {/* Large star - centered */}
      <path
        d="M10 16c0-3.5 2.5-6 6-6c-3.5 0-6-2.5-6-6c0 3.5-2.5 6-6 6c3.5 0 6 2.5 6 6z"
        fill="url(#sparkles-gradient)"
      />
      {/* Small star top-right */}
      <path
        d="M18 9c0-1.5 1-2.5 2.5-2.5c-1.5 0-2.5-1-2.5-2.5c0 1.5-1 2.5-2.5 2.5c1.5 0 2.5 1 2.5 2.5z"
        fill="url(#sparkles-gradient)"
      />
      {/* Medium star bottom-right */}
      <path
        d="M19 20c0-2 1.5-3.5 3.5-3.5c-2 0-3.5-1.5-3.5-3.5c0 2-1.5 3.5-3.5 3.5c2 0 3.5 1.5 3.5 3.5z"
        fill="url(#sparkles-gradient)"
      />
    </svg>
  );
}
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Property } from '@/lib/types/property';

interface AISearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onMagnifyingGlass: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  isMagnifyingGlassing?: boolean;
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
  onMagnifyingGlass,
  onClear,
  placeholder = 'Describe el inmueble que buscas...',
  className,
  isMagnifyingGlassing = false,
  results = [],
  showResults = false,
}: AISearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (value.trim() && !isMagnifyingGlassing) {
      onMagnifyingGlass(value.trim());
    }
  }, [value, onMagnifyingGlass, isMagnifyingGlassing]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const formatPrice = (price?: number) => {
    if (!price) return '$--';
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className={cn('w-full max-w-2xl', className)}>
      {/* Main MagnifyingGlass Container */}
      <div
        className={cn(
          'relative bg-white dark:bg-card border transition-all duration-300 overflow-visible',
          'rounded-xl',
          isFocused
            ? 'border-primary/30 shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-2 ring-primary/10'
            : 'border-border shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:border-border'
        )}
      >
        {/* Top Row - Textarea */}
        <div className="relative px-5 pt-5 pb-3">
          <div className="flex items-start gap-4">
            {/* AI Sparkle Icon */}
            <div className="flex-shrink-0 mt-1 p-2 bg-gradient-to-br from-primary/10 to-primary/10 rounded-xl">
              {isMagnifyingGlassing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <SparkleGradient className="w-5 h-5" />
                </motion.div>
              ) : (
                <SparkleGradient className="w-5 h-5" />
              )}
            </div>

            {/* Textarea */}
            <Textarea
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              aria-label="Búsqueda inteligente de propiedades"
              disabled={isMagnifyingGlassing}
              rows={2}
              className={cn(
                'border-0 bg-transparent shadow-none resize-none px-0 py-0',
                'focus-visible:ring-0 focus-visible:border-0',
                'text-[15px] md:text-[15px] text-foreground placeholder:text-muted-foreground/70',
                'leading-relaxed',
                'disabled:cursor-not-allowed min-h-[52px]'
              )}
            />
          </div>
        </div>

        {/* Robottom Row - Clear + PaperPlaneTilt Button */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60">Pulsa Enter para buscar</p>
          <div className="flex items-center gap-2">
            {/* Clear button - shows when there's text or results */}
            {(value.trim() || showResults) && !isMagnifyingGlassing && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  onChange('');
                  onClear?.();
                }}
                aria-label="Limpiar búsqueda"
                className="flex-shrink-0 h-9 w-9"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              hideArrow
              onClick={handleSubmit}
              disabled={!value.trim() || isMagnifyingGlassing}
              aria-label="Buscar"
              className="flex-shrink-0 h-9 w-9"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        <AnimatePresence>
          {isMagnifyingGlassing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/50 overflow-hidden"
            >
              <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    >
                      <SparkleGradient className="w-4 h-4" />
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">
                      Analizando tu búsqueda...
                    </p>
                    {/* Progress bar */}
                    <div className="h-1 bg-surface-muted rounded-full overflow-hidden mt-2">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.8, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Results Panel */}
        <AnimatePresence>
          {showResults && !isMagnifyingGlassing && results.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-border/50 overflow-hidden"
            >
              <div className="p-5">
                {/* AI Response Header */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-success-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">
                      Encontré <span className="text-success font-mono tabular-nums">{results.length} propiedades</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Basado en: &ldquo;{value}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.slice(0, 4).map((property, index) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={`/propiedades/${property.id}`}
                        className="group flex gap-3 p-3 bg-surface-muted hover:bg-surface-hover rounded-xl border border-border/50 hover:border-border transition-all"
                      >
                        {/* Property Image */}
                        <div className="w-16 h-16 rounded-md bg-surface-muted flex-shrink-0 overflow-hidden">
                          {property.images?.[0] ? (
                            <img
                              src={property.images[0]}
                              alt={property.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <House className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Property Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {property.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                            {property.neighborhood || property.city || 'Sin ubicación'}
                          </p>
                          <div className="flex items-baseline gap-1.5 mt-1.5">
                            <span className="text-[14px] font-bold text-foreground font-mono tabular-nums">
                              {formatPrice(property.monthlyRent)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              /mes
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* View All Link */}
                {results.length > 4 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Button variant="link" hideArrow className="h-auto p-0 text-[13px] font-medium">
                      Ver las {results.length} propiedades encontradas →
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
