'use client';

import { useCallback } from 'react';
import {
  Sliders,
  Minus,
  Plus,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';

// ============================================================================
// Helpers
// ============================================================================

/** Format a number as COP with dots as thousands separator */
function formatCOP(value: number): string {
  return `$${value.toLocaleString('es-CO')} COP`;
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Determine candidate score color */
function getScoreColor(score: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (score < 50) {
    return {
      bg: 'bg-red-100 dark:bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      label: 'Riesgoso',
    };
  }
  if (score < 70) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'Moderado',
    };
  }
  return {
    bg: 'bg-emerald-100 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Seguro',
  };
}

// ============================================================================
// Sub-components
// ============================================================================

interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}

function NumberStepper({ value, min, max, step, suffix, onChange }: NumberStepperProps) {
  const handleDecrement = () => {
    onChange(clamp(value - step, min, max));
  };

  const handleIncrement = () => {
    onChange(clamp(value + step, min, max));
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-lg',
          'border border-neutral-200 dark:border-border',
          'bg-white dark:bg-card',
          'text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800',
          'transition-colors duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
        aria-label="Disminuir"
      >
        <Minus className="w-3.5 h-3.5" weight="bold" />
      </button>

      <div
        className={cn(
          'flex items-center justify-center min-w-[80px] px-3 py-1.5',
          'rounded-lg border border-neutral-200 dark:border-border',
          'bg-neutral-50 dark:bg-neutral-800/50',
          'text-[13px] font-medium text-foreground tabular-nums'
        )}
      >
        {value} {suffix}
      </div>

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-lg',
          'border border-neutral-200 dark:border-border',
          'bg-white dark:bg-card',
          'text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800',
          'transition-colors duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
        aria-label="Aumentar"
      >
        <Plus className="w-3.5 h-3.5" weight="bold" />
      </button>
    </div>
  );
}

interface CurrencyStepperProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function CurrencyStepper({ value, min, max, step, onChange }: CurrencyStepperProps) {
  const handleDecrement = () => {
    onChange(clamp(value - step, min, max));
  };

  const handleIncrement = () => {
    onChange(clamp(value + step, min, max));
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-lg',
          'border border-neutral-200 dark:border-border',
          'bg-white dark:bg-card',
          'text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800',
          'transition-colors duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
        aria-label="Disminuir"
      >
        <Minus className="w-3.5 h-3.5" weight="bold" />
      </button>

      <div
        className={cn(
          'flex items-center justify-center min-w-[140px] px-3 py-1.5',
          'rounded-lg border border-neutral-200 dark:border-border',
          'bg-neutral-50 dark:bg-neutral-800/50',
          'text-[13px] font-medium text-foreground tabular-nums'
        )}
      >
        {formatCOP(value)}
      </div>

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-lg',
          'border border-neutral-200 dark:border-border',
          'bg-white dark:bg-card',
          'text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800',
          'transition-colors duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
        aria-label="Aumentar"
      >
        <Plus className="w-3.5 h-3.5" weight="bold" />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface ThresholdSettingsProps {
  className?: string;
}

/**
 * ThresholdSettings - Configurable thresholds for mora tolerance,
 * maintenance budgets, and candidate score minimums.
 *
 * Uses stepper inputs with min/max enforcement and inline unit labels.
 * Candidate score includes a colored indicator (red/amber/green).
 */
export function ThresholdSettings({ className }: ThresholdSettingsProps) {
  const { preferences, updatePreferences } = useBetaChatContext();
  const { thresholds } = preferences;

  const updateThreshold = useCallback(
    (key: keyof typeof thresholds, value: number) => {
      updatePreferences({
        thresholds: {
          ...thresholds,
          [key]: value,
        },
      });
    },
    [thresholds, updatePreferences]
  );

  const scoreColor = getScoreColor(thresholds.minCandidateScore);

  return (
    <section className={cn('space-y-4', className)}>
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Sliders className="w-4.5 h-4.5 text-muted-foreground" weight="duotone" />
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">
            Umbrales y Limites
          </h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Configura los limites para la toma de decisiones automatica.
          </p>
        </div>
      </div>

      {/* Threshold cards */}
      <div className="space-y-3">
        {/* Mora tolerance */}
        <div
          className={cn(
            'rounded-xl border border-neutral-200 dark:border-border',
            'bg-white dark:bg-card',
            'p-4'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-foreground">
                Tolerancia de mora
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Dias antes de escalar automaticamente un cobro vencido.
              </p>
            </div>
            <NumberStepper
              value={thresholds.moraTolerance}
              min={1}
              max={30}
              step={1}
              suffix="dias"
              onChange={(v) => updateThreshold('moraTolerance', v)}
            />
          </div>
        </div>

        {/* Maintenance budget */}
        <div
          className={cn(
            'rounded-xl border border-neutral-200 dark:border-border',
            'bg-white dark:bg-card',
            'p-4'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-foreground">
                Presupuesto de mantenimiento
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Monto maximo que el agente puede aprobar sin consultar.
              </p>
            </div>
            <CurrencyStepper
              value={thresholds.maintenanceBudgetLimit}
              min={100000}
              max={5000000}
              step={50000}
              onChange={(v) => updateThreshold('maintenanceBudgetLimit', v)}
            />
          </div>
        </div>

        {/* Candidate score */}
        <div
          className={cn(
            'rounded-xl border border-neutral-200 dark:border-border',
            'bg-white dark:bg-card',
            'p-4'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-foreground">
                Puntaje minimo de candidato
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Puntaje minimo de riesgo para auto-aprobar un candidato.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <NumberStepper
                value={thresholds.minCandidateScore}
                min={0}
                max={100}
                step={5}
                suffix="pts"
                onChange={(v) => updateThreshold('minCandidateScore', v)}
              />
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-md',
                  'text-[11px] font-medium',
                  scoreColor.bg,
                  scoreColor.text
                )}
              >
                {scoreColor.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
