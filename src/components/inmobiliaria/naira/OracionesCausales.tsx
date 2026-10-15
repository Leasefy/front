'use client'

/**
 * OracionesCausales — el ÚNICO lugar que decide si una oración causal de Naira se muestra (Fase 13, plan 13-02; D13-10,
 * CLM-01, UI-SPEC §6.4, C5).
 *
 * Fail-closed por oración: se muestra solo si el contrato trae su `claimClass`, y una hipótesis solo si además trae su
 * `hipotesis` (banda, alternativa y discriminador). Lo que no, no se pinta y se declara UNA vez: «Hay una explicación
 * investigada, pero esta versión de Naira no envía su clasificación, así que no la mostramos.» El texto del servidor se
 * pinta tal cual, con el chip de su clase al final y, si es hipótesis, su bloque debajo.
 *
 * Con E13-3 (D13-23) la señal le pasa `causa.citasConClase` TAL CUAL y se ven las citas que traen clase; sin ella, sus
 * `citas` como `{ texto, claimClass: null, hipotesis: null }` y todo se oculta con la declaración. La conversación (13-06)
 * le pasa sus oraciones de E13-4 con `hipotesis: null`: una hipótesis de ahí no trae banda y se oculta (declarado).
 *
 * Es el único archivo no-test que monta `ChipDeAfirmacion` (guardia claimclass-del-contrato.test.ts): ninguna
 * superficie puede pintar una clase sin pasar por este filtro.
 */

import type { JSX } from 'react'

import { useI18n } from '@/lib/i18n'
import type { ClaseDeAfirmacion, OracionCausal } from '@/lib/naira/afirmaciones'

import { BloqueDeHipotesis } from './BloqueDeHipotesis'
import { ChipDeAfirmacion } from './ChipDeAfirmacion'

export interface OracionesCausalesProps {
  readonly oraciones: readonly OracionCausal[]
}

function tieneSuClase(o: OracionCausal): o is OracionCausal & { readonly claimClass: ClaseDeAfirmacion } {
  return o.claimClass !== null && (o.claimClass !== 'hipotesis' || o.hipotesis !== null)
}

export function OracionesCausales({ oraciones }: OracionesCausalesProps): JSX.Element | null {
  const { t } = useI18n()
  if (oraciones.length === 0) return null
  const visibles = oraciones.filter(tieneSuClase)
  const hayOcultas = visibles.length < oraciones.length
  return (
    <div className="space-y-3">
      {visibles.map((o, i) => (
        <div key={i}>
          <p data-claim-class={o.claimClass} className="whitespace-pre-wrap text-base leading-6 text-fg">
            {o.texto}
            <ChipDeAfirmacion claimClass={o.claimClass} />
          </p>
          {o.claimClass === 'hipotesis' && o.hipotesis !== null ? <BloqueDeHipotesis hipotesis={o.hipotesis} /> : null}
        </div>
      ))}
      {hayOcultas ? (
        <p data-naira-causa-oculta="" className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.naira.afirmacion.causaOculta')}
        </p>
      ) : null}
    </div>
  )
}
