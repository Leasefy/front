'use client';

/**
 * HeatmapGrid24x7 — Phase 37 plan 37-09
 *
 * Custom Tailwind 24×7 heatmap grid showing call volume + positive outcome rate
 * per hour (0..23) × day-of-week (0=Sun..6=Sat).
 *
 * NO new npm dependencies — pure Tailwind + React (RESEARCH Q12).
 *
 * Three render branches (D-37-05):
 *   A — populated=false + reason='agency-gate' → return null
 *   B — populated=false + reason='insufficient-heatmap' → EmptyState (honest empty, never stub cells)
 *   C — populated=true → real cells
 *
 * Grid structure:
 *   Row 0:   [empty corner] + 24 hour header cells (role='columnheader')
 *   Rows 1–7: [day label cell (role='rowheader')] + 24 data cells (role='gridcell')
 *   Total data cells: 7 × 24 = 168
 */

import { Fragment, useState } from 'react';

import { GridFour } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { EmptyState } from '@/components/data-display/EmptyState';

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface HeatmapCell {
  hour: number;              // 0..23
  day_of_week: number;       // 0=Sun..6=Sat
  call_count: number;
  positive_outcome_pct: number; // 0..1
}

type HeatmapData =
  | { populated: true; cells: HeatmapCell[]; maxCount: number }
  | { populated: false; reason?: string; cells?: HeatmapCell[]; maxCount?: number };

