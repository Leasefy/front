'use client'

/**
 * PreguntarClient.tsx — la conversación con Naira en su pestaña (Fase 13, plan 13-06; D13-4, P3, P4, P9, P17; molde
 * SeguimientoClient de 13-04).
 *
 * `useNairaConversacion` entrega su vista a `VistaDeNaira`, que la evalúa ANTES que el hilo: un 403 de una pregunta deja
 * solo el cartel de acceso, sin ninguna pregunta ni respuesta anterior y sin el compositor (vive en PreguntarView, dentro
 * de `renderOk`). El 404 de la conversación (Naira o su sub-flag) tiene su propio cartel. Este archivo no guarda datos.
 *
 * Permisos por su acción real: el enlace a Aprobaciones solo con `action-view`, y la ruta sale del registro
 * `rutas-de-naira.ts`. Los ejemplos de preguntas se filtran con un proxy de visibilidad: el rol puede abrir la pantalla de
 * esa métrica (si el proxy se equivoca, el agente niega con `metrica_no_visible_para_el_rol`). El 403 vuelve al inicio del
 * panel (13-03 P19).
 */

import type { JSX } from 'react'

import { VistaDeNaira } from '@/components/inmobiliaria/naira/VistaDeNaira'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useNairaConversacion } from '@/lib/hooks/naira/use-naira-conversacion'
import { useI18n } from '@/lib/i18n'
import { sugerenciasIniciales } from '@/lib/naira/conversacion'
import { destinoDeLaRuta } from '@/lib/naira/destinos-del-drill-down'
import { rutaDeLaMetrica } from '@/lib/naira/fuente-a-ruta'
import { RUTA_DE_APROBACIONES } from '@/lib/nav/rutas-de-naira'

import { ConversacionApagada, PreguntarView } from './PreguntarView'

export function PreguntarClient(): JSX.Element {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const { vista, enCurso, preguntar, reintentar } = useNairaConversacion()
  const hrefDeAprobaciones = canAccess('naira', 'action-view') ? RUTA_DE_APROBACIONES : null
  const puedeVerLaMetrica = (metricId: string) => {
    const ruta = rutaDeLaMetrica(metricId)
    const destino = ruta === null ? null : destinoDeLaRuta(ruta)
    return destino !== null && canAccess(destino.modulo, 'view')
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <VistaDeNaira
        nombre="preguntar"
        estado={vista}
        queEs={t('inmobiliaria.ai.naira.preguntar.queEs')}
        volverA={{ label: t('inmobiliaria.ai.naira.preguntar.volverAlPanel'), href: '/panel/inmobiliaria' }}
        esqueleto={<Skeleton className="h-24 w-full rounded-lg" />}
        apagada={<ConversacionApagada />}
        renderOk={(hilo) => (
          <PreguntarView
            hilo={hilo}
            enCurso={enCurso}
            onPreguntar={preguntar}
            onReintentarTurno={reintentar}
            hrefDeAprobaciones={hrefDeAprobaciones}
            sugerencias={sugerenciasIniciales(puedeVerLaMetrica)}
          />
        )}
      />
    </div>
  )
}
