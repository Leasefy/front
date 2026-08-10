'use client'

/**
 * use-acuerdos-generales.ts — los acuerdos que el agente puede cerrar SOLO.
 *
 * Un acuerdo puntual se arma para una persona. El general es la regla: «si el
 * deudor cabe en estas condiciones, tomalo y no me preguntes».
 *
 * Ojo con el vecino: `use-agency-policy` NO es esto. Esa es la política —el
 * TECHO— que recorta todo acuerdo con Math.min antes de que el agente ofrezca
 * nada. Bajar el techo no borra un acuerdo: lo recorta.
 *
 * Los tipos salen de `api/generated/agent`, nunca escritos a mano: el contrato
 * es del agente.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'
import type { components } from '@/lib/api/generated/agent'

export type AcuerdoGeneral = components['schemas']['CobranzaAcuerdoGeneral']
export type AcuerdoGeneralNuevo = components['schemas']['CobranzaAcuerdoGeneralCreate']
export type AcuerdoGeneralParche = components['schemas']['CobranzaAcuerdoGeneralPatch']

export interface UseAcuerdosGeneralesResult {
  acuerdos: AcuerdoGeneral[]
  isLoading: boolean
  /** Falló la carga. Distinto de «no hay ninguno», que es lista vacía. */
  error: string | null
  refetch: () => Promise<void>
  crear: (nuevo: AcuerdoGeneralNuevo) => Promise<AcuerdoGeneral>
  editar: (id: string, parche: AcuerdoGeneralParche) => Promise<AcuerdoGeneral>
  borrar: (id: string) => Promise<void>
}

/** El texto del back cuando lo hay; si no, uno que se entienda. */
async function mensajeDeError(res: Response, porDefecto: string): Promise<string> {
  try {
    const json = (await res.json()) as { error?: string }
    if (typeof json.error === 'string' && json.error.length > 0) return json.error
  } catch {
    /* cuerpo no-JSON: seguimos con el genérico */
  }
  return porDefecto
}

export function useAcuerdosGenerales(): UseAcuerdosGeneralesResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [acuerdos, setAcuerdos] = useState<AcuerdoGeneral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const base = useCallback((): string | null => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) return null
    return `${agentUrl}/api/agency/${agencyId}/cobranza/acuerdos-generales`
  }, [agencyId])

  const fetchOnce = useCallback(async () => {
    const url = base()
    if (!url) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(url)
      if (!res.ok) throw new Error(await mensajeDeError(res, `${res.status}`))
      const json = (await res.json()) as components['schemas']['CobranzaAcuerdosGeneralesResponse']
      setAcuerdos(json.acuerdos)
      setError(null)
    } catch (err) {
      // Con error NO se vacía la lista: mostrar «no hay acuerdos» cuando en
      // realidad no pudimos leerlos es la mentira que más caro sale acá.
      setError(err instanceof Error ? err.message : 'No pudimos cargar los acuerdos.')
    } finally {
      setIsLoading(false)
    }
  }, [base])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
  }, [fetchOnce, agencyId])

  useRefetchOnVisible(() => void fetchOnce(), Boolean(agencyId))

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  const crear = useCallback(
    async (nuevo: AcuerdoGeneralNuevo): Promise<AcuerdoGeneral> => {
      const url = base()
      if (!url) throw new Error('El agente no está configurado.')
      const res = await agentFetch(url, {
        method: 'POST',
        headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(nuevo),
      })
      if (!res.ok) {
        throw new Error(await mensajeDeError(res, 'No pudimos crear el acuerdo.'))
      }
      const creado = (await res.json()) as AcuerdoGeneral
      // Se reordena en el cliente con el MISMO criterio del motor, para que la
      // tabla no mienta hasta la próxima carga.
      setAcuerdos((prev) =>
        [...prev, creado].sort(
          (a, b) =>
            b.priority - a.priority || b.createdAt.localeCompare(a.createdAt),
        ),
      )
      return creado
    },
    [base],
  )

  const editar = useCallback(
    async (id: string, parche: AcuerdoGeneralParche): Promise<AcuerdoGeneral> => {
      const url = base()
      if (!url) throw new Error('El agente no está configurado.')
      const res = await agentFetch(`${url}/${id}`, {
        method: 'PATCH',
        headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(parche),
      })
      if (!res.ok) {
        throw new Error(await mensajeDeError(res, 'No pudimos guardar el cambio.'))
      }
      const actualizado = (await res.json()) as AcuerdoGeneral
      setAcuerdos((prev) => prev.map((a) => (a.id === id ? actualizado : a)))
      return actualizado
    },
    [base],
  )

  const borrar = useCallback(
    async (id: string): Promise<void> => {
      const url = base()
      if (!url) throw new Error('El agente no está configurado.')
      const res = await agentFetch(`${url}/${id}`, {
        method: 'DELETE',
        headers: agentAuthHeaders(),
      })
      if (!res.ok) {
        throw new Error(await mensajeDeError(res, 'No pudimos borrar el acuerdo.'))
      }
      setAcuerdos((prev) => prev.filter((a) => a.id !== id))
    },
    [base],
  )

  return { acuerdos, isLoading, error, refetch, crear, editar, borrar }
}
