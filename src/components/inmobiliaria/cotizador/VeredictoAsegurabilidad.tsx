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
        badge:
          'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-[#2C7A53] dark:text-[#3EAE70] border-[#2C7A53]/25 dark:border-[#2C7A53]/40',
        iconColor: 'text-[#2C7A53] dark:text-[#3EAE70]',
      }
    case 'partial':
      return {
        Icon: WarningCircle,
        badge:
          'bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F] border-[#B7791F]/25 dark:border-[#B7791F]/40',
        iconColor: 'text-[#B7791F] dark:text-[#D2992F]',
      }
    case 'no':
    default:
      // Neutro deliberado — no es un "error", es un resultado. Sin rojo.
      return {
        Icon: MinusCircle,
        badge:
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
        iconColor: 'text-neutral-500 dark:text-neutral-400',
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
      className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
    >
      {/* ── CONCLUSIÓN ───────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5">
        {/* Eyebrow: badge de asegurabilidad + badge global de honestidad */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.04em]',
              tone.badge,
            ].join(' ')}
          >
            <Icon weight="fill" className={`w-3.5 h-3.5 ${tone.iconColor}`} />
            {asegStatusLabel}
          </span>
          {/* Badge de honestidad — neutro, mono, sin azul de relleno */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800/70 px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-[2px] bg-neutral-400 dark:bg-neutral-500" />
            {provenanceLabel}
          </span>
        </div>

        {/* Titular en lenguaje natural */}
        <h2 className="mt-4 text-[22px] font-medium tracking-[-0.02em] leading-tight text-[#0B1220] dark:text-white">
          {finalVerdict.asegurabilidad === 'no'
            ? t('inmobiliaria.ai.cotizador.detail.veredicto.headlineNo')
            : t('inmobiliaria.ai.cotizador.detail.veredicto.headline', {
                status: asegStatusLabel.toLowerCase(),
                count: acceptingCount,
              })}
        </h2>

        {/* reasoning_trace_es como párrafo */}
        {finalVerdict.reasoning_trace_es && (
          <p className="mt-2.5 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-300 max-w-2xl">
            {finalVerdict.reasoning_trace_es}
          </p>
        )}

        {/* cohort_insights — línea sutil */}
        {finalVerdict.cohort_insights && (
          <p className="mt-3 text-[12.5px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
            {t('inmobiliaria.ai.cotizador.detail.veredicto.cohort', {
              label: finalVerdict.cohort_insights.label_es,
              confidence: Math.round(finalVerdict.cohort_insights.confidence * 100),
            })}
          </p>
        )}
      </div>

      {/* ── RECOMENDACIÓN ────────────────────────────────────────────────── */}
      {showRecommendation && recommendedCarrierName && (
        <div className="border-t border-neutral-200/80 dark:border-neutral-800 bg-[#F7F8FF] dark:bg-[#1A40FF]/[0.07] px-6 py-5">
          <div className="flex items-start gap-3">
            {/* El ÚNICO acento de marca #1A40FF del bloque */}
            <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-[#1A40FF] text-white">
              <Sparkle weight="fill" className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#1A40FF] dark:text-[#8FA3FF]">
                  {t('inmobiliaria.ai.cotizador.detail.veredicto.recomendadaEyebrow')}
                </span>
              </div>
              <h3 className="mt-1.5 text-[17px] font-semibold tracking-[-0.01em] text-[#0B1220] dark:text-white">
                {t('inmobiliaria.ai.cotizador.detail.veredicto.recomendamos', {
                  carrier: recommendedCarrierName,
                })}
              </h3>

              {/* El "porqué" — prima + condiciones reales del grid */}
              <div className="mt-3 space-y-2.5">
                {recommendedPrima != null && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[20px] font-bold tabular-nums text-[#0B1220] dark:text-white">
                      {formatCurrency(recommendedPrima)}
                    </span>
                    <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                      {t('inmobiliaria.ai.cotizador.detail.veredicto.primaPorMes')}
                    </span>
                  </div>
                )}

                {recommendedCondiciones.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-neutral-400 dark:text-neutral-500">
                      {t('inmobiliaria.ai.cotizador.detail.veredicto.porQue')}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {recommendedCondiciones.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[13.5px] text-neutral-600 dark:text-neutral-300"
                        >
                          <ArrowRight
                            weight="bold"
                            className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#1A40FF] dark:text-[#8FA3FF]"
                          />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[13.5px] text-neutral-600 dark:text-neutral-300">
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
