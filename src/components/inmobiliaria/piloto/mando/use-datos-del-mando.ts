'use client'

/**
 * Las dos fuentes del centro de mando:
 *
 *   · `useDatosReales()` — los MISMOS hooks de la torre del piloto automático
 *     (pulso, Bandeja, actividad, briefing, flota y director), sin tocarlos.
 *   · `useMuestraViva(activa)` — la muestra de la fase 1 (`muestra.ts`), con una
 *     acción nueva cada pocos segundos para ver la franja en vivo y las cifras
 *     que cuentan. Se borra en la fase 2.
 *
 * Las dos devuelven `DatosDelMando`: las direcciones no saben de dónde vino.
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import { usePilotoPulso } from '@/lib/hooks/piloto/use-piloto-pulso'
import { usePilotoInbox } from '@/lib/hooks/piloto/use-piloto-inbox'
import { usePilotoActivity } from '@/lib/hooks/piloto/use-piloto-activity'
import { usePilotoBriefing } from '@/lib/hooks/piloto/use-piloto-briefing'
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context'
import type { UseDirectorHoy, UseDirectorMetas } from '@/lib/hooks/piloto/use-piloto-director'
import type { ActivityItem } from '@/lib/api/piloto'

import { crearMuestra, GOTAS, type DatosDeMuestra } from './muestra'
import type { DatosDelMando, Pieza } from './tipos'

/** Lo mismo que pide la torre (`usePilotoActivity(50)`). */
export const LIMITE_DE_ACTIVIDAD = 50

/**
 * Las lecturas del director, de afuera: la pantalla real las comparte con la
 * tarjeta del director de siempre (su cajón), así un «Volver a planear» o una
 * meta aceptada se ven en el núcleo sin pedir dos veces.
 */
export interface LecturasDelDirector {
  hoy: UseDirectorHoy
  metas: UseDirectorMetas
}

export function useDatosReales(director: LecturasDelDirector): DatosDelMando {
  const pulso = usePilotoPulso()
  const inbox = usePilotoInbox()
  const actividad = usePilotoActivity(LIMITE_DE_ACTIVIDAD)
  const briefing = usePilotoBriefing()
  const flota = usePilotoFlotaCompartida()
  const { hoy, metas } = director

  return useMemo<DatosDelMando>(
    () => ({
      fuente: 'real',
      limiteDeActividad: LIMITE_DE_ACTIVIDAD,
      pulso: { data: pulso.data, isLoading: pulso.isLoading, error: pulso.error, notAvailable: pulso.notAvailable, reintentar: pulso.refetch },
      bandeja: {
        // Sin dato (error o 404) no hay Bandeja: nunca «0 esperan».
        data: inbox.error || inbox.notAvailable ? null : { items: inbox.items, total: inbox.total, porPrioridad: inbox.porPrioridad },
        isLoading: inbox.isLoading,
        error: inbox.error,
        notAvailable: inbox.notAvailable,
        reintentar: inbox.refetch,
      },
      actividad: {
        data: actividad.error || actividad.notAvailable ? null : actividad.items,
        isLoading: actividad.isLoading,
        error: actividad.error,
        notAvailable: actividad.notAvailable,
        reintentar: actividad.refetch,
      },
      briefing: { data: briefing.data, isLoading: briefing.isLoading, error: briefing.error, notAvailable: briefing.notAvailable, reintentar: briefing.refetch },
      flota: { data: flota.data, isLoading: flota.isLoading, error: flota.error, notAvailable: flota.notAvailable, reintentar: flota.refetch },
      hoy: { data: hoy.data, isLoading: hoy.isLoading, error: hoy.error, notAvailable: hoy.notAvailable, reintentar: hoy.refetch },
      metas: { data: metas.data, isLoading: metas.isLoading, error: metas.error, notAvailable: metas.notAvailable, reintentar: metas.refetch },
    }),
    [
      pulso.data, pulso.isLoading, pulso.error, pulso.notAvailable, pulso.refetch,
      inbox.items, inbox.total, inbox.porPrioridad, inbox.isLoading, inbox.error, inbox.notAvailable, inbox.refetch,
      actividad.items, actividad.isLoading, actividad.error, actividad.notAvailable, actividad.refetch,
      briefing.data, briefing.isLoading, briefing.error, briefing.notAvailable, briefing.refetch,
      flota.data, flota.isLoading, flota.error, flota.notAvailable, flota.refetch,
      hoy.data, hoy.isLoading, hoy.error, hoy.notAvailable, hoy.refetch,
      metas.data, metas.isLoading, metas.error, metas.notAvailable, metas.refetch,
    ],
  )
}

