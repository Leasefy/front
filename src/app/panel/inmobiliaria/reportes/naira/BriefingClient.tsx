'use client'

/**
 * BriefingClient — la lectura del Briefing de Naira (Fase 13, plan 13-03; D13-4, P7, P8, P9, P19).
 *
 * Lee `?dia=` (enlazable desde el correo, E13-1); un día con otra forma o que no existe se ignora y se pide el de hoy
 * (P9, declarado). Pide con `useNairaBriefing` y entrega el estado ENTERO a `VistaDeNaira`, que lo evalúa antes que los
 * hijos: tras un ok, un 403 al volver al foco deja solo el cartel de sin permiso. Este archivo no guarda ningún estado
 * de datos ni el ok anterior.
 *
 * Los permisos de ESCRITURA se piden por su acción real (votar una señal, responder la pregunta semanal) y bajan como
 * booleanos: sin la acción, el control no se monta. El 403 del servicio igual se dice en línea.
 *
 * `volverA` (sin permiso) lleva al inicio del panel y no a '/panel/inmobiliaria/reportes': Naira ya no vive en Reportes,
 * es un módulo de «Agentes IA» (D13-1′, P19), y el 403 de PageGuard dice lo mismo.
 */

import type { JSX } from 'react'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { AutorizacionDeGestion } from '@/components/inmobiliaria/naira/AutorizacionDeGestion'
import { ConsentimientoWhatsapp } from '@/components/inmobiliaria/naira/ConsentimientoWhatsapp'
import { PropuestasPorAprobar } from '@/components/inmobiliaria/naira/PropuestasPorAprobar'
import { VistaDeNaira } from '@/components/inmobiliaria/naira/VistaDeNaira'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useNairaBriefing } from '@/lib/hooks/naira/use-naira-briefing'
import { useI18n } from '@/lib/i18n'
import { esDiaValido, hoyEnBogota } from '@/lib/naira/briefing-y-senal'

import { BriefingView } from './BriefingView'

/** La forma del Briefing mientras carga (UI-SPEC §8.1): ítems a la izquierda, inventario a la derecha. */
function EsqueletoDelBriefing(): JSX.Element {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      <div className="min-w-0 lg:col-span-1">
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function BriefingClient(): JSX.Element {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const pedido = useSearchParams()?.get('dia') ?? null
  const dia = pedido !== null && esDiaValido(pedido) ? pedido : undefined
  const { estado, recargar } = useNairaBriefing(dia)
  const [ahora] = useState(() => new Date())
  const hoy = hoyEnBogota(ahora)
  const puedeVotar = canAccess('naira', 'signal-feedback')
  const puedeResponderRecall = canAccess('naira', 'recall-answer')

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* #35 (15-10-2026): a quien aprueba, cuántas propuestas de Naira esperan su decisión. */}
      <PropuestasPorAprobar />
      {/* P3 (15-10-2026): la primera vez, ¿autoriza que Naira le atribuya su gestión? (B-5 §3). */}
      <AutorizacionDeGestion variante="pregunta" />
      {/* P2 (15-10-2026): el briefing por WhatsApp, con la autorización de cada persona. */}
      <ConsentimientoWhatsapp />
      <VistaDeNaira
        nombre="briefing"
        estado={estado}
        queEs={t('inmobiliaria.ai.naira.briefing.queEs')}
        volverA={{ label: t('inmobiliaria.ai.naira.briefing.volverAlPanel'), href: '/panel/inmobiliaria' }}
        onReintentar={recargar}
        esqueleto={<EsqueletoDelBriefing />}
        renderOk={(briefing, origen) => (
          <BriefingView
            briefing={briefing}
            origen={origen}
            hoy={hoy}
            ahora={ahora}
            puedeVotar={puedeVotar}
            puedeResponderRecall={puedeResponderRecall}
          />
        )}
      />
    </div>
  )
}
