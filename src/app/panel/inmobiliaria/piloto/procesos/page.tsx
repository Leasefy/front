'use client'

/**
 * /panel/inmobiliaria/piloto/procesos — los procesos del Piloto, en dos capas.
 *
 * 1. EL CATÁLOGO (`PilotoCatalogo`) — todos los procesos de la plataforma:
 *    qué hace cada uno, quién lo corre, en qué modo está, cuándo se lo vio
 *    por última vez y a dónde ir a mirarlo. Lo pidió Nico el 2026-09-04
 *    mirando la píldora del header: «que muestre todos los procesos de todo
 *    lo que pasa en la plataforma».
 *
 * 2. LO QUE PASÓ (`PilotoProcesos`) — las instancias: depósitos que el Piloto
 *    detectó y concilió, llamadas de Laura con su resultado, conversaciones
 *    de WhatsApp. Esto ya existía y sigue igual: el catálogo dice qué corre,
 *    esta lista dice qué corrió.
 *
 * La página es dueña del hook y del cajón (misma forma que la torre del
 * Piloto): un proceso abre el MISMO cajón que la bandeja y el feed
 * (`mov:` · `call:` · `wa:`), con sus acciones reales.
 */

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
import { MonoLabel } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { usePilotoProcesos } from '@/lib/hooks/piloto/use-piloto-procesos'
import { usePilotoCatalogo } from '@/lib/hooks/piloto/use-piloto-catalogo'
import { PilotoProcesos } from '@/components/inmobiliaria/piloto/PilotoProcesos'
import { PilotoCatalogo } from '@/components/inmobiliaria/piloto/PilotoCatalogo'
import { PilotoCajon, type PilotoApertura } from '@/components/inmobiliaria/piloto/PilotoCajon'
import type { TipoDeProceso } from '@/lib/api/piloto'

export default function PilotoProcesosPage() {
  const { t } = useI18n()
  const [tipo, setTipo] = useState<TipoDeProceso | 'todos'>('todos')
  const procesos = usePilotoProcesos(tipo)
  const catalogo = usePilotoCatalogo()

  const [pila, setPila] = useState<PilotoApertura[]>([])
  const apertura = pila.length > 0 ? (pila[pila.length - 1] as PilotoApertura) : null
  const abrirItem = useCallback((id: string) => setPila((p) => [...p, { tipo: 'item', id }]), [])
  const volver = useCallback(() => setPila((p) => p.slice(0, -1)), [])
  const cerrar = useCallback(() => setPila([]), [])

  return (
    <div className="space-y-8 p-6 lg:p-8" data-testid="piloto-procesos-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Button asChild variant="link" size="sm" hideArrow className="-ml-2 h-auto px-2 text-fg-muted">
            <Link href="/panel/inmobiliaria/piloto">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {t('inmobiliaria.piloto.procesos.volver')}
            </Link>
          </Button>
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.piloto.catalogo.titulo')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            {t('inmobiliaria.piloto.catalogo.descripcion')}
          </p>
        </div>
      </header>

      <PilotoCatalogo
        data={catalogo.data}
        isLoading={catalogo.isLoading}
        error={catalogo.error}
        notAvailable={catalogo.notAvailable}
        onRefetch={catalogo.refetch}
      />

      {/* ── Lo que pasó ───────────────────────────────────────────────────── */}
      <section className="space-y-4" aria-labelledby="piloto-lo-que-paso">
        <div className="space-y-1">
          <h2 id="piloto-lo-que-paso">
            <MonoLabel>{t('inmobiliaria.piloto.procesos.loQuePaso')}</MonoLabel>
          </h2>
          <p className="max-w-2xl text-sm text-fg-muted">
            {t('inmobiliaria.piloto.procesos.descripcion')}
          </p>
        </div>

        <PilotoProcesos
          data={procesos.data}
          isLoading={procesos.isLoading}
          error={procesos.error}
          notAvailable={procesos.notAvailable}
          tipo={tipo}
          onTipo={setTipo}
          onRefetch={procesos.refetch}
          onAbrir={abrirItem}
        />
      </section>

      <PilotoCajon
        apertura={apertura}
        onClose={cerrar}
        {...(pila.length > 1 ? { onVolver: volver } : {})}
        onAbrirItem={abrirItem}
        onAccionEjecutada={procesos.refetch}
      />
    </div>
  )
}
