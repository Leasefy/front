'use client'

/**
 * El botón del CENTRO DE PROCESOS, en la barra de arriba, a la DERECHA de la
 * píldora del Piloto (Nico, 22-09: primero lo pidió a la izquierda y después
 * lo movió a la derecha).
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

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Queue } from '@phosphor-icons/react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCentroDeProcesos } from '@/lib/hooks/use-centro-de-procesos'
import { toast } from '@/components/ui/toast'
import { alEventoDelCentro } from '@/lib/api/procesos.service'
import type { ListaDeProcesos } from '@/lib/api/procesos.types'
import { cn } from '@/lib/utils'
import { FilaDeProceso } from './FilaDeProceso'
import { DetalleDelProceso } from './DetalleDelProceso'
import type { Proceso } from '@/lib/api/procesos.types'
import { anuncioResuelto, estaActivo, MS_TOPE_DEL_ANUNCIO, type AnuncioPendiente } from './estado-del-proceso'

export const RUTA_DEL_CENTRO = '/panel/inmobiliaria/procesos'

/** Cuántas filas se piden: las activas más los últimos 5 del historial. */
const TOPE = 12
/** Cuántas terminadas se muestran debajo de las que corren. */
const RECIENTES = 5

/**
 * ¿Hay un diálogo abierto encima de la pantalla? Entonces el centro NO se
 * abre solo (se pisarían): avisa con un toast que tiene «Ver en el centro».
 */
function hayUnDialogoAbierto(): boolean {
  if (typeof document === 'undefined') return false
  return Boolean(
    document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'),
  )
}

const RADIO = 15
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

/**
 * La frase de arriba del panel: el resumen es una FRASE (el molde), no un
 * contador suelto.
 */
export function resumenDelCentro(data: ListaDeProcesos | null, arrancando = false): string {
  if (!data) return 'Leyendo…'
  if (!data.disponible) return data.motivo ?? 'El centro de procesos todavía no está disponible.'
  const vivos = data.activos
  const quien = data.veTodos ? 'del equipo' : 'tuyos'
  // Lo que se acaba de lanzar todavía no llegó: «Nada en curso» lo desmentiría.
  if (vivos === 0 && arrancando) return 'Arrancando lo que acabas de lanzar.'
  if (vivos === 0) {
    return data.procesos.length === 0
      ? 'Aquí aparecen las emisiones, archivos, cargas y exportaciones que lances, con su avance y lo que dejan para descargar.'
      : `Nada en curso. Estos son los últimos ${quien}.`
  }
  return vivos === 1 ? '1 proceso en curso.' : `${vivos} procesos en curso.`
}

