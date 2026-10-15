'use client'

/**
 * AprobacionesView — lo que pinta un `ok` de la pestaña Aprobaciones de Naira (Fase 13, plan 13-05; UI-SPEC §7.5, §6.6,
 * §11.1, §12).
 *
 * «Por decidir» y «Recientes» en el orden del servidor. Un «Por decidir» vacío solo dice que no hay nada si además el rol
 * lo ve todo: con elementos ocultos, decirlo sería falso (P13), y la línea de ocultos lo explica sin escribir el número
 * (U5). Cada tarjeta pinta la consecuencia solo con sus cortes al lado (C16, E13-6 aplicada). Las tareas llegan ya leídas
 * (o `null`, y entonces la sección no existe) y van dentro del origen de SU lectura. Este archivo no importa hooks de
 * datos: el fallo lo decide `VistaDeNaira` antes de llegar aquí.
 */

import type { JSX } from 'react'
import { useId } from 'react'
import { SealCheck } from '@phosphor-icons/react'

import { FilaDeTarea } from '@/components/inmobiliaria/naira/FilaDeTarea'
import { LineaConFecha } from '@/components/inmobiliaria/naira/FilaDeSeguimiento'
import { ProveedorDeOrigen, type OrigenDeLosDatos } from '@/components/inmobiliaria/naira/OrigenDeNaira'
import { TarjetaDePropuesta } from '@/components/inmobiliaria/naira/TarjetaDePropuesta'
import { EmptyState } from '@/components/ui/empty-state'
import type { NairaActionsList, NairaTasksList } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import { propuestasDelGrupo } from '@/lib/naira/vocabulario-de-aprobaciones'

export interface AprobacionesViewProps {
  readonly lista: NairaActionsList
  /** `null` ⇒ la sección de tareas NO existe (sin task-view, 403 u otro fallo de su lectura). */
  readonly tareas: { readonly lista: NairaTasksList; readonly origen: OrigenDeLosDatos } | null
  readonly puedeCancelar: boolean
  /** El Client devuelve `null` con id vacío. */
  readonly hrefDeLaFicha: (proposalId: string) => string | null
  /** El Client devuelve `null` sin open-loops-view o con id vacío. */
  readonly hrefDelLoop: (loopId: string) => string | null
}

export function AprobacionesView({ lista, tareas, puedeCancelar, hrefDeLaFicha, hrefDelLoop }: AprobacionesViewProps): JSX.Element {
  const { t } = useI18n()
  const idPorDecidir = useId()
  const idRecientes = useId()
  const idTareas = useId()
  const porDecidir = propuestasDelGrupo(lista.acciones, 'por_decidir')
  const recientes = propuestasDelGrupo(lista.acciones, 'recientes')

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight leading-tight text-fg">
          {t('inmobiliaria.ai.naira.aprobaciones.titulo')}
        </h1>
        <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.aprobaciones.bajada')}</p>
      </header>

      <section data-naira-grupo="por_decidir" aria-labelledby={idPorDecidir} className="space-y-3">
        <h2 id={idPorDecidir} className="text-lg font-semibold text-fg">
          {t('inmobiliaria.ai.naira.aprobaciones.porDecidir')}
        </h2>
        {porDecidir.length > 0 ? (
          <ul className="space-y-3">
            {porDecidir.map((accion, i) => (
              <li key={`${i}-${accion.proposalId}`} className="min-w-0">
                <TarjetaDePropuesta accion={accion} hrefDeLaFicha={hrefDeLaFicha(accion.proposalId)} />
              </li>
            ))}
          </ul>
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

      {recientes.length > 0 ? (
        <section data-naira-grupo="recientes" aria-labelledby={idRecientes} className="space-y-3">
          <div className="space-y-1">
            <h2 id={idRecientes} className="text-lg font-semibold text-fg">
              {t('inmobiliaria.ai.naira.aprobaciones.recientes')}
            </h2>
            <p className="text-sm text-fg-muted">
              <LineaConFecha clave="inmobiliaria.ai.naira.aprobaciones.desde" valor={lista.desde} />
            </p>
          </div>
          <ul className="space-y-3">
            {recientes.map((accion, i) => (
              <li key={`${i}-${accion.proposalId}`} className="min-w-0">
                <TarjetaDePropuesta accion={accion} hrefDeLaFicha={hrefDeLaFicha(accion.proposalId)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
