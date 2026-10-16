'use client'

/**
 * PorQueDeLaPropuesta — por qué Naira propone esto, con sus palabras (#33, Nico 15-10-2026: «la IA redacta el porqué»).
 *
 * El porqué es la explicación que la IA YA escribió al investigar la señal que originó la propuesta: sin llamadas nuevas
 * al modelo y verificada (pasó los linters de la investigación). Se lee la MISMA ficha de la señal (`useNairaSenal`,
 * que exige `signal-view`: quien no la ve, no monta esto) y su causa citada se pinta por `OracionesCausales` (fail-closed
 * por oración, con su clase). Sin explicación investigada (no citable o no disponible), el texto de la regla: el título
 * de la señal, que ya trae su cifra y su corte (los hechos con su fuente van debajo). Si la señal no se puede leer, o es
 * de ejemplo, no pinta nada: quedan los enlaces.
 *
 * Vive DENTRO del razonamiento (cerrado al montar, ACT-05): la lectura sale recién cuando la persona lo abre.
 */

import type { JSX } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { useNairaSenal } from '@/lib/hooks/naira/use-naira-senal'
import { useI18n } from '@/lib/i18n'
import { citasSinClase } from '@/lib/naira/briefing-y-senal'

import { BloqueDeCategoria } from './BloqueDeCategoria'
import { OracionesCausales } from './OracionesCausales'

export function PorQueDeLaPropuesta({ promocionId }: { readonly promocionId: string }): JSX.Element | null {
  const { t } = useI18n()
  const { estado } = useNairaSenal(promocionId)
  if (estado.kind === 'cargando') return <Skeleton className="h-12 w-full rounded-md" />
  if (estado.kind !== 'ok' || estado.origen !== 'agente') return null
  const detalle = estado.data
  const causa = detalle.causa

  return (
    <div className="space-y-2" data-naira-por-que={causa.kind === 'citada' ? 'investigada' : 'regla'}>
      <p className="text-sm font-medium text-fg">{t('inmobiliaria.ai.naira.propuesta.porQue.titulo')}</p>
      {causa.kind === 'citada' ? (
        <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'INFERENCE' }}>
          <p className="text-caption text-fg-muted">{t('inmobiliaria.ai.naira.propuesta.porQue.investigada')}</p>
          <OracionesCausales oraciones={causa.citasConClase ?? citasSinClase(causa.citas)} />
        </BloqueDeCategoria>
      ) : (
        <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'LIVE_DATA' }}>
          <p className="text-caption text-fg-muted">{t('inmobiliaria.ai.naira.propuesta.porQue.regla')}</p>
          <p className="text-sm text-fg">{detalle.item.titulo}</p>
        </BloqueDeCategoria>
      )}
    </div>
  )
}
