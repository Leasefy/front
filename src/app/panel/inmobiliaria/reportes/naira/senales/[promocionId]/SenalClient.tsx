'use client'

/**
 * SenalClient — la lectura de la ficha de una señal de Naira (Fase 13, plan 13-03; D13-4, P7, P8, P12, P19).
 *
 * Pide con `useNairaSenal` (sin refresco al volver al foco: lo congelado no cambia) y entrega el estado ENTERO a
 * `VistaDeNaira`, que lo evalúa antes que los hijos: al pasar a una señal cuya lectura da 403, de la anterior no queda
 * nada. Este archivo no guarda ningún estado de datos ni el ok anterior.
 *
 * Salidas: sin permiso o no encontrada, «Volver al briefing» (la raíz del workspace); en un ok, `VolverALaLista` al
 * MISMO día del briefing de donde salió la señal. Votar pide la acción real `signal-feedback`.
 *
 * La línea de seguimiento de la ficha (UI-SPEC §7.2) es de 13-04: la agrega con su propia lectura secundaria por la
 * ranura `lineaDeSeguimiento` de SenalView; este archivo no pide los loops.
 */

import type { JSX } from 'react'
import { useState } from 'react'

import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'
import { LineaDeSeguimientoDeLaSenal } from '@/components/inmobiliaria/naira/FilaDeSeguimiento'
import { VistaDeNaira } from '@/components/inmobiliaria/naira/VistaDeNaira'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useNairaSeguimiento } from '@/lib/hooks/naira/use-naira-seguimiento'
import { useNairaSenal } from '@/lib/hooks/naira/use-naira-senal'
import { useI18n } from '@/lib/i18n'
import { RUTA_DE_NAIRA, rutaDelBriefing, rutaDelLoop } from '@/lib/nav/rutas-de-naira'

import { SenalView } from './SenalView'

/** La forma de la ficha mientras carga (UI-SPEC §8.1). */
function EsqueletoDeLaSenal(): JSX.Element {
  return (
    <div className="max-w-3xl space-y-6">
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  )
}

export function SenalClient({ promocionId }: { readonly promocionId: string }): JSX.Element {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const { estado, recargar } = useNairaSenal(promocionId)
  const [ahora] = useState(() => new Date())
  const puedeVotar = canAccess('naira', 'signal-feedback')
  const etiquetaVolver = t('inmobiliaria.ai.naira.senal.volverAlBriefing')
  // lectura secundaria de 13-04 (UI-SPEC §8.2): sin la acción no se pide; si falla, no se dice
  const { estado: lecturaDelSeguimiento } = useNairaSeguimiento(canAccess('naira', 'open-loops-view'))
  const loopDeLaSenal =
    lecturaDelSeguimiento.kind === 'ok'
      ? (lecturaDelSeguimiento.data.loops.find((l) => l.promocionId === promocionId) ?? null)
      : null
  const lineaDeSeguimiento =
    loopDeLaSenal === null ? undefined : (
      <LineaDeSeguimientoDeLaSenal
        loop={loopDeLaSenal}
        hrefDeLaBitacora={loopDeLaSenal.loopId !== '' ? rutaDelLoop(loopDeLaSenal.loopId) : null}
      />
    )

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <VistaDeNaira
        nombre="senal"
        estado={estado}
        queEs={t('inmobiliaria.ai.naira.senal.queEs')}
        volverA={{ label: etiquetaVolver, href: RUTA_DE_NAIRA }}
        onReintentar={recargar}
        esqueleto={<EsqueletoDeLaSenal />}
        renderOk={(detalle, origen) => (
          <div className="space-y-6">
            <VolverALaLista href={rutaDelBriefing(detalle.dia)} label={etiquetaVolver} />
            <SenalView
              detalle={detalle}
              origen={origen}
              puedeVotar={puedeVotar}
              ahora={ahora}
              lineaDeSeguimiento={lineaDeSeguimiento}
            />
          </div>
        )}
      />
    </div>
  )
}
