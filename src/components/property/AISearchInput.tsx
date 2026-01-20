'use client';

import { useState, useCallback, KeyboardEvent, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Example search queries for user guidance
 * Varied examples showing different search patterns
 */
const EXAMPLE_QUERIES = [
  'Apartamento en Bogota con 2 habitaciones',
  'Casa con piscina en Medellin',
  'Estudio economico en Chapinero',
  '3 habitaciones cerca al parque',
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
  /** Whether search is currently processing */
  isSearching?: boolean;
}

/**
 * ChatGPT-style natural language search input
 * Large, conversational input with AI indicator, animations, and loading states
 */
export function AISearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Describe tu hogar ideal...',
  className,
  isSearching = false,
}: AISearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  const handleSubmit = useCallback(() => {
    if (value.trim() && !isSearching) {
      setHasSearched(true);
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

  const handleExampleClick = useCallback(
    (example: string) => {
      onChange(example);
      setHasSearched(true);
      onSearch(example);
    },
    [onChange, onSearch]
  );

  const handleClear = useCallback(() => {
    onChange('');
    setHasSearched(false);
    onSearch('');
    textareaRef.current?.focus();
  }, [onChange, onSearch]);

  return (
    <div className={cn('w-full', className)}>
      {/* Main Search Box - ChatGPT style */}
      <div
        className={cn(
          'relative bg-white rounded-sm border transition-all duration-300',
          isFocused
            ? 'border-gray-400 shadow-lg'
            : 'border-gray-200 hover:border-gray-300 shadow-sm'
        )}
      >
        {/* AI Indicator */}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-sm bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center',
            isSearching && 'animate-pulse-subtle'
          )}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Textarea Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={1}
          disabled={isSearching}
          className={cn(
            'w-full pl-16 pr-28 py-4 text-base resize-none min-h-[56px]',
            'border-0 focus:ring-0 focus:outline-none',
            'placeholder:text-gray-400 text-gray-900',
            'leading-relaxed tracking-tight',
            'disabled:bg-white disabled:cursor-not-allowed'
          )}
        />

        {/* Action Buttons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {value && !isSearching && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-sm hover:bg-gray-100"
              aria-label="Limpiar busqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || isSearching}
            className={cn(
              'px-4 py-2.5 rounded-sm text-sm font-medium tracking-tight',
              'transition-all duration-200',
              'flex items-center gap-2',
              value.trim() && !isSearching
                ? 'bg-gray-900 text-white hover:bg-gray-800 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            Buscar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="mt-4 flex items-center gap-3 animate-fade-in-up">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-500 typing-dot" />
            <span className="w-2 h-2 rounded-full bg-violet-500 typing-dot" />
            <span className="w-2 h-2 rounded-full bg-violet-500 typing-dot" />
          </div>
          <span className="text-sm text-gray-500 tracking-tight">
            Buscando el inmueble de tus suenos...
          </span>
        </div>
      )}

      {/* Example Chips - Only show when no search active */}
      {!hasSearched && !isSearching && (
        <div className="mt-4 flex flex-wrap items-center gap-2 animate-fade-in-up">
          <span className="text-xs text-gray-500 tracking-tight">Prueba:</span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              className={cn(
                'px-3 py-1.5 text-xs text-gray-600 tracking-tight',
                'bg-white border border-gray-200 rounded-sm',
                'hover:bg-gray-50 hover:border-gray-300 transition-all duration-200',
                'active:scale-95'
              )}
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {/* Active Search Indicator */}
      {hasSearched && !isSearching && value && (
        <div className="mt-4 flex items-center gap-2 animate-fade-in-up">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-gray-500 tracking-tight">
            Mostrando resultados para &quot;{value}&quot;
          </span>
          <button
            onClick={handleClear}
            className="text-xs text-violet-600 hover:text-violet-700 tracking-tight hover:underline"
          >
            Nueva busqueda
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Typing dots animation component
 */
export function TypingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="w-2 h-2 rounded-full bg-violet-500 typing-dot" />
      <span className="w-2 h-2 rounded-full bg-violet-500 typing-dot" />
      <span className="w-2 h-2 rounded-full bg-violet-500 typing-dot" />
    </div>
  );
}
