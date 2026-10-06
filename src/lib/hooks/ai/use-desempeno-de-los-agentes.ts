'use client'

/**
 * Lo que hizo cada agente con manos en los últimos 30 días (`GET {micro}/api/agency/{id}/ai-hub/desempeno`).
 *
 * 🔴 QA-IA-95 (05-10-2026, IA95-08): Desempeño IA dejaba afuera a Fixi, Avali, Vidi, Niti, Imana y el
 * precio contra la vacancia: lo suyo vive en las acciones del Piloto del back. Un micro sin la ruta (404)
 * deja la pantalla como antes (`sinLaRuta`); `disponible: false` se dice; un fallo va entero a la pantalla.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

export interface DesempenoDelAgente {
  agente: string
  nombre: string
  hechas: number
  fallidas: number
  deshechas: number
  descartadas: number
  programadas: number
  esperan: number
}
export interface DesempenoDeLosAgentes {
  disponible: boolean
  dias: number
  recortado: boolean
  agentes: DesempenoDelAgente[]
}

export function useDesempenoDeLosAgentes() {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<DesempenoDeLosAgentes | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [sinLaRuta, setSinLaRuta] = useState(false)

  const traer = useCallback(async () => {
    const base = process.env.NEXT_PUBLIC_AGENT_URL
    if (!base || !agencyId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await agentFetch(`${base}/api/agency/${agencyId}/ai-hub/desempeno`)
      if (res.status === 404) {
        setSinLaRuta(true)
        setData(null)
        setError(null)
        return
      }
      if (!res.ok) {
        setError(await falloDelMicro(res))
        return
      }
      setData((await res.json()) as DesempenoDeLosAgentes)
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    void traer()
  }, [traer])

  return { data, isLoading, error, sinLaRuta, refetch: traer }
}
