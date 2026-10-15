'use client'

/**
 * SeguimientoClient.tsx — la lectura PRINCIPAL de la pestaña Seguimiento de Naira (Fase 13, plan 13-04; D13-4, P2, P3, P8,
 * P16; molde BriefingClient de 13-03).
 *
 * `useNairaSeguimiento` (refresca al volver a la pestaña) entrega su estado ENTERO a `VistaDeNaira`, que decide qué se pinta
 * antes que los hijos: un 403 después de un ok deja solo el cartel de acceso, sin nada de la lista. Este archivo no guarda
 * datos (ni referencias ni memos).
 *
 * Permisos por su acción real: votar con `signal-feedback`, enlazar la señal con `signal-view`. Las rutas salen del registro
 * `rutas-de-naira.ts` y un id vacío no arma enlace. El 403 de la pestaña vuelve al inicio del panel (13-03 P19).
 */

import type { JSX } from 'react'

import { VistaDeNaira } from '@/components/inmobiliaria/naira/VistaDeNaira'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useNairaSeguimiento } from '@/lib/hooks/naira/use-naira-seguimiento'
import { useI18n } from '@/lib/i18n'
import { rutaDeLaSenal, rutaDelLoop } from '@/lib/nav/rutas-de-naira'

import { SeguimientoView } from './SeguimientoView'

/** La forma de la lista mientras carga (UI-SPEC §8.1): cuatro filas. */
function EsqueletoDelSeguimiento(): JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  )
}

export function SeguimientoClient(): JSX.Element {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const { estado, recargar } = useNairaSeguimiento()
  const puedeVotar = canAccess('naira', 'signal-feedback')
  const puedeVerSenal = canAccess('naira', 'signal-view')
  const hrefDeLaSenal = (promocionId: string) => (puedeVerSenal && promocionId !== '' ? rutaDeLaSenal(promocionId) : null)
  const hrefDeLaBitacora = (loopId: string) => (loopId !== '' ? rutaDelLoop(loopId) : null)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <VistaDeNaira
        nombre="seguimiento"
        estado={estado}
        queEs={t('inmobiliaria.ai.naira.seguimiento.queEs')}
        volverA={{ label: t('inmobiliaria.ai.naira.seguimiento.volverAlPanel'), href: '/panel/inmobiliaria' }}
        onReintentar={recargar}
        esqueleto={<EsqueletoDelSeguimiento />}
        renderOk={(lista) => (
          <SeguimientoView
            lista={lista}
            puedeVotar={puedeVotar}
            hrefDeLaSenal={hrefDeLaSenal}
            hrefDeLaBitacora={hrefDeLaBitacora}
          />
        )}
      />
    </div>
  )
}
