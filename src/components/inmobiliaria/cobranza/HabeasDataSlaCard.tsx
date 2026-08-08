'use client'

/**
 * HabeasDataSlaCard — Phase 34 plan 34-07 (D-34-07, D-34-RES-A1).
 *
 * Renders one open Habeas Data request as a card with:
 *  - Referencia corta del deudor (el server manda el UUID pelado)
 *  - Countdown text via i18n (days+hours when ≥ 1 day; hours only when < 1d;
 *    overdue variant when remaining_days ≤ 0)
 *  - Progress bar: width % = ((15 - remaining_days) / 15) * 100, clamped 0..100
 *  - Traffic-light coloring driven by the backend `color` enum (D-34-07):
 *      green     → bg-success
 *      yellow    → bg-warning
 *      red       → bg-danger
 *      red-pulse → bg-danger animate-pulse  AND card border-danger/30 animate-pulse
 *
 * Uses semantic Tailwind tokens (rose/amber/emerald) per mvp:docs/DESIGN.md
 * §1 anti-pattern: "No raw Tailwind colors that bypass our scales (bg-danger
 * instead of bg-error-500 / bg-danger)". The backend's abstract color enum
 * (green/yellow/red/red-pulse) maps to the design system below.
 *
 * Refs mvp:docs/DESIGN.md §4 (cards: rounded-xl border bg-card),
 * §16 (numeric tabular-nums), mvp:docs/COLOR_SYSTEM.md (rose=error, amber=warn,
 * emerald=ok).
 */

import * as React from 'react'

import { MonoLabel } from '@leasefy/cadence'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { toDebtorRef } from '@/lib/hooks/cobranza/compliance-entries'
import type { HabeasDataOpenRequest, HabeasDataColor } from '@/lib/hooks/cobranza/use-compliance-overview'

void React

interface HabeasDataSlaCardProps {
  request: HabeasDataOpenRequest
}

const BAR_BG_BY_COLOR: Record<HabeasDataColor, string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-danger',
  // animate-pulse on bar + parent card border (see CARD_BORDER_BY_COLOR)
  'red-pulse': 'bg-danger animate-pulse',
}

const CARD_BORDER_BY_COLOR: Record<HabeasDataColor, string> = {
  green: 'border-border',
  yellow: 'border-warning/30',
  red: 'border-danger/30',
  // animate-pulse echoes the bar pulse on the card border
  'red-pulse': 'border-danger/30 animate-pulse',
}

/**
 * Relleno de la barra = parte del término ya consumida.
 *
 * Estaba fijo en 15, así que una consulta —cuyo término son 10 días hábiles
 * (Art. 14)— se dibujaba contra una ventana que no es la suya: la barra iba
 * corta y sugería más holgura de la que hay. El término lo manda el back en
 * `sla_business_days`; 15 queda de respaldo por si contesta un agente viejo.
 */
function progressPct(remainingDays: number, termDays = 15): number {
  const term = termDays > 0 ? termDays : 15
  if (remainingDays <= 0) return 100
  if (remainingDays >= term) return 0
  return Math.round(((term - remainingDays) / term) * 100)
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
  const { remaining_days, color, debtor_id, timestamp, sla_business_days } = request

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

  const pct = progressPct(remaining_days, sla_business_days)

  /**
   * La tarjeta era un callejón sin salida: mostraba un reloj legal corriendo y
   * no llevaba a ninguna parte. El operador veía «VENCIDO HACE 2D» y tenía que
   * adivinar dónde se atiende eso.
   *
   * La acción que detiene el reloj es el acuse, y vive en el registro de
   * «No contactar» — ahí está el botón «Marcar acuse». Así que la tarjeta lleva
   * ahí.
   */
  return (
    <Link
      href="/panel/inmobiliaria/ai/cobranza/compliance/opt-out"
      data-color={color}
      data-event-id={request.id}
      className={[
        'block rounded-xl border bg-card p-4 space-y-3 transition-opacity hover:opacity-80',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        CARD_BORDER_BY_COLOR[color],
      ].join(' ')}
      aria-label={`${t('inmobiliaria.ai.cobranza.compliance.overview.cardAction')} — ${countdown}`}
    >
      {/* Header: masked cedula + countdown text */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* El comentario de antes decía «server-masked» y el propio código
              admitía debajo que es el UUID pelado del deudor. `<Mask>` espera un
              valor YA enmascarado, así que pintaba 36 caracteres de UUID
              presentados como si fueran una cédula: ni es una cédula, ni está
              enmascarado. Se muestra una referencia corta, que es lo único que
              sirve — casar la tarjeta con su fila en la bitácora. */}
          <span
            className="block font-mono text-body-sm text-fg"
            title={t('inmobiliaria.ai.cobranza.compliance.overview.debtorRefHint')}
          >
            {toDebtorRef(debtor_id)}
          </span>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums font-mono">
            {relativeFromIso(timestamp, locale)}
          </p>
        </div>
        <MonoLabel
          className={[
            'text-xs tabular-nums whitespace-nowrap',
            remaining_days <= 0
              ? 'text-danger font-semibold'
              : color === 'red' || color === 'red-pulse'
                ? 'text-danger font-semibold'
                : color === 'yellow'
                  ? 'text-warning'
                  : 'text-success',
          ].join(' ')}
        >
          {countdown}
        </MonoLabel>
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
    </Link>
  )
}
