'use client'

import { AgentOrb, type AgentOrbLook, type AgentOrbSize } from '@leasefy/cadence'

import { agentePorId, nombreDelAgente, type AgenteDelEquipo, type IdDeAgente } from '@/lib/agentes/equipo'
import { ESTADO_DEL_ORBE, type EstadoDelOrbe } from '@/lib/agentes/agente-que-habla'
import { useI18n } from '@/lib/i18n'

export interface OrbeDeAgenteProps {
  /** El agente: su id del registro o el objeto. */
  agente: IdDeAgente | AgenteDelEquipo
  estado?: EstadoDelOrbe
  /** `xs` 16 · `sm` 24 · `md` 36 · `lg` 56 · `xl` 96, o px. */
  tamano?: AgentOrbSize | number
  /** Sin movimiento (filas largas). El que habla no debería ir quieto. */
  quieto?: boolean
  /** Decorativo: no se anuncia (cuando el nombre ya está escrito al lado). */
  decorativo?: boolean
  /**
   * Seda, bruma o nebulosa. Sin esto manda el `<AgentOrbLookProvider>` más
   * cercano o el de por defecto de Cadence (`AGENT_ORB_DEFAULT_LOOK`).
   */
  look?: AgentOrbLook
  className?: string
}

/**
 * El orbe de un agente del equipo: paleta, semilla y variante salen del
 * registro (`src/lib/agentes/equipo.ts`), así que un agente se ve igual en el
 * chat, en el modal del equipo y en cualquier chip.
 *
 * Desde Cadence v1.2.0 lo pinta un shader (fluido de luz) con UN solo contexto
 * WebGL para todos los orbes de la página; sin WebGL cae al orbe SVG. Ningún
 * llamador tiene que hacer nada distinto.
 */
export function OrbeDeAgente({
  agente,
  estado = 'quieto',
  tamano = 'md',
  quieto = false,
  decorativo = false,
  look,
  className,
}: OrbeDeAgenteProps) {
  const { t } = useI18n()
  const a = typeof agente === 'string' ? agentePorId(agente) : agente
  const nombre = nombreDelAgente(a, t)
  return (
    <AgentOrb
      palette={a.orbe.paleta}
      seed={a.orbe.semilla}
      variant={a.orbe.variante}
      state={ESTADO_DEL_ORBE[estado]}
      size={tamano}
      still={quieto}
      look={look}
      label={decorativo ? null : t(`agentes.orbe.${estado}`, { nombre })}
      data-agente={a.id}
      data-estado={estado}
      className={className}
    />
  )
}
