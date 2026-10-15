'use client'

/**
 * RazonamientoDePropuesta — por qué Naira propone lo que propone, detrás de un tap (Fase 13, plan 13-05; D13-14, UI-SPEC
 * §7.6, §11.1).
 *
 * Cerrado al montar y nunca auto-abierto: la consecuencia va primero y el razonamiento se ve solo si la persona lo pide
 * (ACT-05). Abierto, cada hecho es una fila DATO (D13-9) con su valor CRUDO, su corte pegado y el enlace al listado de su
 * fuente (P8: la representación por unidad no está fijada, así que formatearla podría mentir; la tabla cruda sale SOLO en
 * la referencia técnica del popover). Después, la señal que la originó y la investigación, con los enlaces que la página
 * arma (D13-1). Un valor que no se puede leer lo dice, nunca pinta `0`.
 *
 * NO pinta el grado de certeza del agente, la volatilidad ni el id interno de un hecho (U11).
 */

import type { JSX } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { CaretDown } from '@phosphor-icons/react'

import { buttonVariants } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { NairaActionDetail } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import { claveDelAporte, valorDelHecho } from '@/lib/naira/vocabulario-de-aprobaciones'
import { cn } from '@/lib/utils'

import { BloqueDeCategoria } from './BloqueDeCategoria'
import { CifraDeNaira } from './CifraDeNaira'

export interface RazonamientoDePropuestaProps {
  readonly razonamiento: NairaActionDetail['razonamiento']
  /** `null` sin signal-view o id vacío. */
  readonly hrefDeLaSenal: string | null
  /** `null` si sin_investigacion, sin signal-view o id vacío. */
  readonly hrefDeLaExplicacion: string | null
}

const CLASE_DEL_ENLACE = 'text-sm text-fg-muted underline underline-offset-2 hover:text-primary'

export function RazonamientoDePropuesta({
  razonamiento,
  hrefDeLaSenal,
  hrefDeLaExplicacion,
}: RazonamientoDePropuestaProps): JSX.Element {
  const { t } = useI18n()
  const [abierto, setAbierto] = useState(false)

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto} className="space-y-3">
      <CollapsibleTrigger
        data-naira-disparador-del-razonamiento=""
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-auto justify-start gap-2')}
      >
        {abierto ? t('inmobiliaria.ai.naira.propuesta.razonamiento.ocultar') : t('inmobiliaria.ai.naira.propuesta.razonamiento.ver')}
        <CaretDown aria-hidden="true" className="h-4 w-4" />
      </CollapsibleTrigger>
      <CollapsibleContent
        role="region"
        aria-label={t('inmobiliaria.ai.naira.propuesta.razonamiento.region')}
        data-naira-razonamiento=""
        className="space-y-4"
      >
        <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'LIVE_DATA' }}>
          <p className="text-sm font-medium text-fg">{t('inmobiliaria.ai.naira.propuesta.razonamiento.hechos')}</p>
          <ul className="space-y-3">
            {razonamiento.hechos.map((hecho, indice) => {
              const valor = valorDelHecho(hecho.value)
              const aporte = claveDelAporte(hecho.trust)
              return (
                <li key={indice} data-naira-hecho="" className="min-w-0 space-y-1">
                  {valor !== null ? (
                    <CifraDeNaira
                      valor={valor}
                      unidad=""
                      asOf={hecho.asOf}
                      de={{ kind: 'fuente', fuente: hecho.source }}
                      referenciaTecnica={hecho.source}
                    />
                  ) : (
                    <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.cifra.noLeida')}</p>
                  )}
                  {aporte !== null ? (
                    <p className="text-caption text-fg-muted">
                      {t('inmobiliaria.ai.naira.propuesta.aporte', { origen: t(aporte) })}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </BloqueDeCategoria>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.propuesta.razonamiento.senal')}</p>
          {hrefDeLaSenal !== null ? (
            <Link href={hrefDeLaSenal} className={CLASE_DEL_ENLACE}>
              {t('inmobiliaria.ai.naira.propuesta.razonamiento.verLaSenal')}
            </Link>
          ) : null}
        </div>
        {razonamiento.investigacion.kind === 'referencia' ? (
          hrefDeLaExplicacion !== null ? (
            <Link href={hrefDeLaExplicacion} className={CLASE_DEL_ENLACE}>
              {t('inmobiliaria.ai.naira.propuesta.razonamiento.verLaExplicacion')}
            </Link>
          ) : null
        ) : (
          <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.propuesta.razonamiento.sinInvestigacion')}</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
