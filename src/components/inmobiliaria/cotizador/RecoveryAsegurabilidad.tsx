'use client'

/**
 * RecoveryAsegurabilidad — visión #10 ("nadie lo asegura" → caminos) + #11
 * (condicionado → "Condiciones por resolver").
 *
 * Two independent blocks, each rendered only when its data is present:
 *
 *  1. RECOVERY (#10): when final_verdict.asegurabilidad === 'no', instead of a
 *     cold "nobody insures this" screen, we show actionable paths derived from
 *     `agent.recovery` (counterfactual payload: subir ingreso codeudor, bajar
 *     canon, agregar codeudor, cambiar tipo). The primary CTA "Re-cotizar con
 *     cambios" reuses the EXISTING re-quote flow (onReQuote). When no recovery
 *     arrived we show an honest message + an "hablar con un asesor" fallback.
 *
 *  2. CONDICIONADO (#11): when ≥1 carrier is 'conditional', an aggregated
 *     "Condiciones por resolver" section listing condición × entidad, with a
 *     "Resolver condiciones" CTA that opens the counterfactual modal
 *     (onResolverCondiciones). No endpoint is invented; the CTA degrades to a
 *     disabled "Próximamente" control when no callback is provided.
 *
 * HONESTY: this is prevalidación. Copy never promises an insurer decision.
 */

import * as React from 'react'
import {
  ArrowClockwise,
  ArrowRight,
  Lightbulb,
  ChatCircleDots,
  ListChecks,
  TrendUp,
  UsersThree,
  House,
  Coins,
} from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import {
  parseRecoveryPaths,
  type RecoveryEvent,
  type RecoveryPath,
} from '@/lib/cotizador/verdict-derive'

// ---------------------------------------------------------------------------
// Path icon
// ---------------------------------------------------------------------------

function PathIcon({ kind }: { kind: RecoveryPath['kind'] }) {
  const cls = 'w-4 h-4 text-[#1A40FF] dark:text-[#8FA3FF]'
  switch (kind) {
    case 'canon':
      return <Coins weight="duotone" className={cls} />
    case 'codeudores':
      return <UsersThree weight="duotone" className={cls} />
    case 'ingreso':
      return <TrendUp weight="duotone" className={cls} />
    case 'tipo':
      return <House weight="duotone" className={cls} />
    case 'custom':
    default:
      return <Lightbulb weight="duotone" className={cls} />
  }
}

// ---------------------------------------------------------------------------
// Block 1 — Recovery ("nadie lo asegura")
// ---------------------------------------------------------------------------

