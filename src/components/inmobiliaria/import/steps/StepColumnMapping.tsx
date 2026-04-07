'use client';

import { useCallback } from 'react';
import { ArrowRight, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { autoMapColumns, type ColumnMapping } from '../lib/columnMapping';
import { TARGET_FIELDS } from '../lib/importTypes';
import type { ImportStepProps } from '../ImportWizard';

type ConfidenceLevel = 'detected' | 'probable' | 'unmapped' | 'manual';

function getConfidenceLevel(mapping: ColumnMapping): ConfidenceLevel {
  if (mapping.isManual) return 'manual';
  if (mapping.targetField === null || mapping.confidence === 0) return 'unmapped';
  if (mapping.confidence >= 0.9) return 'detected';
  return 'probable';
}

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  label: string;
}

function ConfidenceBadge({ level, label }: ConfidenceBadgeProps) {
  const colorMap: Record<ConfidenceLevel, string> = {
    detected: 'text-emerald-700 dark:text-emerald-400',
    probable: 'text-amber-700 dark:text-amber-400',
    unmapped: 'text-red-700 dark:text-red-400',
    manual: 'text-indigo-700 dark:text-indigo-400',
  };

  const dotMap: Record<ConfidenceLevel, string> = {
    detected: 'bg-emerald-500',
    probable: 'bg-amber-500',
    unmapped: 'bg-red-500',
    manual: 'bg-indigo-500',
  };

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide', colorMap[level])}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotMap[level])} />
      {label}
    </span>
  );
}

export function StepColumnMapping({ state, updateState }: ImportStepProps) {
  const { t } = useI18n();
  const { columnMappings, rawRows, headers } = state;

  const mappedCount = columnMappings.filter((m) => m.targetField !== null).length;
  const totalCount = columnMappings.length;

  const requiredFields = TARGET_FIELDS.filter((f) => f.required);
  const unmappedRequired = requiredFields.filter(
    (req) => !columnMappings.some((m) => m.targetField === req.key)
  );

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
        return m;
      });

      updateState({ columnMappings: updatedMappings });
    },
    [columnMappings, updateState]
  );

  const handleReset = useCallback(() => {
    const fresh = autoMapColumns(headers);
    updateState({ columnMappings: fresh });
  }, [headers, updateState]);

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
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
            {t('inmobiliaria.import.mapping.title')}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.import.mapping.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Mapped summary badge */}
          <span className={cn(
            'text-xs font-mono uppercase tracking-wide px-2 py-1 rounded-md',
            mappedCount === totalCount
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          )}>
            {t('inmobiliaria.import.mapping.mapped', { count: mappedCount, total: totalCount })}
          </span>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-mono uppercase tracking-wide transition-colors"
          >
            {t('inmobiliaria.import.mapping.reset')}
          </button>
        </div>
      </div>

      {/* Mapping Rows */}
      <div className="space-y-2">
        {columnMappings.map((mapping, index) => {
          const confidenceLevel = getConfidenceLevel(mapping);
          const samples = getSampleValues(mapping.sourceColumn);

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
                'animate-content-reveal flex items-center gap-4 p-3 rounded-lg',
                index % 2 === 0
                  ? 'bg-neutral-50/50 dark:bg-neutral-800/30'
                  : 'bg-transparent'
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {/* Source Column */}
              <div className="flex-1 min-w-0">
                <span className="inline-block font-mono text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1 rounded-md truncate max-w-full">
                  {mapping.sourceColumn}
                </span>
                {/* Sample values */}
                {samples.length > 0 && (
                  <p className="text-xs text-neutral-400 mt-1 truncate">
                    {t('inmobiliaria.import.mapping.sampleValues')} {samples.join(', ')}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />

              {/* Target Field Dropdown */}
              <div className="flex-1 min-w-0">
                <select
                  value={mapping.targetField ?? ''}
                  onChange={(e) => handleMappingChange(mapping.sourceColumn, e.target.value || null)}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
                >
                  <option value="">{t('inmobiliaria.import.mapping.ignore')}</option>
                  {TARGET_FIELDS.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confidence Badge */}
              <div className="shrink-0 w-24 text-right">
                <ConfidenceBadge level={confidenceLevel} label={confidenceLabels[confidenceLevel]} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Required Fields Warning */}
      {unmappedRequired.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Warning className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
              {t('inmobiliaria.import.mapping.requiredMissing')}
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-0.5">
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
