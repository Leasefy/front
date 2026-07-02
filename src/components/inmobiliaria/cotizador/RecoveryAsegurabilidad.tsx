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
import Link from 'next/link'
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
  UserPlus,
  Buildings,
  Archive,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  const cls = 'w-4 h-4 text-primary'
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
// Secondary-action menu button (callback → enabled; none → "Próximamente")
// ---------------------------------------------------------------------------

function RecoveryMenuButton({
  icon,
  label,
  onClick,
  proximamenteLabel,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  proximamenteLabel: string
}) {
  if (onClick) {
    return (
      <Button
        variant="outline"
        size="sm"
        hideArrow
        onClick={onClick}
        className="group w-full justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 min-w-0 text-primary">
          {icon}
          <span className="text-sm font-medium text-fg truncate">
            {label}
          </span>
        </span>
        <ArrowRight
          className="w-3.5 h-3.5 text-fg-muted shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Button>
    )
  }
  return (
    <Button
      variant="outline"
      size="sm"
      hideArrow
      disabled
      title={proximamenteLabel}
      className="w-full justify-between gap-2 text-left"
    >
      <span className="flex items-center gap-2 min-w-0 text-fg-muted">
        {icon}
        <span className="text-sm font-medium truncate">{label}</span>
      </span>
      <span className="text-[10px] font-normal text-fg-muted shrink-0">
        {proximamenteLabel}
      </span>
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Block 1 — Recovery ("nadie lo asegura")
// ---------------------------------------------------------------------------

function RecoveryBlock({
  recovery,
  onReQuote,
  onComplementarIngresos,
  onConsultarOtraEntidad,
  onGuardarNoAsegurable,
}: {
  recovery: RecoveryEvent | null
  onReQuote: () => void
  /** Optional handlers; omit → the menu item degrades to "Próximamente". */
  onComplementarIngresos?: () => void
  onConsultarOtraEntidad?: () => void
  onGuardarNoAsegurable?: () => void
}) {
  const { t } = useI18n()
  const tf = (k: string, fb: string) => {
    const r = t(k)
    return r === k ? fb : r
  }
  const paths = recovery ? parseRecoveryPaths(recovery.payload) : []

  return (
    <section
      aria-labelledby="recovery-heading"
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-[2px] bg-primary shrink-0" />
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            {t('inmobiliaria.ai.cotizador.detail.recovery.eyebrow')}
          </span>
        </div>
        <h2
          id="recovery-heading"
          className="mt-2.5 text-base font-semibold tracking-tight text-fg leading-tight"
        >
          {t('inmobiliaria.ai.cotizador.detail.recovery.titulo')}
        </h2>
        <p className="mt-1.5 text-sm text-fg-muted leading-relaxed">
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
                className="flex items-start gap-3 rounded-lg border border-border px-3.5 py-3"
              >
                <span className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg bg-primary-soft shrink-0">
                  <PathIcon kind={p.kind} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">
                    {p.label}
                  </p>
                  {p.detail && (
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {p.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          // Honest fallback — no recovery paths from the agent.
          <div className="flex items-start gap-2.5 rounded-lg bg-surface-muted px-3.5 py-3">
            <ChatCircleDots weight="duotone" className="w-4 h-4 text-fg-muted mt-0.5 shrink-0" />
            <p className="text-sm text-fg-muted leading-relaxed">
              {t('inmobiliaria.ai.cotizador.detail.recovery.asesorHint')}
            </p>
          </div>
        )}
      </div>

      {/* Secondary-action menu (visión #10) — explicit alternative caminos when
          nobody insures this candidate. Two are deep-links (buscar otro
          candidato → nueva consulta; sugerir otro inmueble → matching); the
          rest are optional callbacks that degrade to "Próximamente". */}
      <div className="px-5 pb-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
          {tf('inmobiliaria.ai.cotizador.detail.recovery.menu.eyebrow', 'Otros caminos')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Buscar otro candidato → nueva consulta */}
          <Button
            variant="outline"
            size="sm"
            hideArrow
            asChild
            className="group w-full justify-between gap-2 text-left"
          >
            <Link href="/panel/inmobiliaria/ai/asegurabilidad/nueva">
              <span className="flex items-center gap-2 min-w-0">
                <MagnifyingGlass weight="duotone" className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-fg truncate">
                  {tf('inmobiliaria.ai.cotizador.detail.recovery.menu.otroCandidato', 'Buscar otro candidato')}
                </span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-fg-muted shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </Link>
          </Button>

          {/* Sugerir otro inmueble → matching (deep-link) */}
          <Button
            variant="outline"
            size="sm"
            hideArrow
            asChild
            className="group w-full justify-between gap-2 text-left"
          >
            <Link href="/panel/inmobiliaria/ai/matching">
              <span className="flex items-center gap-2 min-w-0">
                <House weight="duotone" className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-fg truncate">
                  {tf('inmobiliaria.ai.cotizador.detail.recovery.menu.sugerirInmueble', 'Sugerir otro inmueble')}
                </span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-fg-muted shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </Link>
          </Button>

          {/* Complementar ingresos */}
          <RecoveryMenuButton
            icon={<TrendUp weight="duotone" className="w-4 h-4 shrink-0" aria-hidden="true" />}
            label={tf('inmobiliaria.ai.cotizador.detail.recovery.menu.complementarIngresos', 'Complementar ingresos')}
            onClick={onComplementarIngresos}
            proximamenteLabel={tf('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente', 'Próximamente')}
          />

          {/* Consultar otra entidad */}
          <RecoveryMenuButton
            icon={<Buildings weight="duotone" className="w-4 h-4 shrink-0" aria-hidden="true" />}
            label={tf('inmobiliaria.ai.cotizador.detail.recovery.menu.otraEntidad', 'Consultar otra entidad')}
            onClick={onConsultarOtraEntidad}
            proximamenteLabel={tf('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente', 'Próximamente')}
          />

          {/* Guardar como no asegurable */}
          <RecoveryMenuButton
            icon={<Archive weight="duotone" className="w-4 h-4 shrink-0" aria-hidden="true" />}
            label={tf('inmobiliaria.ai.cotizador.detail.recovery.menu.guardarNoAsegurable', 'Guardar como no asegurable')}
            onClick={onGuardarNoAsegurable}
            proximamenteLabel={tf('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente', 'Próximamente')}
          />
        </div>
      </div>

      {/* Footer — primary CTA reuses the existing re-quote flow. */}
      <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
        <span className="text-xs text-fg-muted">
          {t('inmobiliaria.ai.cotizador.detail.recovery.footerNote')}
        </span>
        <Button
          hideArrow
          onClick={onReQuote}
          className="group shrink-0"
        >
          <ArrowClockwise className="w-4 h-4" />
          {t('inmobiliaria.ai.cotizador.detail.recovery.recotizar')}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Button>
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
      className="rounded-xl border border-warning/25 bg-warning-soft/40 overflow-hidden"
    >
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <ListChecks weight="duotone" className="w-4 h-4 text-warning" />
          <h2
            id="condicionado-heading"
            className="text-base font-semibold text-warning"
          >
            {t('inmobiliaria.ai.cotizador.detail.condiciones.titulo')}
          </h2>
        </div>
        <p className="mt-1 text-sm text-warning/80 leading-relaxed">
          {t('inmobiliaria.ai.cotizador.detail.condiciones.subtitle', { n: entries.length })}
        </p>
      </div>

      <ul className="px-5 space-y-1.5">
        {entries.map((e, i) => (
          <li
            key={`${e.carrier}-${i}`}
            className="flex items-start gap-2.5 rounded-lg bg-card/70 px-3.5 py-2.5"
          >
            <span aria-hidden="true" className="mt-1.5 w-1 h-1 rounded-full bg-warning/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-fg leading-relaxed">
                {e.condicion}
              </p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-warning">
                {e.carrier}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-end px-5 py-4">
        {onResolverCondiciones ? (
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={onResolverCondiciones}
          >
            {t('inmobiliaria.ai.cotizador.detail.condiciones.resolver')}
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            hideArrow
            disabled
            title={t('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente')}
          >
            {t('inmobiliaria.ai.cotizador.detail.condiciones.resolver')}
            <span className="text-[11px] font-normal opacity-70">
              · {t('inmobiliaria.ai.cotizador.detail.carrierCard.proximamente')}
            </span>
          </Button>
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
  /** Secondary-action menu (visión #10) — optional; omitted items degrade to "Próximamente". */
  onComplementarIngresos?: () => void
  onConsultarOtraEntidad?: () => void
  onGuardarNoAsegurable?: () => void
}

export function RecoveryAsegurabilidad({
  asegurabilidad,
  recovery,
  carriers,
  onReQuote,
  onResolverCondiciones,
  onComplementarIngresos,
  onConsultarOtraEntidad,
  onGuardarNoAsegurable,
}: RecoveryAsegurabilidadProps) {
  const showRecovery = asegurabilidad === 'no'
  const hasConditional = carriers.some(c => c.status === 'conditional')

  if (!showRecovery && !hasConditional) return null

  return (
    <div className={cn('space-y-4')}>
      {showRecovery && (
        <RecoveryBlock
          recovery={recovery}
          onReQuote={onReQuote}
          onComplementarIngresos={onComplementarIngresos}
          onConsultarOtraEntidad={onConsultarOtraEntidad}
          onGuardarNoAsegurable={onGuardarNoAsegurable}
        />
      )}
      {hasConditional && (
        <CondicionadoBlock carriers={carriers} onResolverCondiciones={onResolverCondiciones} />
      )}
    </div>
  )
}
