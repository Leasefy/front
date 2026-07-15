'use client'

/**
 * VeredictoAsegurabilidad — la CONCLUSIÓN y RECOMENDACIÓN del cotizador.
 *
 * Vive ARRIBA del grid de aseguradoras y traduce los eventos terminales del
 * stream (agent.final_verdict + agent.partial_ranking, antes descartados) a
 * lenguaje natural:
 *
 *  1. CONCLUSIÓN (visión #8, #21): "El candidato es asegurable · N opciones
 *     encontradas" + el reasoning_trace_es como párrafo. Badge de asegurabilidad
 *     con color SOBRIO (verde / ámbar / neutro — nunca rojo agresivo).
 *  2. RECOMENDACIÓN (visión #12): card "Recomendamos avanzar con {carrier}"
 *     con el porqué derivado de la prima/condiciones del carrier en el grid.
 *     Es el ÚNICO elemento con el acento de marca #1A40FF.
 *  3. cohort_insights (si viene): línea sutil de confianza.
 *
 * HONESTIDAD: hoy todo el backend de aseguradoras es STUB. Mientras stubMode
 * sea true, el bloque lleva el badge "Estimado · Prevalidación Leasefy" y JAMÁS
 * dice "Confirmado por la aseguradora". El día que stubMode sea false pasa a
 * "Confirmado".
 *
 * Cuando asegurabilidad === 'no' NO se renderiza recomendación — eso lo maneja
 * W2 (agent.recovery).
 */

import { CheckCircle, WarningCircle, MinusCircle, Sparkle, ArrowRight } from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import type {
  CarrierState,
  FinalVerdict,
  PartialRanking,
} from '@/lib/hooks/cotizador/use-quote-stream'

interface VeredictoAsegurabilidadProps {
  finalVerdict: FinalVerdict
  partialRanking: PartialRanking | null
  carriers: CarrierState[]
  /** stub_mode del stream: true = estimado (prevalidación), false = confirmado. */
  stubMode: boolean
}

// ---------------------------------------------------------------------------
// Asegurabilidad → tono sobrio (verde / ámbar / neutro). NUNCA rojo agresivo.
// ---------------------------------------------------------------------------

type AsegBadge = {
  Icon: PhosphorIcon
  badge: string
  iconColor: string
}

