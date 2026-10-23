'use client'

/**
 * RecomendacionRail — asegurabilidad (ex-cotizador), zona DERECHA "Recomendación".
 *
 * Espejo de EstudioRecommendationRail (estudio):
 *  - eyebrow de zona
 *  - conclusión: la mejor opción del agente (finalVerdict.mejor_opcion) + el
 *    razonamiento natural (reasoning_trace_es) bajo una hairline como "por qué".
 *  - "Siguiente mejor acción": Avanzar con la recomendada (cuando hay una opción
 *    asegurable) o Re-cotizar (cuando no la hay).
 *  - monta el trigger de <PostSeleccionSheet/> (visión #22).
 *
 * UX-only: NO ejecuta nada por sí mismo — relayea callbacks al padre.
 */

import { ArrowRight, ArrowCounterClockwise } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { useTr } from '@/lib/i18n/use-tr'
import { Button } from '@/components/ui/button'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import type { FinalVerdict } from '@/lib/cotizador/verdict-derive'
import { formatPrimaCop } from '@/lib/cotizador/verdict-derive'
import { nombreDeLaAseguradora } from '@/lib/cotizador/nombre-de-la-aseguradora'
import type { SeguimientoDeLaCotizacion } from '@/lib/cotizador/seguimiento'
import { Spinner } from '@/components/ui/spinner'
import { PostSeleccionSheet, type PostSeleccionCode } from './PostSeleccionSheet'

const NS = 'inmobiliaria.ai.cotizador'

interface RecomendacionRailProps {
  finalVerdict: FinalVerdict | null
  carriers: CarrierState[]
  /** Avanzar con la opción recomendada (sin backend → padre muestra próximamente). */
  onAvanzar: () => void
  /** Re-cotizar con cambios (handler existente del padre). */
  onReQuote?: () => void
  /** Pasos post-selección (visión #22) → padre. */
  onPostSeleccion: (code: PostSeleccionCode) => void
  /** COTIZ-17: la elegida y la póliza que ya quedaron. */
  seguimiento?: SeguimientoDeLaCotizacion | null
  /** «Avanzar» está guardando la elegida. */
  guardando?: boolean
  /** El panel de pasos, abierto desde afuera. */
  pasosAbiertos?: boolean
  onPasosAbiertosChange?: (abierto: boolean) => void
}

