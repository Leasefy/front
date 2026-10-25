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
import { MonoLabel } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { usePilotoProcesos } from '@/lib/hooks/piloto/use-piloto-procesos'
import { usePilotoCatalogo } from '@/lib/hooks/piloto/use-piloto-catalogo'
import { PilotoProcesos } from '@/components/inmobiliaria/piloto/PilotoProcesos'
import { PilotoCatalogo } from '@/components/inmobiliaria/piloto/PilotoCatalogo'
import { PilotoCajon, type PilotoApertura } from '@/components/inmobiliaria/piloto/PilotoCajon'
import type { TipoDeProceso } from '@/lib/api/piloto'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { BackButton } from '@/components/ui/back-button'

function PilotoProcesosContent() {
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
      <div className="space-y-3">
        <BackButton href="/panel/inmobiliaria/piloto" label={t('inmobiliaria.piloto.procesos.volver')} />
        <EncabezadoDePantalla
          seccion={t('inmobiliaria.nav.secAgentes')}
          titulo={t('inmobiliaria.piloto.catalogo.titulo')}
          descripcion={t('inmobiliaria.piloto.catalogo.descripcion')}
        />
      </div>

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

/*
 * P1 — Mismo guard que `/piloto`: `PageGuard` SIN módulo, a propósito. La fila del menú declara
 * `module: null` (layout.tsx: el Piloto es el inicio de TODO miembro y cada
 * widget se defiende solo) y `arquitectura-del-panel.ts` no le asigna módulo.
 * Lo que sí hace el guard: el contenido —y sus consultas— no se monta hasta
 * que los permisos resuelven, igual que en el resto de las páginas del panel,
 * y sin señal no expulsa a nadie.
 */
export default function PilotoProcesosPage() {
  return (
    <PageGuard>
      <PilotoProcesosContent />
    </PageGuard>
  )
}
