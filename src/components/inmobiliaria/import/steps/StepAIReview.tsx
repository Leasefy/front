'use client';

import { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle,
  Sparkle,
  Warning,
  MagicWand,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { analyzeProperties, mapRowsToProperties } from '../lib/gapFiller';
import { recalcularEstado, escribirCampo } from '../lib/requisitosDelBack';
import { tituloSugerido } from '../lib/tituloSugerido';
import { AISuggestionCard } from '../components/AISuggestionCard';
import { RanuraDelPieSecundaria } from '../ImportWizard';
import type { ImportStepProps } from '../ImportWizard';
import type { ImportProperty } from '../lib/importTypes';

/** Con errores primero, después con sugerencias pendientes, después completas. */
function ordenarPorAtencion(properties: ImportProperty[]): ImportProperty[] {
  const puntaje = (p: ImportProperty) =>
    p.hasErrors ? 2 : p.suggestions.some((s) => s.accepted === null) ? 1 : 0;
  return [...properties].sort((a, b) => puntaje(b) - puntaje(a));
}

/** Una fila que no estaba cuando se fijó el orden va al final. */
function posicionEn(orden: number[], rowIndex: number): number {
  const i = orden.indexOf(rowIndex);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

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

      // Relleno de huecos + el veredicto del back.
      //
      // `analyzeProperties` sólo marcaba error por dirección; área, baños y
      // canon se evaluaban en el ÚLTIMO paso, donde no hay nada que editar.
      // Evaluarlos acá es lo que permite completarlos donde se ven.
      const analyzed = analyzeProperties(mapped).map(recalcularEstado);

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

  // Orden: con errores primero, después con sugerencias pendientes, después
  // las completas — pero decidido UNA vez, cuando llega el análisis. Si se
  // reordenara en vivo, la tarjeta que la persona está completando saltaría
  // al fondo con la última letra y el input perdería el foco.
  const [ordenFijo, setOrdenFijo] = useState<number[] | null>(null);
  useEffect(() => {
    if (ordenFijo !== null || !state.aiAnalyzed || properties.length === 0) return;
    setOrdenFijo(ordenarPorAtencion(properties).map((p) => p._rowIndex));
  }, [ordenFijo, state.aiAnalyzed, properties]);

  const sortedProperties = ordenFijo
    ? [...properties].sort(
        (a, b) => posicionEn(ordenFijo, a._rowIndex) - posicionEn(ordenFijo, b._rowIndex)
      )
    : ordenarPorAtencion(properties);

  // Handlers
  const handleToggleSelect = (rowIndex: number) => {
    updateState({
      properties: properties.map((p) =>
        p._rowIndex === rowIndex ? { ...p, selected: !p.selected } : p
      ),
    });
  };

  /**
   * Escribir un campo a mano. Recalcula el veredicto SIN tocar las
   * sugerencias: `analyzeProperties` las reconstruiría desde cero y se
   * perdería lo que la persona ya aceptó o rechazó.
   */
  const handleEditField = (rowIndex: number, campo: keyof ImportProperty, valor: string) => {
    updateState({
      properties: properties.map((p) =>
        p._rowIndex === rowIndex ? escribirCampo(p, campo, valor) : p
      ),
    });
  };

  const handleAcceptSuggestion = (rowIndex: number, field: string, valorEditado?: string) => {
    updateState({
      properties: properties.map((p) => {
        if (p._rowIndex !== rowIndex) return p;
        // Si la persona editó el valor, ES ese el que se guarda — y la
        // sugerencia queda registrada con lo que realmente se aceptó.
        const updatedSuggestions = p.suggestions.map((s) =>
          s.field === field
            ? { ...s, accepted: true, suggestedValue: valorEditado ?? s.suggestedValue }
            : s
        );
        const accepted = updatedSuggestions.find((s) => s.field === field);
        const fieldUpdate: Partial<ImportProperty> = {};
        if (accepted) {
          const numericFields = ['monthlyRent', 'salePrice', 'adminFee', 'commissionPercent'];
          if (numericFields.includes(accepted.field)) {
            const num = Number(accepted.suggestedValue);
            (fieldUpdate as unknown as Record<string, unknown>)[accepted.field] = isNaN(num) ? 0 : num;
          } else {
            (fieldUpdate as unknown as Record<string, unknown>)[accepted.field] = accepted.suggestedValue;
          }
        }
        // Aceptar el canon estimado tiene que DESBLOQUEAR el inmueble.
        return recalcularEstado({ ...p, ...fieldUpdate, suggestions: updatedSuggestions });
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
          const numericFields = ['monthlyRent', 'salePrice', 'adminFee', 'commissionPercent'];
          if (numericFields.includes(s.field)) {
            const num = Number(s.suggestedValue);
            (fieldUpdate as unknown as Record<string, unknown>)[s.field] = isNaN(num) ? 0 : num;
          } else {
            (fieldUpdate as unknown as Record<string, unknown>)[s.field] = s.suggestedValue;
          }
          return { ...s, accepted: true };
        });
        return recalcularEstado({ ...p, ...fieldUpdate, suggestions: updatedSuggestions });
      }),
    });
  };

  const handleAcceptAllGlobal = () => {
    updateState({
      properties: properties.map((p) => {
        const fieldUpdate: Partial<ImportProperty> = {};
        const updatedSuggestions = p.suggestions.map((s) => {
          if (s.accepted !== null) return s;
          const numericFields = ['monthlyRent', 'salePrice', 'adminFee', 'commissionPercent'];
          if (numericFields.includes(s.field)) {
            const num = Number(s.suggestedValue);
            (fieldUpdate as unknown as Record<string, unknown>)[s.field] = isNaN(num) ? 0 : num;
          } else {
            (fieldUpdate as unknown as Record<string, unknown>)[s.field] = s.suggestedValue;
          }
          return { ...s, accepted: true };
        });
        return recalcularEstado({ ...p, ...fieldUpdate, suggestions: updatedSuggestions });
      }),
    });
  };

  /**
   * Ponerle título a TODAS las que no tienen.
   *
   * Nico, 2026-09-10: quien sube 2.864 inmuebles no los va a nombrar uno por
   * uno. Ninguna inmobiliaria guarda títulos en su sistema —de las 2.895 filas
   * del archivo real, CERO traen uno—, así que el caso normal no es corregir
   * un título: es no tener ninguno.
   *
   * Toca SÓLO el título. Las demás sugerencias siguen esperando su turno: una
   * comisión o un canon estimado son otra decisión, y meterlos acá sería
   * aceptar cosas que la persona no miró.
   *
   * Y sólo donde falta: un título que la persona ya escribió no se pisa.
   */
  const ranuraDelPie = useContext(RanuraDelPieSecundaria);
  const sinTitulo = properties.filter((p) => !p.propertyTitle?.trim()).length;

  const handlePonerTitulosATodas = () => {
    updateState({
      properties: properties.map((p) => {
        if (p.propertyTitle?.trim()) return p;
        const titulo = tituloSugerido(
          p.propertyType,
          p.propertyCity,
          p.propertyZone,
        );
        return recalcularEstado({
          ...p,
          propertyTitle: titulo,
          suggestions: p.suggestions.map((s) =>
            s.field === 'propertyTitle' && s.accepted === null
              ? { ...s, accepted: true }
              : s,
          ),
        });
      }),
    });
  };

  const botonDeTitulos =
    sinTitulo > 0 ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        hideArrow
        onClick={handlePonerTitulosATodas}
        data-testid="titulos-a-todas"
        className="gap-2"
      >
        <Sparkle className="w-3.5 h-3.5" />
        {sinTitulo === 1
          ? 'Ponerle título'
          : `Ponerles título a las ${sinTitulo.toLocaleString('es-CO')}`}
      </Button>
    ) : null;

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
          <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
            Revisión AI
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Analizando tus propiedades...
          </p>
        </div>

        {/* Shimmer loading */}
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-medium text-fg dark:text-white">
              Analizando {state.rawRows.length} propiedades...
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1">
              Detectando campos faltantes y generando sugerencias
            </p>
          </div>
        </div>

        {/* Shimmer skeleton cards */}
        <div className="space-y-3">
          {[...Array(Math.min(state.rawRows.length, 4))].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg overflow-hidden relative bg-surface-muted dark:bg-ink"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div
                className="absolute inset-0 animate-shimmer"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                  // 680px tile matches the px-based `shimmer` keyframe (-340px→340px):
                  // one full tile of travel → a seamless, width-independent sweep.
                  backgroundSize: '680px 100%',
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
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          Revisión AI
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          Hemos analizado tus propiedades y generado sugerencias para los campos faltantes.
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-success-soft border border-success/30">
          <CheckCircle className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-success">
            {readyCount} completas
          </span>
        </div>

        {withSuggestions > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning-soft border border-warning/30">
            <Sparkle className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium text-warning">
              {withSuggestions} con sugerencias
            </span>
          </div>
        )}

        {errorCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-danger-soft border border-danger/30">
            <Warning className="w-4 h-4 text-danger" />
            <span className="text-sm font-medium text-danger">
              {errorCount} con errores
            </span>
          </div>
        )}
      </div>

      {/* Batch actions bar */}
      <div className="flex items-center justify-between gap-3 py-2 border-b border-border-faint dark:border-border-strong">
        <div className="flex items-center gap-3">
          {/* Select all toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleToggleSelectAll}
            />
            <span className="text-sm text-fg-muted dark:text-fg-subtle">
              {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </span>
          </label>
          <span className="text-xs font-mono text-fg-subtle dark:text-fg-muted">
            {selectedCount} / {totalCount} seleccionadas
          </span>
        </div>

        {/*
          * El mismo botón va también al pie, al lado de «Siguiente». No es
          * duplicarlo por gusto: en un archivo de 2.864 filas la barra de
          * arriba queda a media hora de scroll del pie, y la acción tiene que
          * estar donde la persona está mirando cuando decide seguir.
          */}
        {ranuraDelPie && botonDeTitulos
          ? createPortal(botonDeTitulos, ranuraDelPie)
          : null}
        <div className="flex items-center gap-2">
        {botonDeTitulos}
        {/* Accept all suggestions button */}
        {withSuggestions > 0 && (
          <Button
            type="button"
            size="sm"
            hideArrow
            onClick={handleAcceptAllGlobal}
            className="gap-2"
          >
            <Sparkle className="w-3.5 h-3.5" />
            Aceptar todas las sugerencias
          </Button>
        )}
        </div>
      </div>

      {/* Empty state */}
      {properties.length === 0 && (
        <div className="py-12 text-center">
          <MagicWand className="w-12 h-12 mx-auto mb-3 text-fg-subtle dark:text-fg-muted" />
          <p className="text-fg-muted dark:text-fg-subtle">No hay propiedades para revisar</p>
        </div>
      )}

      {/* Property list */}
      <div data-lenis-prevent className={cn('space-y-3', properties.length > 5 ? 'max-h-[60vh] overflow-y-auto pr-1' : '')} style={{ overscrollBehavior: 'contain' }}>
        {sortedProperties.map((property, i) => (
          <AISuggestionCard
            key={property._rowIndex}
            property={property}
            index={i}
            onToggleSelect={handleToggleSelect}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onAcceptAll={handleAcceptAll}
            onEditField={handleEditField}
          />
        ))}
      </div>
    </div>
  );
}
