'use client'

/**
 * ItemDelBriefing — un ítem CONGELADO del briefing de Naira (Fase 13, plan 13-03; D13-8, D13-9, D13-10, D13-15,
 * UI-SPEC §7.1).
 *
 * El ancla visual es el título-oración del servidor, pintado TAL CUAL (NOT-06: titula con el hecho y su consecuencia;
 * el front no lo reformatea). La cifra va debajo y SOLO por `CifraDeNaira` (valor + corte + camino a la fuente en un
 * contenedor; si el agente trajo el valor ya escrito, ése). La urgencia se dice con texto, nunca solo con color.
 *
 * La causa entra SIN clase: el contrato no clasifica la razón del ítem, así que `OracionesCausales` la oculta y lo
 * declara (fail-closed, E13-3); la clase de una oración la trae el contrato o no se pinta. Los votos solo donde la
 * sección vota (lo decide `BotonesDeUtilidad`) y solo si el Client tiene la acción `signal-feedback`.
 *
 * No conoce rutas del workspace (D13-1): el enlace a la ficha de la señal llega por props (`hrefDeLaSenal`).
 */

import type { JSX } from 'react'
import { useId } from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { NairaBriefingItem } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import { citasSinClase } from '@/lib/naira/briefing-y-senal'

import { BloqueDeCategoria } from './BloqueDeCategoria'
import { BotonesDeUtilidad } from './BotonesDeUtilidad'
import { CifraDeNaira } from './CifraDeNaira'
import { OracionesCausales } from './OracionesCausales'

export interface ItemDelBriefingProps {
  readonly item: NairaBriefingItem
  /** La ficha de la señal (la arma la página con rutas-de-naira.ts); `null` = sin enlace. */
  readonly hrefDeLaSenal: string | null
  /** El Client tiene la acción `signal-feedback` (D13-3); la sección decide el resto. */
  readonly puedeVotar: boolean
}

function claveDeUrgencia(urgencyClass: NairaBriefingItem['urgencyClass']): string {
  switch (urgencyClass) {
    case 'ventana_legal':
      return 'inmobiliaria.ai.naira.briefing.urgencia.ventana_legal'
    case 'irreversible':
      return 'inmobiliaria.ai.naira.briefing.urgencia.irreversible'
    case 'degradacion_con_realimentacion':
      return 'inmobiliaria.ai.naira.briefing.urgencia.degradacion_con_realimentacion'
    case 'reversible':
      return 'inmobiliaria.ai.naira.briefing.urgencia.reversible'
    default: {
      const _exhaustivo: never = urgencyClass
      return _exhaustivo
    }
  }
}

/** La urgencia del ítem con texto (UI-SPEC §6.7): un vocabulario cerrado, neutra en color. */
export function EtiquetaDeUrgencia({ urgencyClass }: { readonly urgencyClass: NairaBriefingItem['urgencyClass'] }): JSX.Element {
  const { t } = useI18n()
  return (
    <Badge variant="secondary" data-naira-urgencia={urgencyClass}>
      {t(claveDeUrgencia(urgencyClass))}
    </Badge>
  )
}

export function ItemDelBriefing({ item, hrefDeLaSenal, puedeVotar }: ItemDelBriefingProps): JSX.Element {
  const { t } = useI18n()
  const idTitulo = useId()
  const causa = item.causa
  return (
    <article
      data-naira-item={item.seccion}
      aria-labelledby={idTitulo}
      className="space-y-3 rounded-lg border border-border bg-surface p-4 md:p-6"
    >
      <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'LIVE_DATA' }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 id={idTitulo} className="text-base font-semibold leading-6 text-fg">
            {item.titulo}
          </h3>
          <EtiquetaDeUrgencia urgencyClass={item.urgencyClass} />
        </div>
        <CifraDeNaira
          valor={item.valor}
          unidad={item.unidad}
          asOf={item.asOf}
          de={{ kind: 'metrica', metricId: item.metricId }}
          referenciaTecnica={item.fuente}
          valorRenderizado={item.valorRenderizado}
        />
      </BloqueDeCategoria>
      {causa.kind === 'investigada' ? (
        <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'INFERENCE' }}>
          <OracionesCausales oraciones={citasSinClase([causa.razon])} />
        </BloqueDeCategoria>
      ) : (
        <BloqueDeCategoria
          origen={{ kind: 'seccion', seccion: 'INFERENCE' }}
          razonDeVacio={t('inmobiliaria.ai.naira.briefing.investigacionNoDisponible')}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {item.promocion.kind === 'promovida' && puedeVotar ? (
          <BotonesDeUtilidad
            promocionId={item.promocion.promocionId}
            origenDelVoto={{ kind: 'item_del_briefing', seccion: item.seccion }}
          />
        ) : null}
        {hrefDeLaSenal !== null ? (
          <Button asChild variant="link" size="sm">
            <Link href={hrefDeLaSenal}>
              {t('inmobiliaria.ai.naira.briefing.verLaSenal')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
    </article>
  )
}
