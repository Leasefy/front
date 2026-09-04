'use client'

/**
 * piloto-flota-context.tsx — UNA lectura de la flota para todo el panel.
 *
 * La píldora del header y el tray de procesos (abajo a la derecha) necesitan
 * lo mismo: el modo de la flota y lo que está en vivo. Dos hooks serían dos
 * polls por pantalla; el provider vive en el layout de inmobiliaria y los
 * dos leen de acá.
 *
 * Sin provider (un test, otra sección) se devuelve «no disponible»: nada se
 * pinta y nada se inventa.
 */

import { createContext, useContext, type ReactNode } from 'react'

import { usePilotoFlota, type UsePilotoFlotaResult } from './use-piloto-flota'

const SIN_PROVIDER: UsePilotoFlotaResult = {
  data: null,
  isLoading: false,
  error: null,
  notAvailable: true,
  busy: false,
  setModo: async () => ({ ok: false, error: 'not_configured' }),
  refetch: async () => {},
}

const PilotoFlotaContext = createContext<UsePilotoFlotaResult | null>(null)

export function PilotoFlotaProvider({ children }: { children: ReactNode }) {
  const flota = usePilotoFlota()
  return <PilotoFlotaContext.Provider value={flota}>{children}</PilotoFlotaContext.Provider>
}

export function usePilotoFlotaCompartida(): UsePilotoFlotaResult {
  return useContext(PilotoFlotaContext) ?? SIN_PROVIDER
}
