'use client';

import { useCallback } from 'react';
import { ArrowRight, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MonoLabel } from '@leasefy/cadence';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { autoMapColumns, type ColumnMapping } from '../lib/columnMapping';
import { TARGET_FIELDS } from '../lib/importTypes';
import {
  cambiarDestinoDeParte,
  destinosDe,
  detectarColumnaCompuesta,
  dividirColumna,
  pareceArchivoDeContratos,
  partirCelda,
  unirColumna,
  valoresDe,
} from '../lib/columnaCompuesta';
import type { ImportStepProps } from '../ImportWizard';

type ConfidenceLevel = 'detected' | 'probable' | 'unmapped' | 'manual';

function getConfidenceLevel(mapping: ColumnMapping): ConfidenceLevel {
  if (mapping.isManual) return 'manual';
  if (destinosDe(mapping).length === 0 || mapping.confidence === 0) return 'unmapped';
  if (mapping.confidence >= 0.9) return 'detected';
  return 'probable';
}

/** Un valor de muestra, recortado para que quepa en la fila. */
function recortar(valor: string, largo = 25): string {
  return valor.length > largo ? valor.slice(0, largo) + '…' : valor;
}

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  label: string;
}

function ConfidenceBadge({ level, label }: ConfidenceBadgeProps) {
  const colorMap: Record<ConfidenceLevel, string> = {
    detected: 'text-success',
    probable: 'text-warning',
    unmapped: 'text-danger',
    manual: 'text-primary',
  };

  const dotMap: Record<ConfidenceLevel, string> = {
    detected: 'bg-success',
    probable: 'bg-warning',
    unmapped: 'bg-danger',
    manual: 'bg-primary',
  };

  return (
    <MonoLabel className={cn('inline-flex items-center gap-1 text-xs', colorMap[level])}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotMap[level])} />
      {label}
    </MonoLabel>
  );
}

