'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import type { IdDeAgente } from '@/lib/agentes/equipo'
import type { AgentExecution } from '@/lib/types/beta-chat'

import { EquipoDeAgentes } from './EquipoDeAgentes'

interface EquipoDeAgentesApi {
  /** Abre «El equipo», en el agente pedido (por defecto, el orquestador). */
  abrir: (agente?: IdDeAgente) => void
  cerrar: () => void
  abierto: boolean
}

const Ctx = createContext<EquipoDeAgentesApi | null>(null)

/**
 * Monta el modal UNA vez y deja que cualquier parte del chat lo abra con
 * `useEquipoDeAgentes().abrir('cobranza')`. Va alrededor del chat (por
 * ejemplo en el layout de la conversación). `ejecuciones` = las
 * `AgentExecution` de la conversación abierta, para «En esta conversación».
 */
export function EquipoDeAgentesProvider({
  children,
  ejecuciones,
}: {
  children: ReactNode
  ejecuciones?: readonly AgentExecution[]
}) {
  const [abierto, setAbierto] = useState(false)
  const [agente, setAgente] = useState<IdDeAgente>('orquestador')
  const abrir = useCallback((id?: IdDeAgente) => {
    setAgente(id ?? 'orquestador')
    setAbierto(true)
  }, [])
  const cerrar = useCallback(() => setAbierto(false), [])
  const api = useMemo(() => ({ abrir, cerrar, abierto }), [abrir, cerrar, abierto])
  return (
    <Ctx.Provider value={api}>
      {children}
      <EquipoDeAgentes
        open={abierto}
        onOpenChange={setAbierto}
        agenteInicial={agente}
        ejecucionesDeLaConversacion={ejecuciones}
      />
    </Ctx.Provider>
  )
}

/**
 * `abrir(id?)` del modal del equipo. Fuera del provider devuelve un `abrir`
 * que no hace nada (y `disponible: false`), para que un botón no reviente si
 * alguien lo pinta sin montar el provider.
 */
export function useEquipoDeAgentes(): EquipoDeAgentesApi & { disponible: boolean } {
  const api = useContext(Ctx)
  if (!api) return { abrir: () => {}, cerrar: () => {}, abierto: false, disponible: false }
  return { ...api, disponible: true }
}
