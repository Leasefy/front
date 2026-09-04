'use client'

/**
 * Quién abre y cierra el tray de procesos.
 *
 * Nico (2026-09-02): «mirá que el acceso a los procesos tapa la paginación,
 * deberíamos buscar otro lugar… dejalo mejor ahí arriba, que igual abra el
 * menú flotante y listo».
 *
 * El botón fijo abajo a la derecha se sentaba justo encima del paginador de
 * las tablas. Se retiró: el acceso vive en la píldora del Piloto del header
 * («Ver procesos»), y el tray sigue siendo flotante — ahora colgando del
 * header en vez de tapar el pie de la página.
 *
 * El estado vive acá arriba porque lo comparten dos componentes que no se
 * contienen: el header lo abre, el tray se pinta.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CLAVE_ABIERTO = 'piloto-dock-abierto'

export interface PilotoDockContexto {
  abierto: boolean
  alternar: () => void
  cerrar: () => void
}

const Contexto = createContext<PilotoDockContexto | null>(null)

function leerAbierto(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_ABIERTO) === '1'
  } catch {
    return false
  }
}

function guardarAbierto(v: boolean) {
  try {
    window.localStorage.setItem(CLAVE_ABIERTO, v ? '1' : '0')
  } catch {
    // sin localStorage no se recuerda: no pasa nada
  }
}

export function PilotoDockProvider({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)

  // Lo recordado se lee DESPUÉS de montar: en el servidor no hay ventana.
  useEffect(() => {
    setAbierto(leerAbierto())
  }, [])

  const alternar = useCallback(() => {
    setAbierto((v) => {
      guardarAbierto(!v)
      return !v
    })
  }, [])

  const cerrar = useCallback(() => {
    setAbierto(false)
    guardarAbierto(false)
  }, [])

  const valor = useMemo(() => ({ abierto, alternar, cerrar }), [abierto, alternar, cerrar])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

/**
 * Sin proveedor devuelve un tray que nunca se abre, en vez de reventar: hay
 * pantallas del panel que montan el header fuera del layout de inmobiliaria.
 */
export function usePilotoDock(): PilotoDockContexto {
  return useContext(Contexto) ?? SIN_PROVEEDOR
}

const SIN_PROVEEDOR: PilotoDockContexto = {
  abierto: false,
  alternar: () => {},
  cerrar: () => {},
}
