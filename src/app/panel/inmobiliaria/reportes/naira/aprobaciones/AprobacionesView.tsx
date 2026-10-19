'use client'

/**
 * AprobacionesView — lo que pinta un `ok` de la pestaña Aprobaciones de Naira (Fase 13, plan 13-05; UI-SPEC §7.5, §6.6,
 * §11.1, §12). Desde el 18-10-2026 (Nico: «todo lo que hay que aprobar debería quedar en una tabla») TODO lo que Naira
 * propone —las acciones y los cambios de modo— va en UNA tabla con dos pestañas, «Por decidir» y «Decididas»; cada fila
 * abre el detalle en un cajón y ahí se decide.
 *
 * Un «Por decidir» vacío solo dice que no hay nada si además el rol lo ve todo: con elementos ocultos, decirlo sería
 * falso (P13), y la línea de ocultos lo explica sin escribir el número (U5). Las tareas llegan ya leídas (o `null`, y
 * entonces la sección no existe) y van dentro del origen de SU lectura. Este archivo no importa hooks de datos: el fallo
 * lo decide `VistaDeNaira` antes de llegar aquí.
 */

import type { JSX } from 'react'
import { useId, useState } from 'react'
import { SealCheck } from '@phosphor-icons/react'

import { FilaDeTarea } from '@/components/inmobiliaria/naira/FilaDeTarea'
import { LatenciaDeAprobacion } from '@/components/inmobiliaria/naira/LatenciaDeAprobacion'
import { LineaConFecha } from '@/components/inmobiliaria/naira/FilaDeSeguimiento'
import { ProveedorDeOrigen, type OrigenDeLosDatos } from '@/components/inmobiliaria/naira/OrigenDeNaira'
import { TablaDeAprobaciones } from '@/components/inmobiliaria/naira/TablaDeAprobaciones'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CambioDeModo } from '@/lib/api/naira/cambios-de-modo'
import type { LeccionParaOri } from '@/lib/api/naira/lecciones-para-ori'
import type { NairaActionsList, NairaTasksList } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import { filasDeAprobaciones, type FilaDeAprobacion } from '@/lib/naira/filas-de-aprobaciones'

export interface AprobacionesViewProps {
  readonly lista: NairaActionsList
  /** Los cambios de modo que propone Naira; `null` = quien mira no puede aprobarlos (o no se pudieron leer). */
  readonly cambios: readonly CambioDeModo[] | null
  /** Paso 4: lo que Naira le quiere enseñar a Ori; `null` = quien mira no puede aprobarlo (o no se pudo leer). */
  readonly lecciones?: readonly LeccionParaOri[] | null
  /** `null` ⇒ la sección de tareas NO existe (sin task-view, 403 u otro fallo de su lectura). */
  readonly tareas: { readonly lista: NairaTasksList; readonly origen: OrigenDeLosDatos } | null
  readonly puedeCancelar: boolean
  /** El Client devuelve `null` sin open-loops-view o con id vacío. */
  readonly hrefDelLoop: (loopId: string) => string | null
  /** Abre el cajón del detalle (lo monta el Client). */
  readonly onAbrir: (fila: FilaDeAprobacion) => void
}

type Pestana = 'por_decidir' | 'decididas'

function Cuenta({ n }: { readonly n: number }): JSX.Element {
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-surface-muted px-1.5 font-mono text-caption tabular-nums text-fg-muted">
      {n}
    </span>
  )
}

export function AprobacionesView({ lista, cambios, lecciones = null, tareas, puedeCancelar, hrefDelLoop, onAbrir }: AprobacionesViewProps): JSX.Element {
  const { t } = useI18n()
  const idTareas = useId()
  const [pestana, setPestana] = useState<Pestana>('por_decidir')
  const { porDecidir, decididas } = filasDeAprobaciones(lista.acciones, cambios, lecciones)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight leading-tight text-fg">
          {t('inmobiliaria.ai.naira.aprobaciones.titulo')}
        </h1>
        <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.aprobaciones.bajada')}</p>
      </header>

      {/* #32 (15-10-2026): solo el dueño recibe la latencia (a los demás el agente manda null). */}
      {lista.latencia ? <LatenciaDeAprobacion latencia={lista.latencia} /> : null}

      <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
        <TabsList variant="segmented">
          <TabsTrigger value="por_decidir" className="gap-2 whitespace-nowrap" data-naira-pestana="por_decidir">
            {t('inmobiliaria.ai.naira.aprobaciones.tabla.porDecidir')}
            <Cuenta n={porDecidir.length} />
          </TabsTrigger>
          <TabsTrigger value="decididas" className="gap-2 whitespace-nowrap" data-naira-pestana="decididas">
            {t('inmobiliaria.ai.naira.aprobaciones.tabla.decididas')}
            <Cuenta n={decididas.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="por_decidir" className="pt-4">
          <section data-naira-grupo="por_decidir" aria-label={t('inmobiliaria.ai.naira.aprobaciones.porDecidir')}>
            {porDecidir.length > 0 ? (
              <TablaDeAprobaciones filas={porDecidir} fecha="vence" onAbrir={onAbrir} />
            ) : lista.ocultasPorRol === 0 ? (
              <div data-testid="naira-aprobaciones-vacio">
                <EmptyState
                  icon={SealCheck}
                  title={t('inmobiliaria.ai.naira.aprobaciones.vacioTitulo')}
                  description={t('inmobiliaria.ai.naira.aprobaciones.vacioDescripcion')}
                />
              </div>
            ) : null}
          </section>
        </TabsContent>

        <TabsContent value="decididas" className="pt-4">
          <section data-naira-grupo="recientes" aria-label={t('inmobiliaria.ai.naira.aprobaciones.recientes')} className="space-y-3">
            <p className="text-sm text-fg-muted">
              <LineaConFecha clave="inmobiliaria.ai.naira.aprobaciones.desde" valor={lista.desde} />
            </p>
            {decididas.length > 0 ? (
              <TablaDeAprobaciones filas={decididas} fecha="propuesta" onAbrir={onAbrir} />
            ) : (
              <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.aprobaciones.tabla.sinDecididas')}</p>
            )}
          </section>
        </TabsContent>
      </Tabs>

      {lista.ocultasPorRol > 0 ? (
        <p role="status" data-naira-ocultas="" className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.naira.aprobaciones.ocultasPorRol')}
        </p>
      ) : null}

      {tareas !== null ? (
        <ProveedorDeOrigen origen={tareas.origen}>
          <section data-naira-tareas="" aria-labelledby={idTareas} className="space-y-3">
            <h2 id={idTareas} className="text-lg font-semibold text-fg">
              {t('inmobiliaria.ai.naira.tareas.titulo')}
            </h2>
            {tareas.lista.tareas.length > 0 ? (
              <ul className="space-y-2">
                {tareas.lista.tareas.map((tarea, i) => (
                  <FilaDeTarea
                    key={`${i}-${tarea.tareaId}`}
                    tarea={tarea}
                    hrefDelLoop={hrefDelLoop(tarea.loopId)}
                    puedeCancelar={puedeCancelar}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.tareas.vacio')}</p>
            )}
            {tareas.lista.ocultasPorRol > 0 ? (
              <p role="status" className="text-sm text-fg-muted">
                {t('inmobiliaria.ai.naira.tareas.ocultasPorRol')}
              </p>
            ) : null}
          </section>
        </ProveedorDeOrigen>
      ) : null}
    </div>
  )
}
