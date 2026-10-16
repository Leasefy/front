'use client'

/**
 * useAgenteDePagos — la lectura real que dice si el equipo de agentes de pagos
 * trabaja: su gobierno (¿está encendido?).
 *
 * Hasta el 14-10-2026 leía también un «tablero» (`GET /pagos/home/metrics`)
 * que el micro no publica: cada visita era un 404 y un paso en «Falta». Se
 * quitó (ver la nota de `lib/pagos/equipo-de-pagos.ts`).
 *
 * Ver `lib/pagos/equipo-de-pagos.ts` para qué se deriva de la lectura.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoGobierno } from '@/lib/api/piloto'
import { AGENTE_GOBERNADO, type LecturaDelGobierno } from '@/lib/pagos/equipo-de-pagos'

export interface AgenteDePagosLectura {
  gobierno: LecturaDelGobierno
  /** Vuelve a preguntar. */
  reintentar: () => Promise<void>
}

export function useAgenteDePagos(): AgenteDePagosLectura {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [gobierno, setGobierno] = useState<LecturaDelGobierno>({ estado: 'cargando' })
  const controlador = useRef<AbortController | null>(null)

  const cargar = useCallback(async () => {
    // Sin agencia todavía (la sonda de membresía no asentó) no hay a quién
    // preguntar: se queda cargando, no se afirma nada.
    if (!agencyId) return
    controlador.current?.abort()
    const actual = new AbortController()
    controlador.current = actual
    setGobierno({ estado: 'cargando' })

    const r = await fetchPilotoGobierno(agencyId, actual.signal)
    if (actual.signal.aborted) return
    if (!r.ok || !r.data) {
      setGobierno({ estado: 'fallo' })
      return
    }
    const item = r.data.agentes.find((a) => a.agente === AGENTE_GOBERNADO) ?? null
    setGobierno({ estado: 'listo', item })
  }, [agencyId])

  useEffect(() => {
    void cargar()
    return () => controlador.current?.abort()
  }, [cargar])

  return { gobierno, reintentar: cargar }
}
