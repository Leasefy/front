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
import { toast } from '@/components/ui/toast';
import type { ImportStepProps } from '../ImportWizard';

export function StepConfirmImport({ state, updateState }: ImportStepProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [isImporting, setIsImporting] = useState(false);
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

  const handleImport = async () => {
    if (importCount === 0) return;
    setIsImporting(true);
    setProgress(0);
    setCurrentItem(0);

    const total = importCount;
    const intervalMs = Math.max(50, 2000 / total);

    for (let i = 0; i <= total; i++) {
      await new Promise<void>((r) => setTimeout(r, intervalMs));
      setCurrentItem(i);
      setProgress(Math.round((i / total) * 100));
    }

    console.log('Imported properties:', selectedProperties);

    updateState({ importedCount: total, importProgress: 100 });
    setIsImporting(false);
    setIsComplete(true);

    toast.success({
      title: 'Importación exitosa',
      description: `${total} propiedades importadas correctamente`,
    });
  };

  // Success state
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" weight="fill" />
          </div>
        </div>

        <div className="animate-fade-in-up space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            ¡Importación completada!
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            Se importaron{' '}
            <span className="font-semibold text-neutral-900 dark:text-white">
              {state.importedCount} propiedades
            </span>{' '}
            a tu portafolio
          </p>
        </div>

        <div className="flex items-center gap-3 animate-fade-in-up">
          <button
            type="button"
            onClick={() => router.push('/panel/inmobiliaria/portafolio')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-mono uppercase tracking-wide text-sm hover:bg-indigo-700 transition-colors"
          >
            Ver portafolio
          </button>
          <button
            type="button"
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono uppercase tracking-wide text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Importar más
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
          Resumen de importación
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Revisa el resumen antes de ejecutar la importación.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
            <FileArrowUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              {t('inmobiliaria.import.confirm.title')}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {state.fileName}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Properties to import */}
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4">
            <p className="text-xs font-mono uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">
              {t('inmobiliaria.import.confirm.propertiesToImport')}
            </p>
            <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
              {importCount}
            </p>
          </div>

          {/* Excluded */}
          <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-4">
            <p className="text-xs font-mono uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1">
              {t('inmobiliaria.import.confirm.propertiesExcluded')}
            </p>
            <p className="text-3xl font-bold text-neutral-600 dark:text-neutral-300">
              {excludedCount}
            </p>
          </div>

          {/* AI suggestions accepted */}
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <p className="text-xs font-mono uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">
              {t('inmobiliaria.import.confirm.suggestionsAccepted')}
            </p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {acceptedSuggestionsCount}
            </p>
          </div>

          {/* Remaining errors */}
          <div
            className={cn(
              'rounded-lg p-4',
              remainingErrorsCount > 0
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-emerald-50 dark:bg-emerald-900/20'
            )}
          >
            <p
              className={cn(
                'text-xs font-mono uppercase tracking-wide mb-1',
                remainingErrorsCount > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {t('inmobiliaria.import.confirm.remainingErrors')}
            </p>
            <p
              className={cn(
                'text-3xl font-bold',
                remainingErrorsCount > 0
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              )}
            >
              {remainingErrorsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Agent assignment note */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <UserCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">
              Asignación de agentes
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Las propiedades se importarán sin agente asignado. Podrás asignar agentes individualmente o en lote desde el portafolio después de importar.
            </p>
          </div>
        </div>
      </div>

      {/* Import progress bar (during import) */}
      {isImporting && (
        <div className="space-y-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('inmobiliaria.import.confirm.importing', {
              current: currentItem,
              total: importCount,
            })}
          </p>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            {progress < 100 ? (
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            ) : (
              <div className="h-full bg-emerald-500 rounded-full w-full transition-colors duration-300" />
            )}
          </div>
          <p className="text-xs text-right font-mono text-neutral-400 dark:text-neutral-500">
            {progress}%
          </p>
        </div>
      )}

      {/* Import button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleImport}
          disabled={importCount === 0 || isImporting}
          className={cn(
            'inline-flex items-center gap-2 px-8 py-3 rounded-xl font-mono uppercase tracking-wide text-sm transition-all',
            importCount > 0 && !isImporting
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
          )}
        >
          <FileArrowUp className="w-4 h-4" />
          {isImporting
            ? 'Importando...'
            : t('inmobiliaria.import.confirm.importButton', { count: importCount })}
        </button>
      </div>
    </div>
  );
}
