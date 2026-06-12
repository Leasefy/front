'use client'

/**
 * ComplianceSparkline — Phase 34 plan 34-07.
 *
 * 30-day daily-bucket flag-rate visualization. Hand-rolled SVG (no existing
 * Sparkline primitive in mvp/src/components — confirmed via filesystem scan).
 * Bars scale relative to the max bucket value with a minimum visible height
 * for non-zero buckets so single events don't disappear.
 *
 * Hover tooltip shows date + flag_rate_pct.
 *
 * Refs mvp:docs/DESIGN.md §16 (numeric tabular-nums), §1 (sobrio aesthetic —
 * uses indigo accent for non-zero values, muted neutral for zero).
 */

import * as React from 'react'
import { useMemo, useState } from 'react'

void React

export interface SparklineBucket {
  date: string
  flag_rate_pct: number
}

interface ComplianceSparklineProps {
  buckets: SparklineBucket[]
  /** Optional aria-label for the chart container. */
  ariaLabel?: string
}

const W = 600
const H = 96
const PADDING = 8

export function ComplianceSparkline({ buckets, ariaLabel }: ComplianceSparklineProps) {
  const [hover, setHover] = useState<number | null>(null)

  const maxVal = useMemo(() => {
    const m = buckets.reduce((acc, b) => Math.max(acc, b.flag_rate_pct), 0)
    return m === 0 ? 1 : m
  }, [buckets])

  const innerW = W - PADDING * 2
  const innerH = H - PADDING * 2
  const n = buckets.length || 1
  const barGap = 2
  const barW = Math.max(2, (innerW - barGap * (n - 1)) / n)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-24 block"
        role="img"
        aria-label={ariaLabel ?? 'flag rate sparkline 30 days'}
        preserveAspectRatio="none"
      >
        {/* baseline */}
        <line
          x1={PADDING}
          x2={W - PADDING}
          y1={H - PADDING}
          y2={H - PADDING}
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-border"
        />
        {buckets.map((b, i) => {
          const rel = b.flag_rate_pct / maxVal
          // ensure non-zero values are visually distinguishable
          const h =
            b.flag_rate_pct === 0
              ? 1
              : Math.max(2, Math.round(rel * innerH))
          const x = PADDING + i * (barW + barGap)
          const y = H - PADDING - h
          const isZero = b.flag_rate_pct === 0
          return (
            <rect
              key={b.date}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={1}
              className={
                isZero
                  ? 'fill-muted text-muted'
                  : hover === i
                    ? 'fill-indigo-600 dark:fill-indigo-400'
                    : 'fill-indigo-500/70 dark:fill-indigo-400/60'
              }
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {b.date}: {b.flag_rate_pct}%
              </title>
            </rect>
          )
        })}
      </svg>
      {hover !== null && buckets[hover] && (
        <div
          className="absolute top-0 right-0 text-xs font-mono tabular-nums text-muted-foreground pointer-events-none"
          aria-hidden="true"
        >
          {buckets[hover].date}: {buckets[hover].flag_rate_pct}%
        </div>
      )}
    </div>
  )
}
