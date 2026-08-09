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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { IconButton, MonoLabel } from '@leasefy/cadence';
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
    <Badge
      variant={
        confidence === 'alta' ? 'success' : confidence === 'media' ? 'warning' : 'destructive'
      }
      className="shrink-0"
    >
      {confidence}
    </Badge>
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
            ? 'bg-surface-muted opacity-60'
            : 'bg-surface dark:bg-ink'
      )}
    >
      {/* Left: Field + value */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-fg-muted dark:text-fg-subtle">
            {fieldLabel}
          </span>
          <ConfidencePill confidence={suggestion.confidence} />
        </div>
        <div
          className={cn(
            'font-mono text-sm mt-0.5',
            suggestion.accepted === false
              ? 'line-through text-fg-subtle dark:text-fg-muted'
              : suggestion.accepted === true
                ? 'text-success'
                : 'text-fg dark:text-white'
          )}
        >
          {suggestion.field === 'monthlyRent'
            ? formatCOP(Number(suggestion.suggestedValue))
            : suggestion.field === 'commissionPercent'
              ? `${suggestion.suggestedValue}%`
              : suggestion.suggestedValue}
        </div>
        <p className="text-xs text-fg-subtle dark:text-fg-muted italic mt-0.5 leading-relaxed">
          {suggestion.reasoning}
        </p>
      </div>

      {/* Right: Accept/Reject buttons */}
      {suggestion.accepted === null ? (
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            icon={<Check className="w-3.5 h-3.5" weight="bold" />}
            onClick={() => onAccept(rowIndex, suggestion.field)}
            aria-label="Aceptar sugerencia"
            title="Aceptar sugerencia"
            className="text-success border-success/30 hover:bg-success-soft"
          />
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            icon={<X className="w-3.5 h-3.5" weight="bold" />}
            onClick={() => onReject(rowIndex, suggestion.field)}
            aria-label="Rechazar sugerencia"
            title="Rechazar sugerencia"
          />
        </div>
      ) : (
        <MonoLabel
          className={cn(
            'text-xs shrink-0 mt-1',
            suggestion.accepted ? 'text-success' : 'text-fg-subtle dark:text-fg-muted'
          )}
        >
          {suggestion.accepted
            ? 'Aceptado'
            : 'Rechazado'}
        </MonoLabel>
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
      className="animate-stagger-in rounded-xl border border-border dark:border-border-strong overflow-hidden bg-surface dark:bg-[#14130F]"
      style={{ animationDelay: `${Math.min(index, 20) * 50}ms` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <Checkbox
          checked={property.selected}
          onCheckedChange={() => onToggleSelect(property._rowIndex)}
          className="shrink-0"
          disabled={property.hasErrors}
          title={property.hasErrors ? 'No se puede importar: tiene errores sin resolver' : undefined}
        />

        {/* Title + Address */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-fg dark:text-white text-sm truncate">
            {displayTitle}
          </p>
          {property.propertyAddress && property.propertyTitle && (
            <p className="text-xs text-fg-muted dark:text-fg-subtle truncate mt-0.5">
              {property.propertyAddress}
            </p>
          )}
        </div>

        {/* Status badge */}
        <div className={cn('flex items-center gap-1.5 shrink-0', statusTextClass)}>
          <div className={cn('w-1.5 h-1.5 rounded-full', statusDotClass)} />
          <MonoLabel className="text-xs whitespace-nowrap">
            {statusLabel}
          </MonoLabel>
        </div>

        {/* Expand toggle */}
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          icon={isExpanded ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
          onClick={() => setIsExpanded((v) => !v)}
          aria-label={isExpanded ? 'Contraer' : 'Expandir'}
          className="shrink-0"
        />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border-faint dark:border-border-strong px-4 pb-4 pt-3 space-y-3">
          {/* Property summary pills */}
          <div className="flex flex-wrap gap-2">
            {property.propertyType && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-muted dark:bg-ink text-xs font-mono text-fg-muted dark:text-fg-subtle">
                {property.propertyType}
              </span>
            )}
            {property.propertyCity && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-muted dark:bg-ink text-xs font-mono text-fg-muted dark:text-fg-subtle">
                {property.propertyCity}
              </span>
            )}
            {property.propertyZone && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-muted dark:bg-ink text-xs font-mono text-fg-muted dark:text-fg-subtle">
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
              <div className="border-t border-border-faint dark:border-border-strong pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkle className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-fg dark:text-fg-subtle uppercase tracking-wide">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      hideArrow
                      onClick={() => onAcceptAll(property._rowIndex)}
                      className="gap-1.5"
                    >
                      <Sparkle className="w-3 h-3" />
                      Aceptar todas
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error messages */}
          {property.hasErrors && property.errorMessages.length > 0 && (
            <div className="border-t border-border-faint dark:border-border-strong pt-3 space-y-1.5">
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