function asegurabilidadTone(asegurabilidad: FinalVerdict['asegurabilidad']): AsegBadge {
  switch (asegurabilidad) {
    case 'yes':
      return {
        Icon: CheckCircle,
        badge: 'bg-success-soft text-success border-success/25',
        iconColor: 'text-success',
      }
    case 'partial':
      return {
        Icon: WarningCircle,
        badge: 'bg-warning-soft text-warning border-warning/25',
        iconColor: 'text-warning',
      }
    case 'no':
    default:
      // Neutro deliberado — no es un "error", es un resultado. Sin rojo.
      return {
        Icon: MinusCircle,
        badge: 'bg-surface-muted text-fg-muted border-border',
        iconColor: 'text-fg-muted',
      }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VeredictoAsegurabilidad({
  finalVerdict,
  partialRanking,
  carriers,
  stubMode,
}: VeredictoAsegurabilidadProps) {
  const { t, formatCurrency } = useI18n()

  const tone = asegurabilidadTone(finalVerdict.asegurabilidad)
  const { Icon } = tone

  // accepting_count: cuántas aseguradoras aceptan. Preferimos el del ranking;
  // si no llegó, lo derivamos del grid (approved + conditional).
  const acceptingCount =
    partialRanking?.accepting_count ??
    carriers.filter(c => c.status === 'approved' || c.status === 'conditional').length

  const headlineKey =
    finalVerdict.asegurabilidad === 'yes'
      ? 'veredicto.asegurable'
      : finalVerdict.asegurabilidad === 'partial'
        ? 'veredicto.asegurableConCondiciones'
        : 'veredicto.noAsegurable'

  const asegStatusLabel = t(`inmobiliaria.ai.cotizador.detail.${headlineKey}Label`)

  // El badge global de honestidad: estimado (prevalidación) vs confirmado.
  const provenanceLabel = stubMode
    ? t('inmobiliaria.ai.cotizador.detail.veredicto.estimadoBadge')
    : t('inmobiliaria.ai.cotizador.detail.veredicto.confirmadoBadge')

  // ── Recomendación: solo si es asegurable (yes/partial). 'no' → W2 (recovery).
  const showRecommendation =
    finalVerdict.asegurabilidad !== 'no' && finalVerdict.mejor_opcion != null

  // Carrier recomendado, casado contra el grid para derivar el "porqué"
  // (prima + condiciones reales que ya se renderizan abajo).
  const rawRecommendedCarrier = finalVerdict.mejor_opcion?.carrier ?? null
  // Los nombres de carrier llegan en minúscula del SSE ("sura", "mapfre").
  // Capitalizamos la primera letra para el titular, sin tocar el match al grid.
  const recommendedCarrierName = rawRecommendedCarrier
    ? rawRecommendedCarrier.charAt(0).toUpperCase() + rawRecommendedCarrier.slice(1)
    : null
  const recommendedFromGrid = recommendedCarrierName
    ? carriers.find(
        c => c.carrier.toLowerCase() === recommendedCarrierName.toLowerCase(),
      ) ?? null
    : null

  const recommendedPrima =
    recommendedFromGrid?.primaMensualCop ??
    finalVerdict.mejor_opcion?.prima_mensual_cop ??
    null
  const recommendedCondiciones = recommendedFromGrid?.condiciones ?? []

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      aria-label={t('inmobiliaria.ai.cotizador.detail.veredicto.regionLabel')}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* ── CONCLUSIÓN ───────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5">
        {/* Eyebrow: badge de asegurabilidad + badge global de honestidad */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide',
              tone.badge,
            ].join(' ')}
          >
            <Icon weight="fill" className={`w-3.5 h-3.5 ${tone.iconColor}`} />
            {asegStatusLabel}
          </span>
          {/* Badge de honestidad — neutro, sin azul de relleno */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-fg-muted">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-[2px] bg-fg-muted" />
            {provenanceLabel}
          </span>
        </div>

        {/* Titular en lenguaje natural */}
        <h2 className="mt-4 text-2xl font-semibold tracking-tight leading-tight text-fg">
          {finalVerdict.asegurabilidad === 'no'
            ? t('inmobiliaria.ai.cotizador.detail.veredicto.headlineNo')
            : t('inmobiliaria.ai.cotizador.detail.veredicto.headline', {
                status: asegStatusLabel.toLowerCase(),
                count: acceptingCount,
              })}
        </h2>

        {/* reasoning_trace_es como párrafo */}
        {finalVerdict.reasoning_trace_es && (
          <p className="mt-2.5 text-sm leading-relaxed text-fg-muted max-w-2xl">
            {finalVerdict.reasoning_trace_es}
          </p>
        )}

        {/* cohort_insights — línea sutil */}
        {finalVerdict.cohort_insights && (
          <p className="mt-3 text-xs text-fg-muted leading-relaxed">
            {t('inmobiliaria.ai.cotizador.detail.veredicto.cohort', {
              label: finalVerdict.cohort_insights.label_es,
              confidence: Math.round(finalVerdict.cohort_insights.confidence * 100),
            })}
          </p>
        )}
      </div>

      {/* ── RECOMENDACIÓN ────────────────────────────────────────────────── */}
      {showRecommendation && recommendedCarrierName && (
        <div className="border-t border-border bg-primary-soft px-6 py-5">
          <div className="flex items-start gap-3">
            {/* El ÚNICO acento de marca del bloque */}
            <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-fg">
              <Sparkle weight="fill" className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium uppercase tracking-wide text-primary">
                  {t('inmobiliaria.ai.cotizador.detail.veredicto.recomendadaEyebrow')}
                </span>
              </div>
              <h3 className="mt-1.5 text-base font-semibold tracking-tight text-fg">
                {t('inmobiliaria.ai.cotizador.detail.veredicto.recomendamos', {
                  carrier: recommendedCarrierName,
                })}
              </h3>

              {/* El "porqué" — prima + condiciones reales del grid */}
              <div className="mt-3 space-y-2.5">
                {recommendedPrima != null && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tabular-nums text-fg">
                      {formatCurrency(recommendedPrima)}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {t('inmobiliaria.ai.cotizador.detail.veredicto.primaPorMes')}
                    </span>
                  </div>
                )}

                {recommendedCondiciones.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                      {t('inmobiliaria.ai.cotizador.detail.veredicto.porQue')}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {recommendedCondiciones.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-fg-muted"
                        >
                          <ArrowRight
                            weight="bold"
                            className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary"
                          />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-fg-muted">
                    {t('inmobiliaria.ai.cotizador.detail.veredicto.porQueMejorPrecio')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  )
}