function RecoveryBlock({
  recovery,
  onReQuote,
}: {
  recovery: RecoveryEvent | null
  onReQuote: () => void
}) {
  const { t } = useI18n()
  const paths = recovery ? parseRecoveryPaths(recovery.payload) : []

  return (
    <section
      aria-labelledby="recovery-heading"
      className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
    >
      <div className="px-5 pt-5 pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-[2px] bg-[#1A40FF] shrink-0" />
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#1A40FF] dark:text-[#8FA3FF]">
            {t('inmobiliaria.ai.cotizador.detail.recovery.eyebrow')}
          </span>
        </div>
        <h2
          id="recovery-heading"
          className="mt-2.5 text-[18px] font-medium tracking-[-0.02em] text-neutral-800 dark:text-white leading-tight"
        >
          {t('inmobiliaria.ai.cotizador.detail.recovery.titulo')}
        </h2>
        <p className="mt-1.5 text-[13.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {paths.length > 0
            ? t('inmobiliaria.ai.cotizador.detail.recovery.introPaths')
            : t('inmobiliaria.ai.cotizador.detail.recovery.intro')}
        </p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {paths.length > 0 ? (
          <ul className="space-y-2">
            {paths.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-neutral-200/70 dark:border-neutral-800 px-3.5 py-3"
              >
                <span className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg bg-[#1A40FF]/[0.07] dark:bg-[#1A40FF]/15 shrink-0">
                  <PathIcon kind={p.kind} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100">
                    {p.label}
                  </p>
                  {p.detail && (
                    <p className="mt-0.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">
                      {p.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          // Honest fallback — no recovery paths from the agent.
          <div className="flex items-start gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 px-3.5 py-3">
            <ChatCircleDots weight="duotone" className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {t('inmobiliaria.ai.cotizador.detail.recovery.asesorHint')}
            </p>
          </div>
        )}
      </div>

      {/* Footer — primary CTA reuses the existing re-quote flow. */}
      <div className="flex items-center justify-between gap-4 border-t border-neutral-200/80 dark:border-neutral-800 px-5 py-4">
        <span className="text-[12px] text-neutral-400 dark:text-neutral-500">
          {t('inmobiliaria.ai.cotizador.detail.recovery.footerNote')}
        </span>
        <button
          type="button"
          onClick={onReQuote}
          className="group inline-flex items-center gap-2 h-10 px-5 rounded-md bg-[#1A40FF] text-white text-sm font-medium hover:bg-[#1636D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A40FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 transition-colors motion-reduce:transition-none"
        >
          <ArrowClockwise className="w-4 h-4" />
          {t('inmobiliaria.ai.cotizador.detail.recovery.recotizar')}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </button>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Block 2 — Condicionado ("Condiciones por resolver")
// ---------------------------------------------------------------------------

interface CondicionEntry {
  carrier: string
  condicion: string
}

function CondicionadoBlock({
  carriers,
  onResolverCondiciones,
}: {
  carriers: CarrierState[]
  onResolverCondiciones?: () => void
}) {
  const { t } = useI18n()

  const entries: CondicionEntry[] = carriers
    .filter(c => c.status === 'conditional')
    .flatMap(c =>
      c.condiciones.length > 0
        ? c.condiciones.map(condicion => ({ carrier: c.carrier, condicion }))
        : [{ carrier: c.carrier, condicion: t('inmobiliaria.ai.cotizador.detail.condiciones.unspecified') }],
    )

  if (entries.length === 0) return null

  return (
    <section
      aria-labelledby="condicionado-heading"
      className="rounded-xl border border-[#B7791F]/25 dark:border-[#B7791F]/30 bg-[#F8F0E0]/40 dark:bg-[#B7791F]/[0.08] overflow-hidden"
    >
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <ListChecks weight="duotone" className="w-4 h-4 text-[#B7791F] dark:text-[#D2992F]" />
          <h2
            id="condicionado-heading"
            className="text-[15px] font-semibold text-[#8A5A12] dark:text-[#D2992F]"
          >
            {t('inmobiliaria.ai.cotizador.detail.condiciones.titulo')}
          </h2>
        </div>
        <p className="mt-1 text-[13px] text-[#8A5A12]/80 dark:text-[#D2992F]/80 leading-relaxed">
          {t('inmobiliaria.ai.cotizador.detail.condiciones.subtitle', { n: entries.length })}
        </p>
      </div>

      <ul className="px-5 space-y-1.5">
        {entries.map((e, i) => (
          <li
            key={`${e.carrier}-${i}`}
            className="flex items-start gap-2.5 rounded-lg bg-white/70 dark:bg-neutral-900/40 px-3.5 py-2.5"
          >
            <span aria-hidden="true" className="mt-1.5 w-1 h-1 rounded-full bg-[#B7791F]/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] text-neutral-700 dark:text-neutral-200 leading-relaxed">
                {e.condicion}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[#B7791F] dark:text-[#D2992F]">
                {e.carrier}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-end px-5 py-4">
        {onResolverCondiciones ? (
          <button
            type="button"
            onClick={onResolverCondiciones}
            className="inline-flex items-center gap-2 rounded-md border border-[#B7791F]/40 bg-white dark:bg-neutral-900 px-4 py-2 text-sm font-medium text-[#8A5A12] dark:text-[#D2992F] hover:bg-[#F8F0E0] dark:hover:bg-[#B7791F]/15 transition-colors"
          >
            {t('inmobiliaria.ai.cotizador.detail.condiciones.resolver')}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled
            title={t('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente')}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
          >
            {t('inmobiliaria.ai.cotizador.detail.condiciones.resolver')}
            <span className="text-[11px] font-normal opacity-70">
              · {t('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente')}
            </span>
          </button>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RecoveryAsegurabilidadProps {
  /** final_verdict.asegurabilidad — controls whether the recovery block shows. */
  asegurabilidad: 'yes' | 'partial' | 'no' | null
  /** Latest agent.recovery event (null when none arrived). */
  recovery: RecoveryEvent | null
  /** All carriers (used to aggregate the condicionado section). */
  carriers: CarrierState[]
  /** Reuses the existing re-quote flow (navigate to wizard with ?from=). */
  onReQuote: () => void
  /** Opens the counterfactual modal; omit to degrade the condicionado CTA. */
  onResolverCondiciones?: () => void
}

export function RecoveryAsegurabilidad({
  asegurabilidad,
  recovery,
  carriers,
  onReQuote,
  onResolverCondiciones,
}: RecoveryAsegurabilidadProps) {
  const showRecovery = asegurabilidad === 'no'
  const hasConditional = carriers.some(c => c.status === 'conditional')

  if (!showRecovery && !hasConditional) return null

  return (
    <div className={cn('space-y-4')}>
      {showRecovery && <RecoveryBlock recovery={recovery} onReQuote={onReQuote} />}
      {hasConditional && (
        <CondicionadoBlock carriers={carriers} onResolverCondiciones={onResolverCondiciones} />
      )}
    </div>
  )
}
