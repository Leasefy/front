'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  FileArrowUp,
  UserCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MonoLabel } from '@leasefy/cadence';
import { toast } from '@/components/ui/toast';
import { propertiesApi } from '@/lib/api/properties.service';
import { geocodeImportRow, GEOCODE_ROW_DELAY_MS } from '../lib/geocodeImportRow';
import type { ImportStepProps } from '../ImportWizard';
import type { ImportProperty } from '../lib/importTypes';

export function StepConfirmImport({ state, updateState }: ImportStepProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [isImporting, setIsImporting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const properties = state.properties;
  const selectedProperties = properties.filter((p) => p.selected && !p.hasErrors);
  const excludedCount = properties.filter((p) => !p.selected).length;
  const acceptedSuggestionsCount = properties.reduce(
    (sum, p) => sum + p.suggestions.filter((s) => s.accepted === true).length,
    0
  );
  const remainingErrorsCount = properties.filter((p) => p.selected && p.hasErrors).length;
  const importCount = selectedProperties.length;

  // Map a parsed/AI-reviewed ImportProperty to the propertiesApi.create payload.
  // Accepted AI suggestions are already applied onto the property fields in StepAIReview.
  const toCreatePayload = (p: ImportProperty) => ({
    title: p.propertyTitle || p.propertyAddress || p.propertyCity || 'Propiedad importada',
    description: p.notes ?? '',
    type: p.propertyType ?? 'apartment',
    city: p.propertyCity ?? '',
    neighborhood: p.propertyZone ?? '',
    address: p.propertyAddress ?? '',
    monthlyRent: p.monthlyRent ?? 0,
    bedrooms: p.bedrooms ?? 0,
    bathrooms: p.bathrooms ?? 0,
    area: p.propertyArea ?? 0,
    ...(p.adminFee != null ? { adminFee: p.adminFee } : {}),
  });

  const handleImport = async () => {
    if (importCount === 0) return;
    setIsImporting(true);
    setIsGeocoding(true);
    setProgress(0);
    setCurrentItem(0);

    const total = importCount;

    // Sequential geocoding — respects LocationIQ's rate limit (no per-row
    // autocomplete, just the first result for the full address) and a bad
    // address never blocks the import: it falls back to the city center.
    let geocodedCount = 0;
    let fallbackCount = 0;
    const payloads: Array<ReturnType<typeof toCreatePayload> & { latitude?: number; longitude?: number }> = [];

    for (let i = 0; i < selectedProperties.length; i++) {
      const p = selectedProperties[i];
      const coords = await geocodeImportRow(p);
      if (coords.source === 'geocoded') geocodedCount += 1;
      else fallbackCount += 1;
      payloads.push({
        ...toCreatePayload(p),
        ...(coords.lat != null && coords.lng != null ? { latitude: coords.lat, longitude: coords.lng } : {}),
      });
      if (i < selectedProperties.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, GEOCODE_ROW_DELAY_MS));
      }
    }

    setIsGeocoding(false);

    // No bulk-import endpoint exists — create each property via the real API,
    // tracking progress and partial failures honestly.
    let done = 0;
    const results = await Promise.allSettled(
      payloads.map((payload) =>
        propertiesApi.create(payload).finally(() => {
          done += 1;
          setCurrentItem(done);
          setProgress(Math.round((done / total) * 100));
        })
      )
    );

    const created = results.filter((r) => r.status === 'fulfilled').length;
    const failed = total - created;

    setIsImporting(false);

    // eslint-disable-next-line no-console -- geocoding coverage isn't surfaced anywhere else
    console.info(`[import] geocoding: ${geocodedCount} resolved, ${fallbackCount} fell back to city center`);

    if (created === 0) {
      // Nothing persisted — surface the error and do NOT navigate to success.
      toast.error('Error en la importación', {
        description: `No se pudo importar ninguna propiedad (${failed} con error). Intenta de nuevo.`,
      });
      return;
    }

    updateState({ importedCount: created, importProgress: 100 });
    setIsComplete(true);

    const geocodeNote = geocodedCount > 0 ? ` (${geocodedCount} con dirección exacta geocodificada)` : '';

    if (failed > 0) {
      toast.error('Importación parcial', {
        description: `${created} propiedades importadas, ${failed} con error.${geocodeNote}`,
      });
    } else {
      toast.success('Importación exitosa', {
        description: `${created} propiedades importadas correctamente${geocodeNote}`,
      });
    }
  };

  // Success state
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="animate-scale-in">
          {/* allowlist: success hero icon-circle (wraps Phosphor glyph), no text-label pill */}
          <div className="w-20 h-20 rounded-full bg-success-soft flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-success" weight="fill" />
          </div>
        </div>

        <div className="animate-fade-in-up space-y-2">
          <h2 className="text-2xl font-semibold text-fg dark:text-white">
            ¡Importación completada!
          </h2>
          <p className="text-fg-muted dark:text-fg-subtle">
            Se importaron{' '}
            <span className="font-semibold text-fg dark:text-white">
              {state.importedCount} propiedades
            </span>{' '}
            a tu portafolio
          </p>
        </div>

        <div className="flex items-center gap-3 animate-fade-in-up">
          <Button
            type="button"
            size="lg"
            hideArrow
            onClick={() => router.push('/panel/inmobiliaria/portafolio')}
          >
            Ver portafolio
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            hideArrow
            onClick={() => {
              // Reset wizard state
              updateState({
                method: null,
                file: null,
                fileName: '',
                rawRows: [],
                headers: [],
                sheetNames: [],
                selectedSheet: '',
                columnMappings: [],
                properties: [],
                aiAnalyzed: false,
                importProgress: 0,
                importedCount: 0,
              });
              // Redirect to step 1 — the wizard handles navigation
              router.push('/panel/inmobiliaria/portafolio/importar');
            }}
          >
            Importar más
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          Resumen de importación
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          Revisa el resumen antes de ejecutar la importación.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-border dark:border-border-strong p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
            <FileArrowUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-fg dark:text-white">
              {t('inmobiliaria.import.confirm.title')}
            </h3>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {state.fileName}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Properties to import */}
          <div className="rounded-md bg-primary-soft p-4">
            <MonoLabel className="block text-xs text-primary mb-1">
              {t('inmobiliaria.import.confirm.propertiesToImport')}
            </MonoLabel>
            <p className="text-3xl font-bold text-primary">
              {importCount}
            </p>
          </div>

          {/* Excluded */}
          <div className="rounded-md bg-surface-muted dark:bg-ink p-4">
            <MonoLabel className="block text-xs text-fg-muted dark:text-fg-subtle mb-1">
              {t('inmobiliaria.import.confirm.propertiesExcluded')}
            </MonoLabel>
            <p className="text-3xl font-bold text-fg-muted dark:text-fg-subtle">
              {excludedCount}
            </p>
          </div>

          {/* AI suggestions accepted */}
          <div className="rounded-md bg-success-soft p-4">
            <MonoLabel className="block text-xs text-success mb-1">
              {t('inmobiliaria.import.confirm.suggestionsAccepted')}
            </MonoLabel>
            <p className="text-3xl font-bold text-success">
              {acceptedSuggestionsCount}
            </p>
          </div>

          {/* Remaining errors */}
          <div
            className={cn(
              'rounded-md p-4',
              remainingErrorsCount > 0
                ? 'bg-danger-soft'
                : 'bg-success-soft'
            )}
          >
            <MonoLabel
              className={cn(
                'block text-xs mb-1',
                remainingErrorsCount > 0
                  ? 'text-danger'
                  : 'text-success'
              )}
            >
              {t('inmobiliaria.import.confirm.remainingErrors')}
            </MonoLabel>
            <p
              className={cn(
                'text-3xl font-bold',
                remainingErrorsCount > 0
                  ? 'text-danger'
                  : 'text-success'
              )}
            >
              {remainingErrorsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Agent assignment note */}
      <div className="rounded-xl border border-border dark:border-border-strong bg-surface-muted dark:bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <UserCircle className="w-5 h-5 text-fg-subtle dark:text-fg-muted mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-fg dark:text-white text-sm">
              Asignación de agentes
            </h3>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1">
              Las propiedades se importarán sin agente asignado. Podrás asignar agentes individualmente o en lote desde el portafolio después de importar.
            </p>
          </div>
        </div>
      </div>

      {/* Import progress bar (during import) */}
      {isImporting && (
        <div className="space-y-2">
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            {isGeocoding
              ? 'Geocodificando direcciones…'
              : t('inmobiliaria.import.confirm.importing', {
                  current: currentItem,
                  total: importCount,
                })}
          </p>
          {!isGeocoding && (
            <>
              <Progress
                value={progress}
                size="xs"
                variant={progress >= 100 ? 'success' : 'default'}
              />
              <p className="text-xs text-right font-mono text-fg-subtle dark:text-fg-muted">
                {progress}%
              </p>
            </>
          )}
        </div>
      )}

      {/* Import button */}
      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          hideArrow
          onClick={handleImport}
          disabled={importCount === 0 || isImporting}
          className="gap-2"
        >
          <FileArrowUp className="w-4 h-4" />
          {isImporting
            ? 'Importando...'
            : t('inmobiliaria.import.confirm.importButton', { count: importCount })}
        </Button>
      </div>
    </div>
  );
}
