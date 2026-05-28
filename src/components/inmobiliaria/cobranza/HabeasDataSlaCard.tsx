'use client'

/**
 * HabeasDataSlaCard — Phase 34 plan 34-07 (D-34-07, D-34-RES-A1).
 *
 * Renders one open Habeas Data request as a card with:
 *  - Server-masked debtor identifier (Mask field=cedula, no reveal)
 *  - Countdown text via i18n (days+hours when ≥ 1 day; hours only when < 1d;
 *    overdue variant when remaining_days ≤ 0)
 *  - Progress bar: width % = ((15 - remaining_days) / 15) * 100, clamped 0..100
 *  - Traffic-light coloring driven by the backend `color` enum (D-34-07):
 *      green     → bg-emerald-500
 *      yellow    → bg-amber-500
 *      red       → bg-rose-500
 *      red-pulse → bg-rose-500 animate-pulse  AND card border-rose-500 animate-pulse
 *
 * Uses semantic Tailwind tokens (rose/amber/emerald) per mvp:docs/DESIGN.md
 * §1 anti-pattern: "No raw Tailwind colors that bypass our scales (bg-red-500
 * instead of bg-error-500 / bg-rose-500)". The backend's abstract color enum
 * (green/yellow/red/red-pulse) maps to the design system below.
 *
 * Refs mvp:docs/DESIGN.md §4 (cards: rounded-xl border bg-card shadow-sm),
 * §16 (numeric tabular-nums), mvp:docs/COLOR_SYSTEM.md (rose=error, amber=warn,
 * emerald=ok).
 */

import * as React from 'react'

import { useI18n } from '@/lib/i18n'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import type { HabeasDataOpenRequest, HabeasDataColor } from '@/lib/hooks/cobranza/use-compliance-overview'

void React

interface HabeasDataSlaCardProps {
  request: HabeasDataOpenRequest
}

const BAR_BG_BY_COLOR: Record<HabeasDataColor, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
  // animate-pulse on bar + parent card border (see CARD_BORDER_BY_COLOR)
  'red-pulse': 'bg-rose-500 animate-pulse',
}

const CARD_BORDER_BY_COLOR: Record<HabeasDataColor, string> = {
  green: 'border-border',
  yellow: 'border-amber-300 dark:border-amber-800',
  red: 'border-rose-300 dark:border-rose-800',
  // animate-pulse echoes the bar pulse on the card border
  'red-pulse': 'border-rose-500 animate-pulse',
}

/** D-34-07 progress fill = elapsed/15-day window. Negative remaining ⇒ 100%. */
function progressPct(remainingDays: number): number {
  if (remainingDays <= 0) return 100
  if (remainingDays >= 15) return 0
  return Math.round(((15 - remainingDays) / 15) * 100)
}

function relativeFromIso(iso: string, locale: string): string {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (sec < 60) return locale.startsWith('es') ? `hace ${sec}s` : `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return locale.startsWith('es') ? `hace ${min}m` : `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return locale.startsWith('es') ? `hace ${hr}h` : `${hr}h ago`
  const days = Math.round(hr / 24)
  return locale.startsWith('es') ? `hace ${days}d` : `${days}d ago`
}

export function HabeasDataSlaCard({ request }: HabeasDataSlaCardProps) {
  const { t, locale } = useI18n()
  const { remaining_days, color, debtor_id, timestamp } = request

  // Countdown text:
  //   remaining_days >= 1 → "Quedan {days}d {hours}h"
  //   0 < remaining_days < 1 (we never get fractional but defensive) → "Quedan {hours}h"
  //   remaining_days <= 0 → "VENCIDO HACE {days_overdue}d"
  let countdown: string
  if (remaining_days > 0) {
    const days = Math.floor(remaining_days)
    // remaining_days is integer per server (Math.ceil); hours is informational.
    // Show 0h when integer; preserves the templated key shape.
    const hours = 0
    countdown = t('inmobiliaria.ai.cobranza.compliance.habeasData.remaining.days', {
      days,
      hours,
    })
  } else {
    countdown = t('inmobiliaria.ai.cobranza.compliance.habeasData.overdue', {
      days: Math.abs(remaining_days),
    })
  }

  const pct = progressPct(remaining_days)

  return (
    <div
      data-color={color}
      data-event-id={request.id}
      className={[
        'rounded-xl border bg-card shadow-sm p-4 space-y-3',
        CARD_BORDER_BY_COLOR[color],
      ].join(' ')}
      role="group"
      aria-label={`Habeas Data SLA ${countdown}`}
    >
      {/* Header: masked cedula + countdown text */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* debtor_id from server is the bare debtor UUID; we render the
              server-masked identifier when present (server already redacts).
              Mask with no onReveal — never revealable on the compliance surface. */}
          <Mask field="cedula" value={debtor_id} onReveal={undefined} />
          <p className="mt-1 text-xs text-muted-foreground tabular-nums font-mono">
            {relativeFromIso(timestamp, locale)}
          </p>
        </div>
        <span
          className={[
            'text-xs font-mono uppercase tracking-wide tabular-nums whitespace-nowrap',
            remaining_days <= 0
              ? 'text-rose-700 dark:text-rose-400 font-semibold'
              : color === 'red' || color === 'red-pulse'
                ? 'text-rose-700 dark:text-rose-400 font-semibold'
                : color === 'yellow'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400',
          ].join(' ')}
        >
          {countdown}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={t(`inmobiliaria.ai.cobranza.compliance.trafficLight.${
          color === 'red-pulse' ? 'redPulse' : color
        }`)}
      >
        <div
          className={['h-full transition-all', BAR_BG_BY_COLOR[color]].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
