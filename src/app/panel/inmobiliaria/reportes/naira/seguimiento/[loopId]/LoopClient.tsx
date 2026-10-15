'use client'

/**
 * LoopClient.tsx — la lectura PRINCIPAL de la ficha de un loop de Naira (Fase 13, plan 13-04; D13-4, P3, P8, P16; molde
 * SenalClient de 13-03).
 *
 * `useNairaLoop` entrega su estado ENTERO a `VistaDeNaira`: abrir otro loop vuelve a cargando sin mostrar el anterior y un
 * 403 deja solo el cartel de acceso. Sin refresco al volver al foco (la bitácora no lo pide, UI-SPEC §8.5). Este archivo
 * no guarda datos.
 *
 * Salida visible: sin permiso o no encontrado, el cartel vuelve a la pestaña Seguimiento; en un ok, `VolverALaLista` a la
 * pestaña. «Ver la señal» solo con signal-view y con un id que no esté vacío; las rutas salen del registro.
 */

import type { JSX } from 'react'

import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'
import { VistaDeNaira } from '@/components/inmobiliaria/naira/VistaDeNaira'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useNairaLoop } from '@/lib/hooks/naira/use-naira-loop'
import { useI18n } from '@/lib/i18n'
import { RUTA_DEL_SEGUIMIENTO, rutaDeLaSenal } from '@/lib/nav/rutas-de-naira'

import { LoopView } from './LoopView'

/** La forma de la bitácora mientras carga (UI-SPEC §8.1): cabecera y cinco renglones. */
function EsqueletoDeLaBitacora(): JSX.Element {
  return (
    <div className="max-w-3xl space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
    </div>
  )
}

export function LoopClient({ loopId }: { readonly loopId: string }): JSX.Element {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const { estado, recargar } = useNairaLoop(loopId)
  const puedeVerSenal = canAccess('naira', 'signal-view')
  const etiquetaVolver = t('inmobiliaria.ai.naira.bitacora.volverALaLista')

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <VistaDeNaira
        nombre="loop"
        estado={estado}
        queEs={t('inmobiliaria.ai.naira.bitacora.queEs')}
        volverA={{ label: etiquetaVolver, href: RUTA_DEL_SEGUIMIENTO }}
        onReintentar={recargar}
        esqueleto={<EsqueletoDeLaBitacora />}
        renderOk={(detalle) => (
          <div className="space-y-6">
            <VolverALaLista href={RUTA_DEL_SEGUIMIENTO} label={etiquetaVolver} />
            <LoopView
              detalle={detalle}
              hrefDeLaSenal={
                puedeVerSenal && detalle.loop.promocionId !== '' ? rutaDeLaSenal(detalle.loop.promocionId) : null
              }
            />
          </div>
        )}
      />
    </div>
  )
}
