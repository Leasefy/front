'use client';

import { cn } from '@/lib/utils';

// ============================================================================
// TrendChart - CSS-only line/sparkline chart
// ============================================================================

export interface TrendChartDataPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  data: TrendChartDataPoint[];
  maxValue?: number;
  height?: number;
  color?: string;
  showLabels?: boolean;
}

/**
 * TrendChart renders a simple CSS-based dot chart with vertical bars.
 * Each dot is positioned proportionally; values shown on hover.
 * No SVG or canvas - pure div positioning with transitions.
 */
export function TrendChart({
  data,
  maxValue: maxOverride,
  height = 120,
  color = 'bg-neutral-500',
  showLabels = true,
}: TrendChartProps) {
  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const max = maxOverride ?? Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div className="w-full">
      {/* Chart area */}
      <div
        className="flex items-end gap-1 w-full"
        style={{ height: `${height}px` }}
      >
        {data.map((point, i) => {
          // Scale from 15% to 100% of height for visual clarity
          const normalized = ((point.value - min) / range) * 85 + 15;

          return (
            <div
              key={`${point.label}-${i}`}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              {/* Hover tooltip */}
              <span className="absolute -top-5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap z-10">
                {point.value}
              </span>

              {/* Bar with dot on top */}
              <div className="w-full flex-1 flex items-end justify-center">
                <div className="relative w-full max-w-[24px] flex flex-col items-center">
                  {/* Dot */}
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0 group-hover:scale-150 transition-transform z-10',
                      color
                    )}
                  />
                  {/* Stem */}
                  <div
                    className={cn(
                      'w-1 rounded-b transition-all duration-500 opacity-40 group-hover:opacity-70',
                      color
                    )}
                    style={{ height: `${normalized}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      {showLabels && (
        <div className="flex gap-1 mt-1.5">
          {data.map((point, i) => (
            <span
              key={`label-${point.label}-${i}`}
              className="flex-1 text-[9px] text-muted-foreground text-center truncate leading-none"
            >
              {point.label.split(' ')[0]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BarChart - CSS-only bar chart with optional secondary values
// ============================================================================

export interface BarChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  maxValue?: number;
  height?: number;
  color?: string;
  secondaryColor?: string;
  showLabels?: boolean;
  horizontal?: boolean;
}

/**
 * BarChart renders vertical or horizontal CSS bars proportionally.
 * If secondaryValue is provided, shows side-by-side bars (e.g., expected vs collected).
 * No SVG or canvas - pure div widths/heights with transitions.
 */
export function BarChart({
  data,
  maxValue: maxOverride,
  height = 160,
  color = 'bg-neutral-600 dark:bg-neutral-400',
  secondaryColor = 'bg-neutral-300 dark:bg-neutral-600',
  showLabels = true,
  horizontal = false,
}: BarChartProps) {
  if (data.length === 0) return null;

  const allValues = data.flatMap((d) =>
    d.secondaryValue != null ? [d.value, d.secondaryValue] : [d.value]
  );
  const max = maxOverride ?? Math.max(...allValues);
  const hasSecondary = data.some((d) => d.secondaryValue != null);

  if (horizontal) {
    return (
      <div className="w-full space-y-2.5">
        {data.map((point, i) => {
          const primaryWidth = max > 0 ? (point.value / max) * 100 : 0;
          const secondaryWidth =
            hasSecondary && point.secondaryValue != null && max > 0
              ? (point.secondaryValue / max) * 100
              : 0;

          return (
            <div key={`${point.label}-${i}`} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium truncate mr-2">
                  {point.label}
                </span>
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {point.value}
                  {hasSecondary &&
                    point.secondaryValue != null &&
                    ` / ${point.secondaryValue}`}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      color
                    )}
                    style={{ width: `${primaryWidth}%` }}
                  />
                </div>
                {hasSecondary && point.secondaryValue != null && (
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        secondaryColor
                      )}
                      style={{ width: `${secondaryWidth}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical bars (default)
  return (
    <div className="w-full">
      <div
        className="flex items-end gap-1.5 w-full"
        style={{ height: `${height}px` }}
      >
        {data.map((point, i) => {
          const primaryHeight = max > 0 ? (point.value / max) * 100 : 0;
          const secondaryHeight =
            hasSecondary && point.secondaryValue != null && max > 0
              ? (point.secondaryValue / max) * 100
              : 0;

          return (
            <div
              key={`${point.label}-${i}`}
              className="flex-1 flex items-end justify-center gap-0.5 group"
            >
              {/* Primary bar */}
              <div className="relative flex-1 flex items-end justify-center">
                <span className="absolute -top-5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap z-10">
                  {point.value}
                </span>
                <div
                  className={cn(
                    'w-full rounded-t transition-all duration-500 group-hover:opacity-80',
                    color
                  )}
                  style={{ height: `${primaryHeight}%` }}
                />
              </div>

              {/* Secondary bar (side-by-side) */}
              {hasSecondary && point.secondaryValue != null && (
                <div className="relative flex-1 flex items-end justify-center">
                  <span className="absolute -top-5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap z-10">
                    {point.secondaryValue}
                  </span>
                  <div
                    className={cn(
                      'w-full rounded-t transition-all duration-500 group-hover:opacity-80',
                      secondaryColor
                    )}
                    style={{ height: `${secondaryHeight}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      {showLabels && (
        <div className="flex gap-1.5 mt-1.5">
          {data.map((point, i) => (
            <span
              key={`label-${point.label}-${i}`}
              className="flex-1 text-[9px] text-muted-foreground text-center truncate leading-none"
            >
              {point.label.split(' ')[0]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
