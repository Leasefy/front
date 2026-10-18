'use client'

/**
 * useCobrosEnLaBandeja — los links de Cobri que esperan una aprobación en la
 * Bandeja del Piloto (COBRI-4, QA de los agentes, 16-10-2026).
 *
 * Con Cobri en Copiloto, el aviso de cada cuota no sale solo: queda en la
 * Bandeja con «Aprobar y enviar». La pantalla de Cobri decía «Cobri todavía no
 * le ha escrito por esta cuota» y el caso quedaba en la página 23 de la
 * Bandeja. Esto lee la Bandeja del micro y devuelve, por cuota, el caso que la
 * espera (el micro manda `cuotaId` en la fila del cobro retenido).
 *
 * Si la Bandeja no contesta no se afirma nada: la pantalla sigue como estaba.
 */

import { useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoInbox, type InboxItem } from '@/lib/api/piloto'

export interface CobrosEnLaBandeja {
  /** cuotaId → id del caso en la Bandeja (`hold:…`). */
  porCuota: ReadonlyMap<string, string>
  /** Los casos de Cobri que esperan, con o sin cuota (`hold:…`). */
  ids: readonly string[]
  /** Cuántos cobros de Cobri esperan, con o sin cuota. */
  total: number
}

const NINGUNO: CobrosEnLaBandeja = { porCuota: new Map(), ids: [], total: 0 }

/** Los cobros de Cobri retenidos de una Bandeja. Pura, para las pruebas. */
export function cobrosDeCobriEnLaBandeja(items: readonly InboxItem[]): CobrosEnLaBandeja {
  const deCobri = items.filter((i) => i.agente === 'pagos' && i.fuente === 'retenido')
  const porCuota = new Map<string, string>()
  for (const i of deCobri) if (i.cuotaId) porCuota.set(i.cuotaId, i.id)
  return { porCuota, ids: deCobri.map((i) => i.id), total: deCobri.length }
}

export function useCobrosEnLaBandeja(): CobrosEnLaBandeja {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [lectura, setLectura] = useState<CobrosEnLaBandeja>(NINGUNO)

  useEffect(() => {
    if (!agencyId) return
    const control = new AbortController()
    fetchPilotoInbox(agencyId, control.signal)
      .then((r) => {
        if (!control.signal.aborted) setLectura(r.data ? cobrosDeCobriEnLaBandeja(r.data.items) : NINGUNO)
      })
      .catch(() => {
        /* sin Bandeja no se afirma nada */
      })
    return () => control.abort()
  }, [agencyId])

  return lectura
}
