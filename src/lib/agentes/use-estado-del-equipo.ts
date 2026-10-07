'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import {
  fetchPilotoActivity,
  fetchPilotoFlota,
  type ActivityItem,
  type AutonomiaModo,
  type PilotoFlotaResponse,
} from '@/lib/api/piloto'

import type { AgenteDelEquipo } from './equipo'

/**
 * El estado REAL de cada agente para esta inmobiliaria, y su trabajo reciente.
 *
 *   GET /api/agency/{id}/ai-hub/autonomia   → la flota: `corre`, `actua`, `modo`, `efectoReal`
 *   GET /api/agency/{id}/ai-hub/activity    → el feed: `{ at, agente, titulo, detalle }`
 *
 * Son las mismas lecturas de la píldora del header y del feed del piloto
 * automático; nada nuevo en el micro. Se piden SÓLO con el modal abierto.
 *
 * Sin fila de un agente no se afirma nada (`sinDato`): ni «activo» ni
 * «apagado». El feed sólo trae lo de cobranza y las huellas del Gerente, así
 * que la mayoría de los agentes sale con «todavía no hay trabajo suyo»: es la
 * verdad, no un hueco.
 */

export type TipoDeEstado = 'activo' | 'aPedido' | 'apagado' | 'enElChat' | 'fueraDelPiloto' | 'sinDato'

export interface EstadoDeUnAgente {
  tipo: TipoDeEstado
  modo?: AutonomiaModo
  /** La frase del micro: qué hace HOY ese modo para ese agente. */
  efectoReal?: string | null
  porQueNoCorre?: string | null
}

/** Puro: el estado de un agente con lo que devolvió la flota (o `null` si no llegó). */
export function estadoDeUnAgente(agente: AgenteDelEquipo, flota: PilotoFlotaResponse | null): EstadoDeUnAgente {
  if (!agente.autonomia) {
    return { tipo: agente.despachos.length > 0 ? 'enElChat' : 'fueraDelPiloto' }
  }
  const fila = flota?.agentes?.find((a) => a.agente === agente.autonomia)
  if (!fila) return { tipo: 'sinDato' }
  const efectoReal = typeof fila.efectoReal === 'string' && fila.efectoReal ? fila.efectoReal : null
  if (!fila.corre) return { tipo: 'apagado', porQueNoCorre: fila.porQueNoCorre ?? null }
  // `PILOTO_ENABLED` apagado: la flota no actúa sola aunque tenga modo.
  const actua = flota?.activo !== false && (fila.actua ?? (fila.gobierna !== false && fila.corre))
  if (actua) return { tipo: 'activo', modo: fila.modo, efectoReal }
  return { tipo: 'aPedido', modo: fila.modo, efectoReal }
}

/** Puro: lo que el feed dice que hizo este agente, lo más nuevo primero. */
export function trabajoDelAgente(agente: AgenteDelEquipo, items: readonly ActivityItem[], max = 5): ActivityItem[] {
  if (!agente.autonomia) return []
  return items
    .filter((i) => i.agente === agente.autonomia)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, max)
}

export interface UseEstadoDelEquipo {
  flota: PilotoFlotaResponse | null
  actividad: ActivityItem[]
  cargando: boolean
  /** El feed no se pudo leer (error o 404): se dice, no se pinta vacío. */
  actividadNoDisponible: boolean
  refetch: () => Promise<void>
}

export function useEstadoDelEquipo(abierto: boolean): UseEstadoDelEquipo {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [flota, setFlota] = useState<PilotoFlotaResponse | null>(null)
  const [actividad, setActividad] = useState<ActivityItem[]>([])
  const [cargando, setCargando] = useState(false)
  const [actividadNoDisponible, setActividadNoDisponible] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const leer = useCallback(async () => {
    if (!agencyId || !process.env.NEXT_PUBLIC_AGENT_URL) {
      setActividadNoDisponible(true)
      return
    }
    abortRef.current?.abort()
    const c = new AbortController()
    abortRef.current = c
    setCargando(true)
    const [f, a] = await Promise.allSettled([
      fetchPilotoFlota(agencyId, c.signal),
      fetchPilotoActivity(agencyId, 100, c.signal),
    ])
    if (c.signal.aborted) return
    setFlota(f.status === 'fulfilled' ? f.value.data : null)
    if (a.status === 'fulfilled' && a.value.data && !a.value.notAvailable) {
      setActividad(Array.isArray(a.value.data.items) ? a.value.data.items : [])
      setActividadNoDisponible(false)
    } else {
      setActividad([])
      setActividadNoDisponible(true)
    }
    setCargando(false)
  }, [agencyId])

  useEffect(() => {
    if (!abierto) return
    void leer()
    return () => abortRef.current?.abort()
  }, [abierto, leer])

  return { flota, actividad, cargando, actividadNoDisponible, refetch: leer }
}
