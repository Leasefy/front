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
 *   B — populated=false + reason='insufficient-heatmap' → SampleDataWatermark + stub cells
 *   C — populated=true → real cells
 *
 * Grid structure:
 *   Row 0:   [empty corner] + 24 hour header cells (role='columnheader')
 *   Rows 1–7: [day label cell (role='rowheader')] + 24 data cells (role='gridcell')
 *   Total data cells: 7 × 24 = 168
 */

import { Fragment, useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { SampleDataWatermark } from '@/components/data-display/SampleDataWatermark';
import { STUB_CADENCE } from '@/lib/fixtures/cobranza-analytics-stub';

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

// Only label hours 0, 6, 12, 18; others empty
const HOURS_LABELS: string[] = Array.from({ length: 24 }, (_, h) =>
  h === 0 ? '00' : h === 6 ? '06' : h === 12 ? '12' : h === 18 ? '18' : ''
);

// ─── Color Helper ─────────────────────────────────────────────────────────────
// Encodes call_count (intensity = darkness) + positive_outcome_pct (saturation)
// into a single HSL color. Zero calls → neutral grey.

function cellBgColor(count: number, positiveRate: number, max: number): string {
  if (count === 0) return '#e5e7eb'; // neutral-200
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

  // Branch B / C — stub or real data
  const isStub = !data.populated;
  const sourceCells: HeatmapCell[] = data.populated
    ? data.cells
    : ((STUB_CADENCE.heatmap?.cells ?? []) as HeatmapCell[]);
  const effectiveMax: number = data.populated
    ? data.maxCount
    : Math.max(1, ...sourceCells.map((c) => c.call_count));

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

  const grid = (
    <div role="region" aria-label={regionTitle}>
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
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
          <div className="text-[9px] text-neutral-400" aria-hidden="true" />
          {HOURS_LABELS.map((label, h) => (
            <div
              key={`h-${h}`}
              role="columnheader"
              aria-label={label ? `${label}:00` : undefined}
              className="text-center text-[9px] text-neutral-400 pb-0.5"
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
                className="pr-1.5 text-[10px] text-neutral-500 flex items-center"
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
                        ? 'ring-2 ring-[#1A40FF] ring-offset-1 relative z-10'
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
        className="text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 min-h-4"
      >
        {selectedCell
          ? describeCell(selectedCell)
          : isEs
            ? 'Toca una celda para ver el detalle'
            : 'Tap a cell to see details'}
      </p>
      <p className="text-[10px] text-neutral-400 mt-1">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.cadence.heatmap.legend')}
      </p>
    </div>
  );

  return (
    <SampleDataWatermark show={isStub}>
      {grid}
    </SampleDataWatermark>
  );
}
