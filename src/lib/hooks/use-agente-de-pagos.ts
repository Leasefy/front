'use client'

/**
 * useAgenteDePagos — las DOS lecturas reales que dicen si el equipo de agentes
 * de pagos trabaja: su gobierno (¿está encendido?) y su tablero (¿qué hizo?).
 *
 * Van por separado a propósito: una no tapa a la otra. Que el servicio no
 * conteste el gobierno no dice nada del tablero, y un tablero que todavía no
 * existe (404) o que responde 503 con el interruptor apagado NO es un error:
 * `fetchPagosHome` lo devuelve como `notAvailable` y acá se lee «no
 * disponible». Por eso la pantalla se prende sola el día que el micro publique
 * esas rutas.
 *
 * Ver `lib/pagos/equipo-de-pagos.ts` para qué se
 * deriva de cada lectura.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoGobierno } from '@/lib/api/piloto'
import { fetchPagosHome } from '@/lib/api/pagos-home'
import type { AgentOverviewResponse } from '@/lib/api/agent-workspace'
import {
  AGENTE_GOBERNADO,
  type LecturaDelGobierno,
  type LecturaDelTablero,
} from '@/lib/pagos/equipo-de-pagos'

export interface AgenteDePagosLectura {
  gobierno: LecturaDelGobierno
  tablero: LecturaDelTablero
  /** Sólo con `tablero.estado === 'listo'`. */
  resumen: AgentOverviewResponse | null
  /** Vuelve a preguntar las dos cosas. */
  reintentar: () => Promise<void>
}

export function useAgenteDePagos(): AgenteDePagosLectura {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [gobierno, setGobierno] = useState<LecturaDelGobierno>({ estado: 'cargando' })
  const [tablero, setTablero] = useState<LecturaDelTablero>({ estado: 'cargando' })
  const [resumen, setResumen] = useState<AgentOverviewResponse | null>(null)
  const controlador = useRef<AbortController | null>(null)

  const cargar = useCallback(async () => {
    // Sin agencia todavía (la sonda de membresía no asentó) no hay a quién
    // preguntar: se queda cargando, no se afirma nada.
    if (!agencyId) return
    controlador.current?.abort()
    const actual = new AbortController()
    controlador.current = actual
    setGobierno({ estado: 'cargando' })
    setTablero({ estado: 'cargando' })

    const leerGobierno = fetchPilotoGobierno(agencyId, actual.signal).then((r) => {
      if (actual.signal.aborted) return
      if (!r.ok || !r.data) {
        setGobierno({ estado: 'fallo' })
        return
      }
      const item = r.data.agentes.find((a) => a.agente === AGENTE_GOBERNADO) ?? null
      setGobierno({ estado: 'listo', item })
    })

    const leerTablero = fetchPagosHome(agencyId, actual.signal).then(
      (r) => {
        if (actual.signal.aborted) return
        if (r.notAvailable || !r.data) {
          setResumen(null)
          setTablero({ estado: 'no-disponible' })
          return
        }
        setResumen(r.data)
        setTablero({ estado: 'listo' })
      },
      (error: unknown) => {
        if (actual.signal.aborted) return
        setResumen(null)
        setTablero({ estado: 'fallo', error })
      },
    )

    await Promise.all([leerGobierno, leerTablero])
  }, [agencyId])

  useEffect(() => {
    void cargar()
    return () => controlador.current?.abort()
  }, [cargar])

  return { gobierno, tablero, resumen, reintentar: cargar }
}