export function BotonDelCentroDeProcesos() {
  const [abierto, setAbierto] = useState(false)
  /** El proceso recién lanzado: va arriba y resaltado. `'nuevo'` = el más nuevo activo. */
  const [resaltar, setResaltar] = useState<string | null>(null)
  /** Lo anunciado que el back todavía no muestra: la línea «Arrancando…». */
  const [anuncio, setAnuncio] = useState<AnuncioPendiente | null>(null)
  /** El cajón de «Ver detalle» vive FUERA del popover: el popover se cierra al abrirlo. */
  const [detalle, setDetalle] = useState<Proceso | null>(null)
  const verDetalle = (p: Proceso) => {
    setAbierto(false)
    setDetalle(p)
  }
  const centro = useCentroDeProcesos({ limite: TOPE })
  const data = centro.data
  const activos = data?.activos ?? 0
  /** La lista al momento del anuncio: lo que no esté ahí nació después. */
  const ultimaLista = useRef<ListaDeProcesos | null>(null)
  ultimaLista.current = data

  /*
   * 🔴 El centro se hace PRESENTE (Nico, 22-09: «mandé a emitir algo y el
   * centro ni se abrió»). Una pantalla que lanza un proceso lo anuncia; si
   * nadie está en medio de un diálogo, el panel se abre solo con ese proceso
   * arriba y resaltado. Si hay un diálogo, un aviso con «Ver en el centro».
   */
  useEffect(
    () =>
      alEventoDelCentro((e) => {
        setResaltar(e.procesoId ?? 'nuevo')
        if (e.titulo) {
          setAnuncio({
            titulo: e.titulo,
            procesoId: e.procesoId ?? null,
            tipo: e.tipoDeProceso ?? null,
            conocidos: new Set((ultimaLista.current?.procesos ?? []).map((p) => p.id)),
            desde: Date.now(),
          })
        }
        if (e.tipo === 'anuncio' && hayUnDialogoAbierto()) {
          toast.info(e.titulo ?? 'Proceso en marcha', {
            description: 'Lo sigues en el centro de procesos.',
            action: { label: 'Ver en el centro', onClick: () => setAbierto(true) },
          })
          return
        }
        setAbierto(true)
      }),
    [],
  )

  /*
   * 🔴 El «Arrancando…» se quita cuando el back ya muestra ese proceso —en
   * curso o ya terminado— o, a lo sumo, pasado `MS_TOPE_DEL_ANUNCIO`. Antes
   * sólo se escondía con algo EN CURSO y se borraba al cerrar el panel.
   */
  useEffect(() => {
    if (!anuncio) return
    if (anuncioResuelto(anuncio, data?.procesos ?? [])) {
      setAnuncio(null)
      return
    }
    const t = setTimeout(
      () => setAnuncio((a) => (a === anuncio ? null : a)),
      Math.max(0, anuncio.desde + MS_TOPE_DEL_ANUNCIO - Date.now()),
    )
    return () => clearTimeout(t)
  }, [anuncio, data])

  const vivos = useMemo(() => (data?.procesos ?? []).filter(estaActivo), [data])
  const recientes = useMemo(
    () => (data?.procesos ?? []).filter((p) => !estaActivo(p)).slice(0, RECIENTES),
    [data],
  )
  const idResaltado =
    resaltar === 'nuevo' ? (vivos[0]?.id ?? data?.procesos[0]?.id ?? null) : resaltar

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
    <>
    <DetalleDelProceso
      proceso={detalle ? ((data?.procesos ?? []).find((p) => p.id === detalle.id) ?? detalle) : null}
      onCerrar={() => setDetalle(null)}
    />
    <Popover
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o)
        if (o) void centro.refetch()
        else {
          setResaltar(null)
          setAnuncio(null)
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={etiqueta}
          title={etiqueta}
          data-testid="centro-de-procesos-boton"
          data-activos={activos}
          className="relative ml-1 inline-flex h-9 w-9 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11"
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
        collisionPadding={12}
        sideOffset={8}
        // Abrirse solo NO le roba el foco a lo que la persona estaba haciendo.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[calc(100vw-1.5rem)] overflow-hidden p-0 sm:w-[440px]"
        data-testid="centro-de-procesos-panel"
      >
        <header className="flex items-start gap-3 border-b border-border-faint px-4 py-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Queue weight="bold" className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-fg">Centro de procesos</p>
            <p className="text-caption text-fg-muted" data-testid="centro-de-procesos-resumen">
              {centro.error && !data
                ? 'No pudimos leer el centro de procesos. Vuelve a abrirlo en un momento.'
                : resumenDelCentro(data, anuncio !== null)}
            </p>
          </div>
        </header>

        <div
          className="max-h-[min(64vh,560px)] overflow-y-auto"
          data-lenis-prevent
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Recién lanzado y el back todavía no lo registró: se ve igual. */}
          {anuncio && (
            <p className="flex items-center gap-2 px-4 py-3 text-caption text-fg-muted" data-testid="centro-arrancando">
              <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" />
              Arrancando «{anuncio.titulo}»…
            </p>
          )}

          {data?.disponible && vivos.length > 0 && (
            <Seccion titulo="En curso">
              {vivos.map((p) => (
                <FilaDeProceso
                  key={p.id}
                  proceso={p}
                  compacta
                  resaltado={p.id === idResaltado}
                  onCambio={() => void centro.refetch()}
                  onVerDetalle={verDetalle}
                />
              ))}
            </Seccion>
          )}

          {data?.disponible && recientes.length > 0 && (
            <Seccion titulo={vivos.length > 0 ? 'Recientes' : 'Lo último'}>
              {recientes.map((p) => (
                <FilaDeProceso
                  key={p.id}
                  proceso={p}
                  compacta
                  resaltado={p.id === idResaltado}
                  onCambio={() => void centro.refetch()}
                  onVerDetalle={verDetalle}
                />
              ))}
            </Seccion>
          )}

          {!data && centro.cargando && (
            <ul className="space-y-2 p-4" aria-busy="true">
              {[0, 1].map((i) => (
                <li key={i} className="h-14 animate-pulse rounded-md bg-surface-muted" />
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border-faint bg-surface-muted px-4 py-2.5">
          <Link
            href={RUTA_DEL_CENTRO}
            onClick={() => setAbierto(false)}
            className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
            data-testid="centro-de-procesos-ver-todo"
          >
            Ver todo el historial
            <ArrowUpRight weight="bold" className="h-3 w-3" aria-hidden="true" />
          </Link>
          {data?.veTodos && <span className="text-caption text-fg-subtle">Ves los de todo el equipo</span>}
        </footer>
      </PopoverContent>
    </Popover>
    </>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="px-4 pb-1 pt-3 text-label uppercase text-fg-subtle">{titulo}</p>
      <ul className="divide-y divide-border-faint">{children}</ul>
    </section>
  )
}
