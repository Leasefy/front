'use client';

import { useEffect, useState } from 'react';
import {
  SpinnerGap,
  CheckCircle,
  Sparkle,
  Warning,
  MagicWand,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { analyzeProperties, mapRowsToProperties } from '../lib/gapFiller';
import { AISuggestionCard } from '../components/AISuggestionCard';
import type { ImportStepProps } from '../ImportWizard';
import type { ImportProperty } from '../lib/importTypes';

export function StepAIReview({ state, updateState }: ImportStepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(!state.aiAnalyzed);

  // Run analysis on mount (only once)
  useEffect(() => {
    if (state.aiAnalyzed) return;

    let cancelled = false;

    const run = async () => {
      setIsAnalyzing(true);

      // Map raw rows to ImportProperty objects
      const mapped = mapRowsToProperties(state.rawRows, state.columnMappings);

      // Simulate AI analysis delay
      await new Promise((r) => setTimeout(r, 2000));

      if (cancelled) return;

      // Run heuristic gap-filling
      const analyzed = analyzeProperties(mapped);

      updateState({ properties: analyzed, aiAnalyzed: true });
      setIsAnalyzing(false);
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived stats
  const properties = state.properties;
  const totalCount = properties.length;
  const errorCount = properties.filter((p) => p.hasErrors).length;
  const withSuggestions = properties.filter(
    (p) => !p.hasErrors && p.suggestions.some((s) => s.accepted === null)
  ).length;
  const readyCount = totalCount - errorCount - withSuggestions;
  const selectedCount = properties.filter((p) => p.selected).length;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  // Sort: errors first, then with pending suggestions, then complete
  const sortedProperties = [...properties].sort((a, b) => {
    const scoreA = a.hasErrors ? 2 : a.suggestions.some((s) => s.accepted === null) ? 1 : 0;
    const scoreB = b.hasErrors ? 2 : b.suggestions.some((s) => s.accepted === null) ? 1 : 0;
    return scoreB - scoreA;
  });

  // Handlers
  const handleToggleSelect = (rowIndex: number) => {
    updateState({
      properties: properties.map((p) =>
        p._rowIndex === rowIndex ? { ...p, selected: !p.selected } : p
      ),
    });
  };

  const handleAcceptSuggestion = (rowIndex: number, field: string) => {
    updateState({
      properties: properties.map((p) => {
        if (p._rowIndex !== rowIndex) return p;
        const updatedSuggestions = p.suggestions.map((s) => {
          if (s.field !== field) return s;
          return { ...s, accepted: true };
        });
        // Apply the accepted suggestion value to the property field
        const accepted = updatedSuggestions.find((s) => s.field === field);
        const fieldUpdate: Partial<ImportProperty> = {};
        if (accepted) {
          const numericFields = ['monthlyRent', 'adminFee', 'commissionPercent'];
          if (numericFields.includes(accepted.field)) {
            const num = Number(accepted.suggestedValue);
            (fieldUpdate as unknown as Record<string, unknown>)[accepted.field] = isNaN(num) ? 0 : num;
          } else {
            (fieldUpdate as unknown as Record<string, unknown>)[accepted.field] = accepted.suggestedValue;
          }
        }
        return { ...p, ...fieldUpdate, suggestions: updatedSuggestions };
      }),
    });
  };

  const handleRejectSuggestion = (rowIndex: number, field: string) => {
    updateState({
      properties: properties.map((p) => {
        if (p._rowIndex !== rowIndex) return p;
        return {
          ...p,
          suggestions: p.suggestions.map((s) =>
            s.field === field ? { ...s, accepted: false } : s
          ),
        };
      }),
    });
  };

  const handleAcceptAll = (rowIndex: number) => {
    updateState({
      properties: properties.map((p) => {
        if (p._rowIndex !== rowIndex) return p;
        const fieldUpdate: Partial<ImportProperty> = {};
        const updatedSuggestions = p.suggestions.map((s) => {
          if (s.accepted !== null) return s;
          const numericFields = ['monthlyRent', 'adminFee', 'commissionPercent'];
          if (numericFields.includes(s.field)) {
            const num = Number(s.suggestedValue);
            (fieldUpdate as unknown as Record<string, unknown>)[s.field] = isNaN(num) ? 0 : num;
          } else {
            (fieldUpdate as unknown as Record<string, unknown>)[s.field] = s.suggestedValue;
          }
          return { ...s, accepted: true };
        });
        return { ...p, ...fieldUpdate, suggestions: updatedSuggestions };
      }),
    });
  };

  const handleAcceptAllGlobal = () => {
    updateState({
      properties: properties.map((p) => {
        const fieldUpdate: Partial<ImportProperty> = {};
        const updatedSuggestions = p.suggestions.map((s) => {
          if (s.accepted !== null) return s;
          const numericFields = ['monthlyRent', 'adminFee', 'commissionPercent'];
          if (numericFields.includes(s.field)) {
            const num = Number(s.suggestedValue);
            (fieldUpdate as unknown as Record<string, unknown>)[s.field] = isNaN(num) ? 0 : num;
          } else {
            (fieldUpdate as unknown as Record<string, unknown>)[s.field] = s.suggestedValue;
          }
          return { ...s, accepted: true };
        });
        return { ...p, ...fieldUpdate, suggestions: updatedSuggestions };
      }),
    });
  };

  const handleToggleSelectAll = () => {
    const selectAll = !allSelected;
    updateState({
      properties: properties.map((p) =>
        p.hasErrors ? p : { ...p, selected: selectAll }
      ),
    });
  };

  // Loading skeleton
  if (isAnalyzing) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
            Revisión AI
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Analizando tus propiedades...
          </p>
        </div>

        {/* Shimmer loading */}
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <SpinnerGap className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-medium text-neutral-900 dark:text-white">
              Analizando {state.rawRows.length} propiedades...
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Detectando campos faltantes y generando sugerencias
            </p>
          </div>
        </div>

        {/* Shimmer skeleton cards */}
        <div className="space-y-3">
          {[...Array(Math.min(state.rawRows.length, 4))].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl overflow-hidden relative bg-neutral-100 dark:bg-neutral-800"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div
                className="absolute inset-0 animate-shimmer"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Results view
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
          Revisión AI
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Hemos analizado tus propiedades y generado sugerencias para los campos faltantes.
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {readyCount} completas
          </span>
        </div>

        {withSuggestions > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Sparkle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {withSuggestions} con sugerencias
            </span>
          </div>
        )}

        {errorCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <Warning className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              {errorCount} con errores
            </span>
          </div>
        )}
      </div>

      {/* Batch actions bar */}
      <div className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          {/* Select all toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </span>
          </label>
          <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
            {selectedCount} / {totalCount} seleccionadas
          </span>
        </div>

        {/* Accept all suggestions button */}
        {withSuggestions > 0 && (
          <button
            type="button"
            onClick={handleAcceptAllGlobal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-mono uppercase tracking-wide hover:bg-indigo-700 transition-colors"
          >
            <Sparkle className="w-3.5 h-3.5" />
            Aceptar todas las sugerencias
          </button>
        )}
      </div>

      {/* Empty state */}
      {properties.length === 0 && (
        <div className="py-12 text-center">
          <MagicWand className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-500 dark:text-neutral-400">No hay propiedades para revisar</p>
        </div>
      )}

      {/* Property list */}
      <div className={cn('space-y-3', properties.length > 5 ? 'max-h-[60vh] overflow-y-auto pr-1' : '')}>
        {sortedProperties.map((property, i) => (
          <AISuggestionCard
            key={property._rowIndex}
            property={property}
            index={i}
            onToggleSelect={handleToggleSelect}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onAcceptAll={handleAcceptAll}
          />
        ))}
      </div>
    </div>
  );
}