interface HeatmapGrid24x7Props {
  data: HeatmapData;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_ES: string[] = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_EN: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Horas legibles cada 3 columnas — «00/06/12/18» no le decía nada a nadie
// (feedback de Nico 2026-08-25: «arriba coloca bien los horarios porque no se
// entiende muy bien»). El formato 12h con a.m./p.m. es el que se usa en
// Colombia; las columnas vecinas van vacías, así que el texto puede respirar.
function horaLegible(h: number): string {
  const doce = h % 12 === 0 ? 12 : h % 12;
  return `${doce} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}
const HOURS_LABELS: string[] = Array.from({ length: 24 }, (_, h) =>
  h % 3 === 0 ? horaLegible(h) : ''
);

// ─── Color Helper ─────────────────────────────────────────────────────────────
// Encodes call_count (intensity = darkness) + positive_outcome_pct (saturation)
// into a single HSL color. Zero calls → neutral grey.

function cellBgColor(count: number, positiveRate: number, max: number): string {
  if (count === 0) return '#E5E2DC'; // neutral-200 (Cadence warm)
  const intensity = Math.min(1, count / Math.max(1, max));
  const hue = 230; // brand electric-blue hue (#1A40FF ≈ hsl(230 100% 55%))
  const saturation = 30 + positiveRate * 55;
  const lightness = 90 - intensity * 55;
  return `hsl(${hue} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}%)`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HeatmapGrid24x7({ data }: HeatmapGrid24x7Props) {
  const { t, locale } = useI18n();

  // Tap-to-inspect: the selected cell's details render in a summary line
  // below the grid (title-only tooltips are dead on touch).
  const [selected, setSelected] = useState<{ day: number; hour: number } | null>(null);

  // Branch A — agency-gate
  if (!data.populated && data.reason === 'agency-gate') {
    return null;
  }

  // Branch B — no real data yet
  if (!data.populated) {
    return (
      <EmptyState
        icon={GridFour}
        title={t('inmobiliaria.ai.cobranza.analitica.widgets.cadence.heatmap.title')}
        description="Sin datos suficientes todavía"
      />
    );
  }

  // Branch C — real data
  const sourceCells: HeatmapCell[] = data.cells;
  const effectiveMax: number = data.maxCount;

  // Build 7×24 matrix — fill missing cells with zeroes
  const matrix: HeatmapCell[][] = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      return (
        sourceCells.find((c) => c.day_of_week === d && c.hour === h) ?? {
          hour: h,
          day_of_week: d,
          call_count: 0,
          positive_outcome_pct: 0,
        }
      );
    })
  );

  const dayLabels = locale === 'es' ? DAYS_ES : DAYS_EN;
  const isEs = locale === 'es';

  const regionTitle = t('inmobiliaria.ai.cobranza.analitica.widgets.cadence.heatmap.title');

  const describeCell = (cell: HeatmapCell): string => {
    const pctDisplay = (cell.positive_outcome_pct * 100).toFixed(0);
    return isEs
      ? `${dayLabels[cell.day_of_week]} ${cell.hour}h: ${cell.call_count} llamadas, ${pctDisplay}% positivas`
      : `${dayLabels[cell.day_of_week]} ${cell.hour}h: ${cell.call_count} calls, ${pctDisplay}% positive`;
  };

  const selectedCell = selected ? matrix[selected.day][selected.hour] : null;

  return (
    <div role="region" aria-label={regionTitle}>
      <p className="text-xs font-medium text-fg-subtle mb-2">
        {regionTitle}
      </p>
      {/* Single focusable scroll wrapper — the 168 cells are NOT in the tab
          order; keyboard users get the aria-live summary line below. */}
      <div
        className="relative overflow-x-auto overscroll-contain"
        tabIndex={0}
        role="group"
        aria-label={regionTitle}
      >
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: 'auto repeat(24, minmax(18px, 1fr))' }}
        >
          {/* Row 0: header — empty corner + 24 hour labels */}
          <div className="text-[9px] text-fg-subtle" aria-hidden="true" />
          {HOURS_LABELS.map((label, h) => (
            <div
              key={`h-${h}`}
              role="columnheader"
              aria-label={label || undefined}
              className="text-center text-[10px] text-fg-subtle pb-0.5 whitespace-nowrap"
            >
              {label}
            </div>
          ))}

          {/* Rows 1..7: day label + 24 data cells */}
          {matrix.map((hourCells, d) => (
            <Fragment key={`row-${d}`}>
              {/* Day label */}
              <div
                role="rowheader"
                className="pr-1.5 text-[10px] text-fg-subtle flex items-center"
              >
                {dayLabels[d]}
              </div>

              {/* 24 data cells — tap/click selects; title kept for desktop hover */}
              {hourCells.map((cell) => {
                const ariaLabel = describeCell(cell);
                const isSelected = selected?.day === d && selected?.hour === cell.hour;

                return (
                  <button
                    key={`cell-${d}-${cell.hour}`}
                    type="button"
                    role="gridcell"
                    tabIndex={-1}
                    aria-label={ariaLabel}
                    aria-pressed={isSelected}
                    title={ariaLabel}
                    onClick={() =>
                      setSelected(isSelected ? null : { day: d, hour: cell.hour })
                    }
                    className={
                      'aspect-square rounded-[2px] ' +
                      (isSelected
                        ? 'ring-2 ring-primary ring-offset-1 relative z-10'
                        : '')
                    }
                    style={{ backgroundColor: cellBgColor(cell.call_count, cell.positive_outcome_pct, effectiveMax) }}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      {/* Selected-cell summary line (tap-to-inspect) */}
      <p
        aria-live="polite"
        className="text-xs text-fg-muted mt-1.5 min-h-4"
      >
        {selectedCell
          ? describeCell(selectedCell)
          : isEs
            ? 'Toca una celda para ver el detalle'
            : 'Tap a cell to see details'}
      </p>
      {/* Leyenda visual — «Intensidad = volumen + tasa positiva» era una
          fórmula, no una guía. Quien mira el mapa necesita saber qué buscar:
          el más oscuro es la mejor hora. Las muestras usan el MISMO
          cellBgColor de las celdas, para que la escala nunca se desfase del
          mapa. */}
      <div
        data-testid="heatmap-leyenda"
        className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-fg-subtle"
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-[2px] shrink-0"
            style={{ backgroundColor: cellBgColor(0, 0, 1) }}
            aria-hidden="true"
          />
          {isEs ? 'Sin llamadas' : 'No calls'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="whitespace-nowrap">
            {isEs ? 'Claro: pocas llamadas o poca respuesta' : 'Light: few calls or low response'}
          </span>
          <span className="inline-flex gap-px" aria-hidden="true">
            {[0.2, 0.4, 0.6, 0.8, 1].map((f) => (
              <span
                key={f}
                className="inline-block w-3 h-3 rounded-[2px]"
                style={{ backgroundColor: cellBgColor(f, f, 1) }}
              />
            ))}
          </span>
          <span className="whitespace-nowrap font-medium text-fg-muted">
            {isEs ? 'Oscuro: la mejor hora — contestan y sale bien' : 'Dark: best hour — they answer and it goes well'}
          </span>
        </span>
      </div>
    </div>
  );
}
