'use client'

/**
 * El «Detener» de un proceso que se maneja DESDE EL NAVEGADOR, puesto en la
 * fila del centro de procesos.
 *
 * 🔴 Nico, 23-09: «¿para qué muestras la carga también en la tabla? Ya tenemos
 * centro de procesos, todas las cargas déjalas que sucedan allí y deja la
 * pantalla quieta». Hasta ese día Facturación pintaba, dentro de su tarjeta,
 * la misma fila del centro con su barra y su «Detener» — el mismo proceso dos
 * veces en la pantalla.
 *
 * El problema de quitarla: la emisión la parte el NAVEGADOR en tandas de 200
 * (`facturasPorTandas.ts`) y el back no la sabe cancelar (su proceso no es
 * `cancelable`: cortar a mitad de una tanda dejaría facturas a medio numerar).
 * «Detener» es «no mandes la tanda siguiente», y eso sólo lo puede hacer quien
 * está mandando las tandas. Así que quien corre la corrida registra acá cómo
 * detenerla, con el id del proceso del back, y la fila del centro —en el
 * panel del header, en el historial, en cualquier parte— ofrece «Detener»
 * para ese id mientras el registro exista.
 *
 * La corrida sigue viva aunque la persona se vaya de Facturación (la promesa
 * no depende de que el componente esté montado), así que el «Detener» del
 * centro sirve también desde otra pantalla. Si recarga la página, la corrida
 * muere con ella y el registro también: la fila ya no ofrece un botón que no
 * haría nada.
 */

import { useSyncExternalStore } from 'react'

interface Entrada {
  /** Quién la registró: al quitarla no se borra la de otra corrida. */
  ficha: object
  detener: () => void
  deteniendo: boolean
}

const registro = new Map<string, Entrada>()
const oyentes = new Set<() => void>()

function avisar() {
  for (const cb of [...oyentes]) cb()
}

/**
 * Registra cómo detener el proceso `procesoId`. Devuelve cómo quitarlo (al
 * terminar la corrida, pase lo que pase).
 */
export function registrarDetenerEnElNavegador(procesoId: string, detener: () => void): () => void {
  const ficha = {}
  registro.set(procesoId, { ficha, detener, deteniendo: false })
  avisar()
  return () => {
    if (registro.get(procesoId)?.ficha === ficha) {
      registro.delete(procesoId)
      avisar()
    }
  }
}

/** Pide detener. `false` si nadie en este navegador corre ese proceso. */
export function detenerEnElNavegador(procesoId: string): boolean {
  const entrada = registro.get(procesoId)
  if (!entrada) return false
  if (!entrada.deteniendo) {
    // Un objeto nuevo: `useSyncExternalStore` compara por referencia.
    registro.set(procesoId, { ...entrada, deteniendo: true })
    entrada.detener()
    avisar()
  }
  return true
}

function suscribir(cb: () => void) {
  oyentes.add(cb)
  return () => {
    oyentes.delete(cb)
  }
}

export interface DetenerEnElNavegador {
  detener: () => void
  deteniendo: boolean
}

/** El «Detener» de ese proceso si lo corre este navegador; `null` si no. */
export function useDetenerEnElNavegador(procesoId: string): DetenerEnElNavegador | null {
  const entrada = useSyncExternalStore(
    suscribir,
    () => registro.get(procesoId) ?? null,
    () => null,
  )
  if (!entrada) return null
  return { detener: () => void detenerEnElNavegador(procesoId), deteniendo: entrada.deteniendo }
}