export function StepColumnMapping({ state, updateState }: ImportStepProps) {
  const { t } = useI18n();
  const { columnMappings, rawRows, headers } = state;

  const mappedCount = columnMappings.filter((m) => destinosDe(m).length > 0).length;
  const totalCount = columnMappings.length;
  // «Inquilino», «Fecha inicio», «Día de pago»… son columnas de un archivo de
  // CONTRATOS. Acá no tienen campo porque un inmueble no tiene inquilino ni
  // fechas: las tiene el contrato, y se cargan en ese paso. Decirlo evita que
  // alguien concluya que el asistente «no fue capaz de mapearlas».
  const senasDeContratos = pareceArchivoDeContratos(headers);

  const requiredFields = TARGET_FIELDS.filter((f) => f.required);
  const isMapped = (key: string) => columnMappings.some((m) => destinosDe(m).includes(key));
  // T-0038 §3.8/C13 — same monthlyRent/salePrice alternative as
  // ImportWizard.isStepValid: a SALE-only file has salePrice mapped and no
  // "Canon" column at all, so monthlyRent alone must not read as missing.
  const unmappedRequired = requiredFields.filter((req) => {
    if (req.key === 'monthlyRent') return !isMapped('monthlyRent') && !isMapped('salePrice');
    return !isMapped(req.key);
  });

  const handleMappingChange = useCallback(
    (sourceColumn: string, newTargetField: string | null) => {
      const updatedMappings = columnMappings.map((m) => {
        if (m.sourceColumn === sourceColumn) {
          return {
            ...m,
            targetField: newTargetField,
            isManual: true,
            confidence: newTargetField ? 1 : 0,
          };
        }
        // If another mapping has this targetField, clear it (swap/conflict handling)
        if (newTargetField && m.targetField === newTargetField && m.sourceColumn !== sourceColumn) {
          return {
            ...m,
            targetField: null,
            confidence: 0,
            isManual: true,
          };
        }
        // …también si lo tenía una de las dos partes de una columna partida.
        if (newTargetField && m.partes && m.sourceColumn !== sourceColumn && m.partes.destinos.includes(newTargetField)) {
          const destinos = m.partes.destinos.map((d) => (d === newTargetField ? null : d)) as [string | null, string | null];
          return { ...m, partes: { destinos }, isManual: true };
        }
        return m;
      });

      updateState({ columnMappings: updatedMappings });
    },
    [columnMappings, updateState]
  );

  const handleDividir = useCallback(
    (sourceColumn: string) => {
      const deteccion = detectarColumnaCompuesta(valoresDe(rawRows, sourceColumn));
      const ejemplo = deteccion?.ejemplo ?? partirCelda(valoresDe(rawRows, sourceColumn, 1)[0]);
      if (!ejemplo) return;
      updateState({ columnMappings: dividirColumna(columnMappings, sourceColumn, ejemplo) });
    },
    [columnMappings, rawRows, updateState]
  );

  const handleUnir = useCallback(
    (sourceColumn: string) => updateState({ columnMappings: unirColumna(columnMappings, sourceColumn) }),
    [columnMappings, updateState]
  );

  const handleParteChange = useCallback(
    (sourceColumn: string, indice: 0 | 1, destino: string | null) =>
      updateState({ columnMappings: cambiarDestinoDeParte(columnMappings, sourceColumn, indice, destino) }),
    [columnMappings, updateState]
  );

  const handleReset = useCallback(() => {
    const fresh = autoMapColumns(headers, rawRows);
    updateState({ columnMappings: fresh });
  }, [headers, rawRows, updateState]);

  // Get sample values for a given column (first 2-3 non-empty values from rawRows)
  const getSampleValues = (column: string): string[] => {
    const samples: string[] = [];
    for (const row of rawRows) {
      if (samples.length >= 3) break;
      const val = String(row[column] ?? '').trim();
      if (val) samples.push(val.length > 25 ? val.slice(0, 25) + '…' : val);
    }
    return samples;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
            {t('inmobiliaria.import.mapping.title')}
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            {t('inmobiliaria.import.mapping.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Mapped summary badge */}
          <Badge variant={mappedCount === totalCount ? 'success' : 'warning'}>
            {t('inmobiliaria.import.mapping.mapped', { count: mappedCount, total: totalCount })}
          </Badge>

          {/* Reset button */}
          <Button
            type="button"
            variant="link"
            size="sm"
            hideArrow
            onClick={handleReset}
            className="text-xs"
          >
            {t('inmobiliaria.import.mapping.reset')}
          </Button>
        </div>
      </div>

      {/* Mapping Rows */}
      <div className="space-y-2">
        {columnMappings.map((mapping, index) => {
          const confidenceLevel = getConfidenceLevel(mapping);
          const samples = getSampleValues(mapping.sourceColumn);
          // ¿La celda trae dos datos? Se ofrece partirla (o ya está partida).
          const compuesta = mapping.partes ? null : detectarColumnaCompuesta(valoresDe(rawRows, mapping.sourceColumn));
          const ejemploPartido = mapping.partes
            ? (valoresDe(rawRows, mapping.sourceColumn).map(partirCelda).find((p) => p !== null) ?? null)
            : null;

          const confidenceLabels: Record<ConfidenceLevel, string> = {
            detected: t('inmobiliaria.import.mapping.confidence.detected'),
            probable: t('inmobiliaria.import.mapping.confidence.probable'),
            unmapped: t('inmobiliaria.import.mapping.confidence.unmapped'),
            manual: t('inmobiliaria.import.mapping.confidence.manual'),
          };

          return (
            <div
              key={mapping.sourceColumn}
              className={cn(
                'animate-content-reveal flex items-center gap-4 p-3 rounded-md',
                index % 2 === 0
                  ? 'bg-surface-muted'
                  : 'bg-transparent'
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {/* Source Column */}
              <div className="flex-1 min-w-0">
                <span className="inline-block font-mono text-xs bg-surface-muted dark:bg-ink text-fg dark:text-fg-subtle px-2 py-1 rounded-sm truncate max-w-full">
                  {mapping.sourceColumn}
                </span>
                {/* Sample values */}
                {samples.length > 0 && (
                  <p className="text-xs text-fg-subtle mt-1 truncate">
                    {t('inmobiliaria.import.mapping.sampleValues')} {samples.join(', ')}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-fg-subtle shrink-0" />

              {/* Target Field Dropdown — o las dos partes de una columna compuesta */}
              {mapping.partes ? (
                <div className="flex-1 min-w-0 space-y-1.5" data-testid={`partes-${mapping.sourceColumn}`}>
                  <p className="text-xs text-fg-subtle">
                    Dos datos en una celda, partidos por el guion de la izquierda:
                  </p>
                  {([0, 1] as const).map((indice) => {
                    const muestra = ejemploPartido ? (indice === 0 ? ejemploPartido.izquierda : ejemploPartido.derecha) : '';
                    return (
                      <div key={indice} className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs text-fg-subtle w-28 shrink-0 truncate"
                          title={muestra}
                        >
                          {indice === 0 ? '1.º' : '2.º'} «{recortar(muestra, 14)}»
                        </span>
                        <Select
                          value={mapping.partes!.destinos[indice] ?? '__ignore__'}
                          onValueChange={(v) =>
                            handleParteChange(mapping.sourceColumn, indice, v === '__ignore__' ? null : v)
                          }
                        >
                          <SelectTrigger className="w-full" aria-label={`Parte ${indice + 1} de ${mapping.sourceColumn}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ignore__">{t('inmobiliaria.import.mapping.ignore')}</SelectItem>
                            {TARGET_FIELDS.map((field) => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => handleUnir(mapping.sourceColumn)}
                    data-testid={`unir-${mapping.sourceColumn}`}
                  >
                    Es un solo dato
                  </button>
                </div>
              ) : (
                <div className="flex-1 min-w-0 space-y-1">
                  <Select
                    value={mapping.targetField ?? '__ignore__'}
                    onValueChange={(v) =>
                      handleMappingChange(mapping.sourceColumn, v === '__ignore__' ? null : v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ignore__">{t('inmobiliaria.import.mapping.ignore')}</SelectItem>
                      {TARGET_FIELDS.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {compuesta ? (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline text-left"
                      onClick={() => handleDividir(mapping.sourceColumn)}
                      data-testid={`dividir-${mapping.sourceColumn}`}
                    >
                      Trae dos datos («{recortar(compuesta.ejemplo.izquierda, 12)}» y «
                      {recortar(compuesta.ejemplo.derecha, 18)}»): separarlos
                    </button>
                  ) : null}
                </div>
              )}

              {/* Confidence Badge */}
              <div className="shrink-0 w-24 text-right">
                <ConfidenceBadge level={confidenceLevel} label={confidenceLabels[confidenceLevel]} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Un archivo de contratos en el paso de inmuebles */}
      {senasDeContratos.length > 0 && (
        <div
          className="flex items-start gap-3 p-4 rounded-lg bg-surface-muted border border-border"
          data-testid="parece-archivo-de-contratos"
        >
          <Warning className="w-5 h-5 text-fg-muted shrink-0 mt-0.5" />
          <p className="text-sm text-fg-muted">
            Este archivo parece el de <span className="font-medium text-fg">contratos</span>: trae{' '}
            {senasDeContratos.slice(0, 3).map((s) => `«${s}»`).join(', ')}
            {senasDeContratos.length > 3 ? '…' : ''}. Esas columnas no tienen campo acá porque un
            inmueble no tiene inquilino ni fechas de contrato — las tiene el contrato, y se cargan en
            el paso <span className="font-medium text-fg">Contratos</span>. Acá se usan sólo las del
            inmueble: código, dirección, propietario, estrato, precio.
          </p>
        </div>
      )}

      {/* Required Fields Warning */}
      {unmappedRequired.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning-soft border border-warning/30">
          <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning mb-1">
              {t('inmobiliaria.import.mapping.requiredMissing')}
            </p>
            <ul className="text-sm text-warning space-y-0.5">
              {unmappedRequired.map((field) => (
                <li key={field.key}>• {field.label}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
