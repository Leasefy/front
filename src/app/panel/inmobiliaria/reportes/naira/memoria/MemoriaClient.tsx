'use client'

/**
 * MemoriaClient — la lectura PRINCIPAL de la pestaña «Qué cree Naira» (Fase 13, plan 13-07): `useNairaMemoria` (refresco al
 * volver a la pestaña) con el estado ENTERO a `VistaDeNaira` (un 403 no deja nada de lo anterior, D13-4). Los cuatro permisos
 * de escritura salen de su acción real (D13-3); los filtros se leen de la URL (validados por el puro) y se escriben con
 * `router.replace`; las rutas vienen de `rutas-de-naira.ts` (D13-1).
 */

import type { JSX } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import type { PermisosDeMemoria } from '@/components/inmobiliaria/naira/ItemDeMemoria'
import { VistaDeNaira } from '@/components/inmobiliaria/naira/VistaDeNaira'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useNairaMemoria } from '@/lib/hooks/naira/use-naira-memoria'
import { useI18n } from '@/lib/i18n'
import { leerFiltrosDeMemoria, type FiltrosDeMemoria } from '@/lib/naira/vocabulario-de-memoria'
import { rutaDeLaMemoria } from '@/lib/nav/rutas-de-naira'

import { MemoriaView } from './MemoriaView'

function EsqueletoDeLaMemoria(): JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  )
}

export function MemoriaClient(): JSX.Element {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const router = useRouter()
  const parametros = useSearchParams()
  const { estado, recargar } = useNairaMemoria()
  const permisos: PermisosDeMemoria = {
    corregir: canAccess('naira', 'memory-correct'),
    borrar: canAccess('naira', 'memory-erase'),
    promover: canAccess('naira', 'memory-promote'),
    resolver: canAccess('naira', 'procedural-approve'),
  }
  const filtrosIniciales = leerFiltrosDeMemoria(parametros?.get('capa') ?? null, parametros?.get('procedencia') ?? null)
  const alCambiarFiltros = (f: FiltrosDeMemoria) => router.replace(rutaDeLaMemoria(f), { scroll: false })

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <VistaDeNaira
        nombre="memoria"
        estado={estado}
        queEs={t('inmobiliaria.ai.naira.memoria.queEs')}
        volverA={{ label: t('inmobiliaria.ai.naira.memoria.volverAlPanel'), href: '/panel/inmobiliaria' }}
        onReintentar={recargar}
        esqueleto={<EsqueletoDeLaMemoria />}
        renderOk={(vista) => (
          <MemoriaView
            vista={vista}
            permisos={permisos}
            filtrosIniciales={filtrosIniciales}
            onFiltrosCambiados={alCambiarFiltros}
            onRecargar={recargar}
          />
        )}
      />
    </div>
  )
}
