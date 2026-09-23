'use client'

/**
 * Un proceso del centro, en una fila: qué es, quién lo lanzó, cuánto va, cómo
 * terminó y —si dejó uno— su archivo para bajar.
 *
 * Es LA pieza del centro de procesos (Nico, 22-09-2026): la misma fila se
 * pinta en el panel del header, en la página del historial y en el detalle
 * del lote. Una espera que se dibuja igual en todas partes es una espera que
 * se aprende una vez.
 *
 * La fila no le pide nada al back para pintarse: todo viene en el `Proceso`.
 * Sólo «Descargar» (firma la URL) y «Cancelar» hablan con el back, y los dos
 * son acciones de la persona.
 */

import { useState } from 'react'
import { DownloadSimple, X } from '@phosphor-icons/react'

import { toast } from '@/components/ui/toast'
import { procesosApi } from '@/lib/api/procesos.service'
import type { Proceso } from '@/lib/api/procesos.types'
import { cn } from '@/lib/utils'
import { AnilloDeAvance } from './AnilloDeAvance'
import { descargarArchivoDelProceso, type Navegar } from './descargar-archivo-del-proceso'
import {
  NOMBRE_DEL_ESTADO,
  NOMBRE_DEL_TIPO,
  TONO_DEL_ESTADO,
  avanceEnPalabras,
  estaActivo,
  haceCuanto,
  quienLoLanzo,
  tamanoDelArchivo,
} from './estado-del-proceso'

export interface FilaDeProcesoProps {
  proceso: Proceso
  /** `compacta` en el panel del header: sin el tipo como rótulo, el mensaje en dos líneas. */
  compacta?: boolean
  /** Tras cancelar: quien pinta la lista la vuelve a pedir. */
  onCambio?: () => void
  /** Para las pruebas: cómo se «navega» a la URL firmada. */
  navegar?: Navegar
  /** Para las pruebas: el reloj. */
  ahora?: number
}

export function FilaDeProceso({ proceso: p, compacta = false, onCambio, navegar, ahora }: FilaDeProcesoProps) {
  const [bajando, setBajando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const activo = estaActivo(p)
  const avance = avanceEnPalabras(p)
  const cuando = haceCuanto(p.terminadoAt ?? p.createdAt, ahora)
  const tamano = p.archivo ? tamanoDelArchivo(p.archivo.bytes) : null

  const descargar = async () => {
    setBajando(true)
    try {
      const nombre = await descargarArchivoDelProceso(p.id, navegar)
      toast.success('Descargando', { description: nombre })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descargar el archivo.')
    } finally {
      setBajando(false)
    }
  }

  const cancelar = async () => {
    setCancelando(true)
    try {
      await procesosApi.cancelar(p.id)
      toast.success(
        p.estado === 'EN_COLA'
          ? 'Cancelado.'
          : 'Se va a detener en su próximo paso. Lo que alcanzó a hacerse queda hecho.',
      )
      onCambio?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cancelar.')
    } finally {
      setCancelando(false)
    }
  }

  return (
    <li
      className="flex gap-3 px-4 py-3"
      data-testid="fila-de-proceso"
      data-estado={p.estado}
      data-proceso-id={p.id}
    >
      <AnilloDeAvance
        estado={p.estado}
        porcentaje={p.porcentaje}
        className="mt-0.5 shrink-0"
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {!compacta && (
              <p className="text-label uppercase text-fg-subtle">
                {NOMBRE_DEL_TIPO[p.tipo] ?? p.tipo}
              </p>
            )}
            <p className="truncate text-body-sm font-medium text-fg" title={p.titulo}>
              {p.titulo}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-caption font-medium',
              TONO_DEL_ESTADO[p.estado],
            )}
            data-testid="estado-del-proceso"
          >
            {p.interrumpido ? 'Se interrumpió' : p.cancelacionPedida && activo ? 'Cancelando…' : NOMBRE_DEL_ESTADO[p.estado]}
          </span>
        </div>

        <p className="text-caption text-fg-muted">
          <span>{quienLoLanzo(p)}</span>
          <span aria-hidden="true"> · </span>
          <span>{cuando}</span>
          {avance && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums" data-testid="avance-del-proceso">
                {avance}
              </span>
            </>
          )}
        </p>

        {activo && (
          <div
            className="h-1 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-label={p.titulo}
            aria-valuemin={0}
            aria-valuemax={100}
            {...(p.porcentaje != null ? { 'aria-valuenow': p.porcentaje } : {})}
          >
            {p.porcentaje != null ? (
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.max(2, p.porcentaje)}%` }}
              />
            ) : (
              <div className="h-full w-1/4 rounded-full bg-primary motion-safe:animate-indeterminate" />
            )}
          </div>
        )}

        {p.mensaje && (
          <p
            className={cn(
              'text-caption',
              p.estado === 'FALLO' ? 'text-danger' : 'text-fg-muted',
              compacta && 'line-clamp-2',
            )}
            title={compacta ? p.mensaje : undefined}
            data-testid="mensaje-del-proceso"
          >
            {p.mensaje}
          </p>
        )}

        {(p.archivo || p.sePuedeCancelar) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {p.archivo &&
              (p.archivo.vencido ? (
                <span className="text-caption text-fg-subtle" data-testid="archivo-vencido">
                  El archivo venció. Vuelve a lanzarlo para tener uno nuevo.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void descargar()}
                  disabled={bajando}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-caption font-medium text-fg transition-colors hover:bg-surface-muted disabled:opacity-60"
                  data-testid="descargar-proceso"
                  title={p.archivo.nombre}
                >
                  <DownloadSimple className="h-3.5 w-3.5" aria-hidden="true" />
                  {bajando ? 'Descargando…' : 'Descargar'}
                  {tamano && <span className="font-mono tabular-nums text-fg-subtle">{tamano}</span>}
                </button>
              ))}
            {p.sePuedeCancelar && (
              <button
                type="button"
                onClick={() => void cancelar()}
                disabled={cancelando}
                className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-caption font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-60"
                data-testid="cancelar-proceso"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {cancelando ? 'Cancelando…' : 'Cancelar'}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