const lista = <T,>(data: T): Pieza<T> => ({ data, isLoading: false, error: null, notAvailable: false })

/** Cada cuánto llega una acción nueva en la muestra. */
export const CADA_CUANTO_GOTEA_MS = 6_500

/**
 * La muestra, viva: arranca con `crearMuestra(ahora)` y cada `CADA_CUANTO_GOTEA_MS`
 * entra una acción de `GOTAS` (con su efecto en los números del día) hasta que se
 * acaban. Con la pestaña oculta no gotea. `activa = false` no hace nada (la
 * página monta las dos fuentes y elige).
 */
export function useMuestraViva(activa: boolean): DatosDelMando {
  const [base, setBase] = useState<DatosDeMuestra | null>(null)
  const [gotas, setGotas] = useState(0)
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!activa) return
    // Se arma al ENCENDERSE (no al cargar el módulo): «hoy» es el de este momento.
    setBase(crearMuestra(Date.now()))
    setGotas(0)
  }, [activa])

  useEffect(() => {
    if (!activa) return
    const tic = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      setGotas((g) => (g < GOTAS.length ? g + 1 : g))
    }
    reloj.current = setInterval(tic, CADA_CUANTO_GOTEA_MS)
    return () => {
      if (reloj.current) clearInterval(reloj.current)
      reloj.current = null
    }
  }, [activa])

  // Cuándo llegó cada gota (para su hora en el feed): se fija la primera vez que se ve.
  const llegadas = useRef<number[]>([])
  useEffect(() => {
    if (!activa) llegadas.current = []
  }, [activa])

  return useMemo<DatosDelMando>(() => {
    const vacia: DatosDelMando = {
      fuente: 'muestra',
      limiteDeActividad: LIMITE_DE_ACTIVIDAD,
      pulso: { data: null, isLoading: true, error: null, notAvailable: false },
      bandeja: { data: null, isLoading: true, error: null, notAvailable: false },
      actividad: { data: null, isLoading: true, error: null, notAvailable: false },
      briefing: { data: null, isLoading: true, error: null, notAvailable: false },
      flota: { data: null, isLoading: true, error: null, notAvailable: false },
      hoy: { data: null, isLoading: true, error: null, notAvailable: false },
      metas: { data: null, isLoading: true, error: null, notAvailable: false },
    }
    if (!activa || !base) return vacia

    const caidas = GOTAS.slice(0, gotas)
    while (llegadas.current.length < caidas.length) llegadas.current.push(Date.now())

    const nuevas: ActivityItem[] = caidas
      .map((g, i) => ({ id: `muestra:gota:${i}`, at: new Date(llegadas.current[i] as number).toISOString(), ...g.semilla }))
      .reverse()
    const actividad = [...nuevas, ...base.actividad].slice(0, LIMITE_DE_ACTIVIDAD)

    const hoy = { ...base.pulso.hoy }
    const resueltas = new Set<string>()
    for (const g of caidas) {
      hoy.llamadas += g.efecto?.llamadas ?? 0
      hoy.conversacionesActivas = Math.max(0, hoy.conversacionesActivas + (g.efecto?.conversaciones ?? 0))
      hoy.decisionesResueltas += g.efecto?.resueltas ?? 0
      if (g.resuelve) resueltas.add(g.resuelve)
    }
    // El depósito que se estaba conciliando ya se concilió con la primera gota.
    const enCurso = gotas > 0 ? base.pulso.enCurso.filter((e) => e.id !== 'muestra:mov:1') : base.pulso.enCurso
    const items = base.bandeja.items.filter((i) => !resueltas.has(i.id))
    const porPrioridad = { ...base.bandeja.porPrioridad }
    for (const i of base.bandeja.items) if (resueltas.has(i.id)) porPrioridad[i.prioridad] = Math.max(0, porPrioridad[i.prioridad] - 1)

    return {
      fuente: 'muestra',
      limiteDeActividad: LIMITE_DE_ACTIVIDAD,
      pulso: lista({ ...base.pulso, hoy, enCurso }),
      bandeja: lista({ items, total: base.bandeja.total - resueltas.size, porPrioridad }),
      actividad: lista(actividad),
      briefing: lista(base.briefing),
      flota: lista(base.flota),
      hoy: lista(base.hoy),
      metas: lista(base.metas),
    }
  }, [activa, base, gotas])
}
