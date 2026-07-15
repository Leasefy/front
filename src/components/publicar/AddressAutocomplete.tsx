'use client';

/**
 * AddressAutocomplete — controlled text input + accessible custom listbox for
 * Colombian address suggestions (proxied through /api/geocode/autocomplete).
 *
 * A11y: role="combobox" on the input, role="listbox"/"option" on the panel,
 * aria-activedescendant tracks keyboard navigation — mirrors the pattern in
 * PlanHeader's search combobox (src/components/ui/plan/PlanHeader.tsx).
 *
 * Degrades gracefully: on API error or zero results, the input stays fully
 * usable as free text (fail-closed — no fabricated coordinates).
 */

import { useId, useRef, useState } from 'react';
import { MapPin, WarningCircle } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAddressAutocomplete } from '@/lib/hooks/use-address-autocomplete';
import type { GeocodeSuggestion } from '@/lib/api/geocode.service';
import { cn } from '@/lib/utils';

export interface AddressSelection {
  address: string;
  city: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

export interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (selection: AddressSelection) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
}

const MIN_QUERY_LENGTH = 3;

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  disabled,
  id,
  placeholder,
  className,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { suggestions, isLoading, error } = useAddressAutocomplete(value);

  const showDropdown = isOpen && value.trim().length >= MIN_QUERY_LENGTH;
  const activeOptionId =
    activeIndex >= 0 && suggestions[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined;

  function selectSuggestion(suggestion: GeocodeSuggestion) {
    const address = suggestion.road || suggestion.label;
    onChangeText(address);
    onSelect({
      address,
      city: suggestion.city ?? '',
      neighborhood: suggestion.neighborhood ?? '',
      latitude: suggestion.lat,
      longitude: suggestion.lon,
      placeId: suggestion.placeId,
    });
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showDropdown || suggestions.length === 0) return;
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showDropdown || suggestions.length === 0) return;
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (showDropdown && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle z-10"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChangeText(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay so a click/mousedown on an option is processed first.
            blurTimerRef.current = setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          className={cn('pl-10 h-12 text-base', className)}
        />
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Sugerencias de dirección"
          className="absolute left-0 right-0 top-full mt-2 z-dropdown rounded-md border border-border bg-surface-raised shadow-md max-h-64 overflow-y-auto"
        >
          {isLoading && (
            <p className="px-4 py-3 text-sm text-fg-muted flex items-center gap-2">
              <Spinner size="sm" variant="muted" />
              Buscando direcciones…
            </p>
          )}
          {!isLoading && error && (
            <p className="px-4 py-3 text-sm text-error flex items-start gap-2">
              <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              No pudimos buscar direcciones. Podés seguir escribiendo la dirección manualmente.
            </p>
          )}
          {!isLoading && !error && suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-fg-muted">
              Sin resultados. Podés escribir la dirección manualmente.
            </p>
          )}
          {!isLoading &&
            !error &&
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion.placeId || `${suggestion.label}-${index}`}
                id={`${listboxId}-opt-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => {
                  // Keep focus on the input so onBlur doesn't close before onClick fires.
                  e.preventDefault();
                  if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                }}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm flex items-start gap-2',
                  index === activeIndex ? 'bg-surface-brand text-fg' : 'text-fg hover:bg-surface-sunken',
                )}
              >
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-fg-subtle" aria-hidden="true" />
                <span>{suggestion.label}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
