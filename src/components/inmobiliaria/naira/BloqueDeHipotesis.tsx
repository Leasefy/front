'use client'

/**
 * BloqueDeHipotesis — lo que acompaña SIEMPRE a una afirmación de clase hipótesis: su banda de probabilidad, la
 * alternativa que se consideró y el dato que la confirmaría (Fase 13, plan 13-02; CLM-03, UI-SPEC §6.4-§6.5).
 *
 * Los tres campos son obligatorios (la `Hipotesis` de 09-03 no tiene opcionales): las tres filas están siempre. La banda
 * se pinta con `renderizarBanda` (el render EXACTO del ADR-005, U18) y jamás junto a un grado de certeza del modelo (el
 * ADR no mezcla probabilidad con esa otra medida, U11). La alternativa es una entidad del agente (un tipo y un id, nunca
 * el nombre de una persona) y va en mono. La métrica del discriminador va como su `metricId` en mono hasta que exista un
 * mapa de nombres de métricas en el front (P18).
 */

import type { JSX } from 'react'

import { useI18n } from '@/lib/i18n'
import { renderizarBanda, type HipotesisDeLaCita } from '@/lib/naira/afirmaciones'

export interface BloqueDeHipotesisProps {
  readonly hipotesis: HipotesisDeLaCita
}

const CONFIRMARIA = {
  sube: 'inmobiliaria.ai.naira.hipotesis.verQueSube',
  baja: 'inmobiliaria.ai.naira.hipotesis.verQueBaja',
} as const satisfies Record<HipotesisDeLaCita['discriminador']['direccionEsperada'], string>

export function BloqueDeHipotesis({ hipotesis }: BloqueDeHipotesisProps): JSX.Element {
  const { t } = useI18n()
  return (
    <dl className="mt-2 grid gap-1 rounded-sm bg-surface-muted p-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
      <dt className="text-fg-muted">{t('inmobiliaria.ai.naira.hipotesis.probabilidad')}</dt>
      <dd className="text-fg">{renderizarBanda(hipotesis.banda)}</dd>
      <dt className="text-fg-muted">{t('inmobiliaria.ai.naira.hipotesis.alternativa')}</dt>
      <dd className="text-fg">
        <Alternativa alternativa={hipotesis.alternativa} />
      </dd>
      <dt className="text-fg-muted">{t('inmobiliaria.ai.naira.hipotesis.confirmaria')}</dt>
      <dd className="text-fg">
        {t(CONFIRMARIA[hipotesis.discriminador.direccionEsperada], { metrica: hipotesis.discriminador.metricId })}
      </dd>
    </dl>
  )
}

function Alternativa({ alternativa }: { readonly alternativa: HipotesisDeLaCita['alternativa'] }): JSX.Element {
  const { t } = useI18n()
  switch (alternativa.kind) {
    case 'driver':
      return (
        <span className="font-mono text-caption">
          {alternativa.entidad.kind + ' · ' + alternativa.entidad.id}
        </span>
      )
    case 'sin_driver_alternativo_en_la_descomposicion':
      return <span>{t('inmobiliaria.ai.naira.hipotesis.sinAlternativa')}</span>
    default: {
      const _exhaustivo: never = alternativa
      return _exhaustivo
    }
  }
}
