'use client'

/**
 * AprobacionesClient — la pestaña Aprobaciones de Naira (Fase 13, plan 13-05; D13-4, D13-14, UI-SPEC §7.5, §8.2).
 *
 * Desde el 18-10-2026 todo lo que propone Naira (acciones y cambios de modo) va en UNA tabla y cada fila abre su detalle
 * en `CajonDeAprobacion`; la ficha de una propuesta se pide al abrir el cajón, nunca desde la tabla.
 *
 * La lectura PRINCIPAL (`useNairaPropuestas`, que refresca al volver a la pestaña) pasa ENTERA a `VistaDeNaira`: el estado
 * se evalúa antes que la vista, así que un 403 no deja nada de lo que se veía (FG13-1). Las tareas son una lectura
 * SECUNDARIA (`useNairaTareas` con `task-view`): sin la acción no se piden y solo se pintan cuando llegan bien; si fallan,
 * la sección no existe. Cancelar una tarea y enlazar su bitácora dependen de su acción real; las rutas salen del registro
 * de Naira. Esta pestaña nunca pide el detalle de una propuesta: eso lo hace la ficha al abrirse (D13-14).
 */

import type { JSX } from 'react'
import { useState } from 'react'

import { VistaDeNaira } from '@/components/inmobiliaria/naira/VistaDeNaira'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useNairaCambiosDeModo } from '@/lib/hooks/naira/use-naira-cambios-de-modo'
import { useNairaPropuestas } from '@/lib/hooks/naira/use-naira-propuestas'
import { useNairaTareas } from '@/lib/hooks/naira/use-naira-tareas'
import { useI18n } from '@/lib/i18n'
import type { FilaDeAprobacion } from '@/lib/naira/filas-de-aprobaciones'
import { rutaDelLoop } from '@/lib/nav/rutas-de-naira'

import { AprobacionesView } from './AprobacionesView'
import { CajonDeAprobacion } from './CajonDeAprobacion'

/** La forma de la pestaña mientras carga (UI-SPEC §8.1): tres tarjetas y dos filas de tareas. */
function EsqueletoDeAprobaciones(): JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full rounded-lg" />
      <Skeleton className="h-36 w-full rounded-lg" />
      <Skeleton className="h-36 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}

export function AprobacionesClient(): JSX.Element {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const { estado, recargar } = useNairaPropuestas()
  const { estado: lecturaDeTareas } = useNairaTareas(canAccess('naira', 'task-view'))
  const puedeCancelar = canAccess('naira', 'task-cancel')
  const puedeVerElSeguimiento = canAccess('naira', 'open-loops-view')
  // Paso 2 (Nico, 18-10-2026): los cambios de modo que propone Naira los ve y los decide quien aprueba (dueño y admin).
  const puedeAprobar = canAccess('naira', 'action-approve-internal')
  const { estado: cambiosDeModo, recargar: recargarCambios } = useNairaCambiosDeModo(puedeAprobar)
  const tareas = lecturaDeTareas.kind === 'ok' ? { lista: lecturaDeTareas.data, origen: lecturaDeTareas.origen } : null
  // 18-10-2026 («todo en una tabla», «desde el cajón»): la fila abre su detalle aquí; al cerrarlo, todo se vuelve a leer.
  const [abierta, setAbierta] = useState<FilaDeAprobacion | null>(null)
  const abrir = (fila: FilaDeAprobacion) => {
    // Una propuesta sin id no tiene ficha que abrir.
    if (fila.kind === 'accion' && fila.accion.proposalId === '') return
    setAbierta(fila)
  }
  const cerrar = () => {
    setAbierta(null)
    recargar()
    recargarCambios()
  }
  const hrefDelLoop = (loopId: string) => (puedeVerElSeguimiento && loopId !== '' ? rutaDelLoop(loopId) : null)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <VistaDeNaira
        nombre="aprobaciones"
        estado={estado}
        queEs={t('inmobiliaria.ai.naira.aprobaciones.queEs')}
        volverA={{ label: t('inmobiliaria.ai.naira.aprobaciones.volverAlPanel'), href: '/panel/inmobiliaria' }}
        onReintentar={recargar}
        esqueleto={<EsqueletoDeAprobaciones />}
        renderOk={(lista) => (
          <AprobacionesView
            lista={lista}
            cambios={puedeAprobar && cambiosDeModo.kind === 'ok' ? cambiosDeModo.cambios : null}
            tareas={tareas}
            puedeCancelar={puedeCancelar}
            hrefDelLoop={hrefDelLoop}
            onAbrir={abrir}
          />
        )}
      />
      <CajonDeAprobacion fila={abierta} onCerrar={cerrar} onDecidido={recargarCambios} />
    </div>
  )
}
