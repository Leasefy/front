'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Example search queries for user guidance
 */
const EXAMPLE_QUERIES = [
  'Casa con piscina en Cali',
  'Estudio economico en Bogota',
  '3 habitaciones en El Poblado',
  'Apartamento amoblado 2M',
];

interface AISearchInputProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Callback when search is submitted */
  onSearch: (query: string) => void;
  /** Optional placeholder override */
  placeholder?: string;
  /** Optional CSS classes */
  className?: string;
}

/**
 * ChatGPT-style natural language search input
 * Large, prominent input with example queries and search button
 */
export function AISearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Describe lo que buscas... "Apto en Medellin, 80m2, 1-2M COP"',
  className,
}: AISearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onSearch(value.trim());
    }
  }, [value, onSearch]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleExampleClick = useCallback(
    (example: string) => {
      onChange(example);
      onSearch(example);
    },
    [onChange, onSearch]
  );

  const handleClear = useCallback(() => {
    onChange('');
    onSearch('');
  }, [onChange, onSearch]);

  return (
    <div className={cn('w-full', className)}>
      {/* Main Search Box */}
      <div
        className={cn(
          'bg-white rounded-sm border p-4 shadow-sm transition-all duration-200',
          isFocused
            ? 'border-gray-400 shadow-md'
            : 'border-gray-200 hover:border-gray-300'
        )}
      >
        <div className="relative">
          {/* Search Icon */}
          <Search
            className={cn(
              'absolute left-3 top-4 w-5 h-5 transition-colors duration-200',
              isFocused ? 'text-gray-600' : 'text-gray-400'
            )}
          />

          {/* Textarea Input */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            rows={2}
            className={cn(
              'w-full pl-11 pr-24 py-3 text-base resize-none',
              'border-0 focus:ring-0 focus:outline-none',
              'placeholder:text-gray-400 text-gray-900',
              'leading-relaxed'
            )}
          />

          {/* Search/Clear Button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  'text-xs text-gray-500 hover:text-gray-700',
                  'transition-colors duration-200'
                )}
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim()}
              className={cn(
                'px-4 py-2 rounded-sm text-sm font-medium',
                'transition-all duration-200',
                'flex items-center gap-2',
                value.trim()
                  ? 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              Buscar
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Example Chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Ejemplos:</span>
        {EXAMPLE_QUERIES.map((example, index) => (
          <span key={example} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExampleClick(example)}
              className={cn(
                'text-xs text-gray-600 hover:text-gray-900',
                'transition-colors duration-200 hover:underline'
              )}
            >
              {example}
            </button>
            {index < EXAMPLE_QUERIES.length - 1 && (
              <span className="text-gray-300">&middot;</span>
            )}
          </span>
        ))}
      </div>

      {/* Active Search Indicator */}
      {value && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-gray-500">
            Buscando propiedades que coincidan...
          </span>
        </div>
      )}
    </div>
  );
}
