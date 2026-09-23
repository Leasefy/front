'use client'

/**
 * El botón del CENTRO DE PROCESOS, en la barra de arriba, a la izquierda de
 * la píldora del Piloto.
 *
 * Nico (22-09-2026): «ese diseño de carga de lotes es horrible; creemos un
 * centro de procesos para esas cargas y descargas de todos los documentos que
 * tenemos en la plataforma, y la puedes colocar arriba al lado izquierdo de
 * Piloto, como el de reprocesar asientos; ahí también que se vea».
 *
 * Quieto es un ícono más de la barra. Con algo en curso lo rodea un anillo
 * con el avance —girando si no se sabe cuánto falta— y un número: cuántos
 * van. Al abrirlo, lo último que pasó con su avance, quién lo lanzó, cómo
 * terminó y el archivo para bajar, sin salir de la pantalla. «Ver todo»
 * lleva al historial completo.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Queue } from '@phosphor-icons/react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCentroDeProcesos } from '@/lib/hooks/use-centro-de-procesos'
import type { ListaDeProcesos } from '@/lib/api/procesos.types'
import { cn } from '@/lib/utils'
import { FilaDeProceso } from './FilaDeProceso'
import { estaActivo } from './estado-del-proceso'

export const RUTA_DEL_CENTRO = '/panel/inmobiliaria/procesos'

/** Cuántas filas caben en el panel sin que se vuelva la página. */
const TOPE = 8

const RADIO = 15
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

/**
 * La frase de arriba del panel: el resumen es una FRASE (el molde), no un
 * contador suelto.
 */
export function resumenDelCentro(data: ListaDeProcesos | null): string {
  if (!data) return 'Leyendo…'
  if (!data.disponible) return data.motivo ?? 'El centro de procesos todavía no está disponible.'
  const vivos = data.activos
  const quien = data.veTodos ? 'del equipo' : 'tuyos'
  if (vivos === 0) {
    return data.procesos.length === 0
      ? 'Aquí aparecen las cargas, descargas y procesos largos que lances.'
      : `Nada en curso. Estos son los últimos ${quien}.`
  }
  return vivos === 1 ? '1 proceso en curso.' : `${vivos} procesos en curso.`
}

export function BotonDelCentroDeProcesos() {
  const [abierto, setAbierto] = useState(false)
  const centro = useCentroDeProcesos({ limite: TOPE })
  const data = centro.data
  const activos = data?.activos ?? 0

  /** El avance del anillo del botón: el promedio de lo que se sabe; `null` = girar. */
  const avance = useMemo(() => {
    const vivos = (data?.procesos ?? []).filter(estaActivo)
    const sabidos = vivos.filter((p) => p.porcentaje != null)
    if (sabidos.length === 0) return null
    return Math.round(sabidos.reduce((s, p) => s + (p.porcentaje ?? 0), 0) / sabidos.length)
  }, [data])

  const etiqueta =
    activos > 0
      ? `Centro de procesos: ${activos === 1 ? '1 en curso' : `${activos} en curso`}`
      : 'Centro de procesos'

  return (
    <Popover
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o)
        if (o) void centro.refetch()
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={etiqueta}
          title={etiqueta}
          data-testid="centro-de-procesos-boton"
          data-activos={activos}
          className="relative mr-1 inline-flex h-9 w-9 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11"
        >
          <Queue className={cn('h-5 w-5', activos > 0 && 'text-primary')} aria-hidden="true" />
          {activos > 0 && (
            <>
              <svg
                viewBox="0 0 36 36"
                className={cn('pointer-events-none absolute inset-0 h-full w-full', avance == null && 'motion-safe:animate-spin')}
                aria-hidden="true"
                data-testid="centro-de-procesos-anillo"
              >
                <circle
                  cx="18"
                  cy="18"
                  r={RADIO}
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="stroke-primary transition-[stroke-dashoffset] duration-500"
                  strokeDasharray={CIRCUNFERENCIA}
                  strokeDashoffset={CIRCUNFERENCIA * (1 - (avance ?? 28) / 100)}
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold tabular-nums text-primary-fg"
                data-testid="centro-de-procesos-cuantos"
              >
                {activos}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-2rem)] overflow-hidden p-0 sm:w-[400px]"
        data-testid="centro-de-procesos-panel"
      >
        <header className="border-b border-border-faint px-4 py-3">
          <p className="text-body-sm font-semibold text-fg">Centro de procesos</p>
          <p className="text-caption text-fg-muted" data-testid="centro-de-procesos-resumen">
            {centro.error && !data ? 'No pudimos leer el centro de procesos. Vuelve a abrirlo en un momento.' : resumenDelCentro(data)}
          </p>
        </header>

        {data?.disponible && data.procesos.length > 0 && (
          <ul
            className="max-h-[min(60vh,520px)] divide-y divide-border-faint overflow-y-auto"
            data-lenis-prevent
            style={{ overscrollBehavior: 'contain' }}
          >
            {data.procesos.slice(0, TOPE).map((p) => (
              <FilaDeProceso key={p.id} proceso={p} compacta onCambio={() => void centro.refetch()} />
            ))}
          </ul>
        )}

        {!data && centro.cargando && (
          <ul className="space-y-2 p-4" aria-busy="true">
            {[0, 1].map((i) => (
              <li key={i} className="h-12 animate-pulse rounded-md bg-surface-muted" />
            ))}
          </ul>
        )}

        <footer className="border-t border-border-faint px-4 py-2.5">
          <Link
            href={RUTA_DEL_CENTRO}
            onClick={() => setAbierto(false)}
            className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
            data-testid="centro-de-procesos-ver-todo"
          >
            Ver todo el historial
            <ArrowUpRight weight="bold" className="h-3 w-3" aria-hidden="true" />
          </Link>
        </footer>
      </PopoverContent>
    </Popover>
  )
}
