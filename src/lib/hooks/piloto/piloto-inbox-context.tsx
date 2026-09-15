'use client'

/**
 * piloto-inbox-context.tsx — UNA lectura de la bandeja del Piloto para todo
 * el panel.
 *
 * `usePilotoBadge` (el número del sidebar) y `usePilotoInbox` (la bandeja
 * completa en /panel/inmobiliaria/piloto) pedían GET
 * /api/agency/{agencyId}/ai-hub/inbox cada 60s cada uno por su cuenta — el
 * sidebar vive en el layout, la bandeja en su página, así que visitar
 * /panel/inmobiliaria/piloto montaba los dos pollers a la vez: dos requests
 * idénticas en el mismo mount, y dos cada minuto después (T-0082 contract.md
 * §8: "call-site merge only", no hay wire nuevo).
 *
 * Mismo patrón que `piloto-flota-context.tsx`: UN fetch, UN timer; el
 * provider vive en el layout de inmobiliaria (junto a `PilotoFlotaProvider`)
 * y ambos hooks leen de acá sin cambiar su shape público — ningún call-site
 * (`layout.tsx`, `/piloto/page.tsx`) cambia su import.
 *
 * Sin provider (un test que monta el hook suelto, otra sección futura) se
 * devuelve «no disponible»: nada se pinta y nada se inventa — mismo contrato
 * que `SIN_PROVIDER` en piloto-flota-context.tsx.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoInbox, type PilotoInboxResponse } from '@/lib/api/piloto'

const POLL_MS = 60_000

export interface PilotoInboxCompartido {
  data: PilotoInboxResponse | null
  isLoading: boolean
  error: string | null
  /** true cuando el backend devolvió 404 — bandeja aún no publicada. */
  notAvailable: boolean
  refetch: () => Promise<void>
}

const SIN_PROVIDER: PilotoInboxCompartido = {
  data: null,
  isLoading: false,
  error: null,
  notAvailable: true,
  refetch: async () => {},
}

const PilotoInboxContext = createContext<PilotoInboxCompartido | null>(null)

/** El único fetch/poll real — vive dentro del provider, nunca en un consumidor. */
function usePilotoInboxInterno(): PilotoInboxCompartido {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<PilotoInboxResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const loadedOnceRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[piloto-inbox] NEXT_PUBLIC_AGENT_URL is not configured')
      setNotAvailable(true)
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setNotAvailable(true)
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      if (!loadedOnceRef.current) setIsLoading(true)
      const res = await fetchPilotoInbox(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
      loadedOnceRef.current = true
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch piloto inbox')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setNotAvailable(true)
      setIsLoading(false)
      return
    }
    void fetchData()
    const interval = setInterval(() => void fetchData(), POLL_MS)
    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}

export function PilotoInboxProvider({ children }: { children: ReactNode }) {
  const shared = usePilotoInboxInterno()
  return <PilotoInboxContext.Provider value={shared}>{children}</PilotoInboxContext.Provider>
}

export function usePilotoInboxCompartido(): PilotoInboxCompartido {
  return useContext(PilotoInboxContext) ?? SIN_PROVIDER
}