export function RecomendacionRail({
  finalVerdict,
  carriers,
  onAvanzar,
  onReQuote,
  onPostSeleccion,
  seguimiento = null,
  guardando = false,
  pasosAbiertos,
  onPasosAbiertosChange,
}: RecomendacionRailProps) {
  const { t } = useI18n()
  const tr = useTr()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  const aseg = finalVerdict?.asegurabilidad ?? null
  const mejor = finalVerdict?.mejor_opcion ?? null
  const porQue = finalVerdict?.reasoning_trace_es ?? null
  const hasAsegurable = carriers.some(
    (c) => c.status === 'approved' || c.status === 'conditional',
  )
  const elegida = seguimiento?.opcionElegida ?? null

  // Eyebrow compartido por los estados (con / sin recomendación).
  const eyebrow = (
    <h2 className="flex items-center gap-2.5">
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-[2px] bg-primary shrink-0" />
      <span className="text-caption font-medium uppercase tracking-wide text-fg-muted">
        {tf(`${NS}.recomendacion.eyebrow`, 'Recomendación')}
      </span>
    </h2>
  )

  // Sin veredicto aún: estado tranquilo.
  if (!finalVerdict) {
    return (
      <div className="space-y-4">
        {eyebrow}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-fg-muted">
            {tf(
              `${NS}.recomendacion.sinRecomendacion`,
              'La recomendación aparecerá cuando el análisis termine.',
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {eyebrow}

      {/* Conclusión — mejor opción del agente */}
      <section
        className="rounded-lg border border-border bg-card p-4"
        data-testid="recomendacion-rail-conclusion"
      >
        <h3 className="text-sm font-medium text-fg">
          {tf(`${NS}.recomendacion.conclusion`, 'Conclusión')}
        </h3>
        {mejor ? (
          <p className="mt-2 text-sm leading-snug text-fg">
            {tf(`${NS}.recomendacion.mejorOpcion`, 'Mejor opción')}:{' '}
            <span className="font-medium text-fg">
              {nombreDeLaAseguradora(mejor.carrier)}
            </span>
            {mejor.prima_mensual_cop != null && (
              <>
                {' · '}
                <span className="tabular-nums">{formatPrimaCop(mejor.prima_mensual_cop)}</span>
                <span className="text-fg-muted">
                  {' '}
                  {tf(`${NS}.recomendacion.mensual`, '/mes')}
                </span>
              </>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-snug text-fg-muted">
            {aseg === 'no'
              ? tf(`${NS}.recomendacion.ningunaAsegura`, 'Ninguna entidad asegura este caso por ahora.')
              : tf(`${NS}.recomendacion.sinMejorOpcion`, 'Aún no hay una opción recomendada.')}
          </p>
        )}

        {/* Por qué — razonamiento natural bajo una hairline */}
        {porQue && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-caption font-medium text-fg-muted">
              {tf(`${NS}.recomendacion.porQue`, 'Por qué')}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-fg">
              {porQue}
            </p>
          </div>
        )}
      </section>

      {/* Siguiente mejor acción */}
      <section
        className="rounded-lg border border-border bg-card p-4"
        data-testid="recomendacion-rail-next-action"
      >
        <h3 className="text-sm font-medium text-fg">
          {tf(`${NS}.recomendacion.siguienteAccion`, 'Siguiente mejor acción')}
        </h3>
        {/* COTIZ-17: lo que ya quedó elegido (quién lo eligió está en el seguimiento). */}
        {elegida && (
          <p className="mt-2 text-sm text-fg" data-testid="recomendacion-elegida">
            {tf(`${NS}.recomendacion.elegida`, 'Opción elegida')}:{' '}
            <span className="font-medium">{nombreDeLaAseguradora(elegida)}</span>
            {seguimiento?.polizaNumero && (
              <span className="text-fg-muted">{` · póliza N.º ${seguimiento.polizaNumero}`}</span>
            )}
          </p>
        )}
        {hasAsegurable ? (
          <Button
            hideArrow
            onClick={onAvanzar}
            disabled={guardando}
            data-action="avanzar"
            className="mt-3 w-full"
          >
            {guardando ? (
              <Spinner size="sm" variant="current" />
            ) : (
              <>
                {elegida
                  ? tf(`${NS}.recomendacion.verPasos`, 'Ver los siguientes pasos')
                  : tf(`${NS}.recomendacion.avanzar`, 'Avanzar con la recomendada')}
                <ArrowRight className="w-4 h-4" weight="bold" aria-hidden="true" />
              </>
            )}
          </Button>
        ) : onReQuote ? (
          <Button
            variant="secondary"
            hideArrow
            onClick={onReQuote}
            data-action="recotizar"
            className="mt-3 w-full"
          >
            <ArrowCounterClockwise className="w-4 h-4" weight="regular" aria-hidden="true" />
            {tf(`${NS}.recomendacion.recotizar`, 'Re-cotizar con cambios')}
          </Button>
        ) : (
          // Nico (23-10-2026): «Re-cotizar» vive UNA vez, en el encabezado del caso.
          <p className="mt-3 text-body-sm text-fg-muted" data-testid="recotizar-arriba">
            {tr('Para probar con otro canon o un codeudor, usa «Re-cotizar» arriba.')}
          </p>
        )}
      </section>

      {/* Post-selección (visión #22) */}
      <PostSeleccionSheet
        onAction={onPostSeleccion}
        disabled={!hasAsegurable}
        {...(pasosAbiertos !== undefined ? { abierto: pasosAbiertos } : {})}
        {...(onPasosAbiertosChange ? { onAbiertoChange: onPasosAbiertosChange } : {})}
        conPoliza={Boolean(seguimiento?.polizaNumero)}
        resumen={
          elegida
            ? `Sobre ${nombreDeLaAseguradora(elegida)}${seguimiento?.polizaNumero ? `, póliza N.º ${seguimiento.polizaNumero}` : ''}.`
            : null
        }
      />
    </div>
  )
}
