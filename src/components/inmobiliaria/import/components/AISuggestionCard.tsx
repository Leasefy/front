'use client';

import { useState } from 'react';
import {
  Check,
  X,
  CaretDown,
  CaretUp,
  Warning,
  Sparkle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ImportProperty, AISuggestion } from '../lib/importTypes';

interface AISuggestionCardProps {
  property: ImportProperty;
  index: number;
  onToggleSelect: (rowIndex: number) => void;
  onAcceptSuggestion: (rowIndex: number, field: string) => void;
  onRejectSuggestion: (rowIndex: number, field: string) => void;
  onAcceptAll: (rowIndex: number) => void;
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getEffectiveValue(property: ImportProperty, field: string): string {
  const value = (property as unknown as Record<string, unknown>)[field];
  if (value === undefined || value === null) return '—';
  if (typeof value === 'number') {
    if (field === 'monthlyRent' || field === 'adminFee') return formatCOP(value);
    if (field === 'commissionPercent') return `${value}%`;
    return String(value);
  }
  return String(value);
}

function ConfidencePill({ confidence }: { confidence: AISuggestion['confidence'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono uppercase tracking-wide shrink-0',
        confidence === 'alta'
          ? 'bg-success-soft text-success'
          : confidence === 'media'
            ? 'bg-warning-soft text-warning'
            : 'bg-danger-soft text-danger'
      )}
    >
      {confidence}
    </span>
  );
}

function SuggestionRow({
  suggestion,
  rowIndex,
  onAccept,
  onReject,
}: {
  suggestion: AISuggestion;
  rowIndex: number;
  onAccept: (rowIndex: number, field: string) => void;
  onReject: (rowIndex: number, field: string) => void;
}) {
  const { t } = useI18n();

  const fieldLabel = t(`inmobiliaria.import.fields.${suggestion.field}` as Parameters<typeof t>[0]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-md transition-colors',
        suggestion.accepted === true
          ? 'bg-success-soft'
          : suggestion.accepted === false
            ? 'bg-neutral-50 dark:bg-neutral-800/50 opacity-60'
            : 'bg-white dark:bg-neutral-900'
      )}
    >
      {/* Left: Field + value */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {fieldLabel}
          </span>
          <ConfidencePill confidence={suggestion.confidence} />
        </div>
        <div
          className={cn(
            'font-mono text-sm mt-0.5',
            suggestion.accepted === false
              ? 'line-through text-neutral-400 dark:text-neutral-600'
              : suggestion.accepted === true
                ? 'text-success'
                : 'text-neutral-900 dark:text-white'
          )}
        >
          {suggestion.field === 'monthlyRent'
            ? formatCOP(Number(suggestion.suggestedValue))
            : suggestion.field === 'commissionPercent'
              ? `${suggestion.suggestedValue}%`
              : suggestion.suggestedValue}
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 italic mt-0.5 leading-relaxed">
          {suggestion.reasoning}
        </p>
      </div>

      {/* Right: Accept/Reject buttons */}
      {suggestion.accepted === null ? (
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            type="button"
            onClick={() => onAccept(rowIndex, suggestion.field)}
            title="Aceptar sugerencia"
            className="w-7 h-7 flex items-center justify-center rounded-sm border border-success/30 text-success hover:bg-success-soft transition-colors"
          >
            <Check className="w-3.5 h-3.5" weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => onReject(rowIndex, suggestion.field)}
            title="Rechazar sugerencia"
            className="w-7 h-7 flex items-center justify-center rounded-sm border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>
      ) : (
        <span
          className={cn(
            'text-xs font-mono uppercase tracking-wide shrink-0 mt-1',
            suggestion.accepted ? 'text-success' : 'text-neutral-400 dark:text-neutral-500'
          )}
        >
          {suggestion.accepted
            ? 'Aceptado'
            : 'Rechazado'}
        </span>
      )}
    </div>
  );
}

export function AISuggestionCard({
  property,
  index,
  onToggleSelect,
  onAcceptSuggestion,
  onRejectSuggestion,
  onAcceptAll,
}: AISuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    property.hasErrors || property.suggestions.length > 0
  );

  const pendingSuggestions = property.suggestions.filter((s) => s.accepted === null);
  const hasSuggestions = property.suggestions.length > 0;

  // Status
  const statusLabel = (() => {
    if (property.hasErrors) return 'Error';
    if (pendingSuggestions.length > 0) return `${pendingSuggestions.length} sugerencias`;
    if (hasSuggestions && pendingSuggestions.length === 0) return 'Listo';
    return 'Completo';
  })();

  const statusDotClass = (() => {
    if (property.hasErrors) return 'bg-danger';
    if (pendingSuggestions.length > 0) return 'bg-warning';
    return 'bg-success';
  })();

  const statusTextClass = (() => {
    if (property.hasErrors) return 'text-danger';
    if (pendingSuggestions.length > 0) return 'text-warning';
    return 'text-success';
  })();

  const displayTitle =
    property.propertyTitle ||
    property.propertyAddress ||
    `Propiedad fila ${property._rowIndex + 1}`;

  return (
    <div
      className="animate-stagger-in rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-[#1a1a1c]"
      style={{ animationDelay: `${Math.min(index, 20) * 50}ms` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={property.selected}
          onChange={() => onToggleSelect(property._rowIndex)}
          className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary cursor-pointer shrink-0"
          disabled={property.hasErrors}
          title={property.hasErrors ? 'No se puede importar: tiene errores sin resolver' : undefined}
        />

        {/* Title + Address */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
            {displayTitle}
          </p>
          {property.propertyAddress && property.propertyTitle && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {property.propertyAddress}
            </p>
          )}
        </div>

        {/* Status badge */}
        <div className={cn('flex items-center gap-1.5 shrink-0', statusTextClass)}>
          <div className={cn('w-1.5 h-1.5 rounded-full', statusDotClass)} />
          <span className="text-xs font-mono uppercase tracking-wide whitespace-nowrap">
            {statusLabel}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
        >
          {isExpanded ? (
            <CaretUp className="w-4 h-4" />
          ) : (
            <CaretDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 pb-4 pt-3 space-y-3">
          {/* Property summary pills */}
          <div className="flex flex-wrap gap-2">
            {property.propertyType && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                {property.propertyType}
              </span>
            )}
            {property.propertyCity && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                {property.propertyCity}
              </span>
            )}
            {property.propertyZone && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                {property.propertyZone}
              </span>
            )}
            {property.monthlyRent && property.monthlyRent > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-primary-soft text-primary">
                {formatCOP(property.monthlyRent)}/mes
              </span>
            )}
          </div>

          {/* Suggestions list */}
          {hasSuggestions && (
            <>
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkle className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
                    Sugerencias AI
                  </span>
                </div>
                <div className="space-y-1">
                  {property.suggestions.map((suggestion) => (
                    <SuggestionRow
                      key={suggestion.field}
                      suggestion={suggestion}
                      rowIndex={property._rowIndex}
                      onAccept={onAcceptSuggestion}
                      onReject={onRejectSuggestion}
                    />
                  ))}
                </div>

                {/* Accept all button (only when there are pending) */}
                {pendingSuggestions.length > 0 && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onAcceptAll(property._rowIndex)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-primary/30 text-primary hover:bg-primary-soft transition-colors font-medium"
                    >
                      <Sparkle className="w-3 h-3" />
                      Aceptar todas
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error messages */}
          {property.hasErrors && property.errorMessages.length > 0 && (
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-1.5">
              {property.errorMessages.map((msg, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-md bg-danger-soft border border-danger/30"
                >
                  <Warning className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <p className="text-xs text-danger">{msg}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
