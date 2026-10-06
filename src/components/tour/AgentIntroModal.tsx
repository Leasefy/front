'use client'

/**
 * AgentIntroModal — la presentación de cada agente la primera vez que la
 * inmobiliaria entra a su espacio. Desde el 05-10-2026 es la dirección A
 * «Escenario» que eligió Nico (`components/agentes/presentacion/`): el orbe
 * grande del agente despierta en el centro de la marca —SÓLO con sus dos
 * anillos, sin las líneas grandes alrededor (Nico, 05-10 19:10)—, con lo que
 * hace por ti, lo que necesita de ti y su modo, y «¿Cómo funciona?», que abre
 * el cajón de explicaciones encima. Antes (02-10) era la tarjeta §Novedades
 * con el orbe (`PresentacionConOrbe`).
 *
 * The FIRST time the user enters an agent's workspace
 * (el workspace del agente dentro de su módulo) a centered announcement presents that
 * agent: what it does and how to work with it.
 *
 * 🔴 Una vez POR INMOBILIARIA, no por navegador (Nico, 23-09: «el onboarding
 * solo debe aparecer una sola vez por inmobiliaria»). El «ya la vi» vivía en
 * localStorage (`leasefy.agent-intro.<id>`): otro navegador u otra persona
 * de la misma agencia la volvía a ver. Ahora es la clave `agente:<id>` del
 * mismo mecanismo que el recorrido del panel (`PanelPrefsContext` →
 * `/inmobiliaria/onboarding-visto`): el fondo, Esc o la ✕ la dejan `omitido`,
 * «Entendido» `completo`, y mientras no se sabe si la agencia ya la vio no se
 * muestra.
 *
 * ── La cáscara ──────────────────────────────────────────────────────────────
 * El `Dialog` del DS (`ui/dialog`): foco atrapado y devuelto, Esc, velo, capa
 * `z-[300]`, la ✕ del producto y, bajo 640 px, la hoja que sube desde abajo.
 * La vista es `PresentacionDelAgente` (abierta o no, y qué hacer al cerrar);
 * `AgentIntroModal` sólo decide CUÁNDO sale. La vista previa
 * `/agentes-preview` abre la vista sola, sin la marca de la agencia.
 *
 * A11y: título y descripción anunciados (sr-only: el escenario los pinta); el
 * foco arranca en el llamado y vuelve a donde estaba al cerrar. El orbe es
 * decorativo (el título ya nombra al agente).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { PresentacionEscenario, fichaDelAgente } from '@/components/agentes/presentacion'
import { agentePorId, type IdDeAgente } from '@/lib/agentes/equipo'
import { MODOS_DEL_PILOTO, type AutonomiaModo } from '@/lib/api/piloto'
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context'
import { findAgentWorkspace } from '@/lib/nav/agentWorkspaceNav'
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext'
import {
  claveDeLaPresentacionDelAgente,
  type EstadoDelOnboarding,
} from '@/lib/api/onboarding-visto.service'

export interface AgentIntroConfig {
  /**
   * Agent id — the `agente:<id>` key of the agency's «ya la vio» + i18n block
   * name, y el agente del registro cuyo orbe se presenta.
   */
  id: IdDeAgente
  /** Route prefix under which this agent's workspace lives. */
  /** Slug del workspace en `agentWorkspaceNav.ts` (findAgentWorkspace decide cuál aplica). */
  slug: string
  titleKey: string
  descriptionKey: string
  /**
   * @deprecated Desde el 02-10-2026 el héroe es el orbe del agente; la foto de
   * la marca ya no se pinta. Queda para no romper a quien la lea.
   */
  image: string
}

// Una foto de la marca por agente (retirada del héroe el 02-10: ver `image`).
export const AGENT_INTROS: AgentIntroConfig[] = [
  {
    id: 'cobranza',
    slug: 'cobranza',
    titleKey: 'inmobiliaria.ai.intro.cobranza.title',
    descriptionKey: 'inmobiliaria.ai.intro.cobranza.description',
    image: '/images/features/leasefy-brand-01.jpg',
  },
  {
    id: 'cotizador',
    slug: 'asegurabilidad',
    titleKey: 'inmobiliaria.ai.intro.cotizador.title',
    descriptionKey: 'inmobiliaria.ai.intro.cotizador.description',
    image: '/images/features/leasefy-brand-03.jpg',
  },
  {
    id: 'avaluos',
    slug: 'avaluos',
    titleKey: 'inmobiliaria.ai.intro.avaluos.title',
    descriptionKey: 'inmobiliaria.ai.intro.avaluos.description',
    image: '/images/features/leasefy-brand-04.jpg',
  },
  {
    id: 'conciliacion',
    slug: 'conciliacion',
    titleKey: 'inmobiliaria.ai.intro.conciliacion.title',
    descriptionKey: 'inmobiliaria.ai.intro.conciliacion.description',
    image: '/images/features/leasefy-brand-05.jpg',
  },
  {
    id: 'estudio',
    slug: 'estudio',
    titleKey: 'inmobiliaria.ai.intro.estudio.title',
    descriptionKey: 'inmobiliaria.ai.intro.estudio.description',
    image: '/images/features/leasefy-brand-06.jpg',
  },
  {
    id: 'matching',
    slug: 'matching',
    titleKey: 'inmobiliaria.ai.intro.matching.title',
    descriptionKey: 'inmobiliaria.ai.intro.matching.description',
    image: '/images/features/leasefy-brand-07.jpg',
  },
  // 🔴 Sin workspace desde el 2026-09-16: `/pagos` dejó de ser la Sala del
  // agente de Pagos (NOTA al pie de `agentWorkspaceNav.ts`), así que
  // `findAgentWorkspace` ya no devuelve este slug y la presentación no se
  // muestra. Es lo correcto: anunciar «acá trabaja el agente de pagos» sobre la
  // plata de la inmobiliaria era la confusión que se retiró. Queda en la lista,
  // igual que `estudio`, para cuando el equipo vuelva.
  {
    id: 'pagos',
    slug: 'pagos',
    titleKey: 'inmobiliaria.ai.intro.pagos.title',
    descriptionKey: 'inmobiliaria.ai.intro.pagos.description',
    image: '/images/features/leasefy-brand-08.jpg',
  },
]

export interface AgentIntroModalProps {
  /** Current pathname (from usePathname in the host layout). */
  pathname: string
  /**
   * Suppress while the panel tour is open/visible — or while nobody knows yet
   * whether the agency saw it (it would start on top of this).
   */
  suppressed?: boolean
}

/** El respiro antes de abrir: que la pantalla del agente pinte primero. */
const ESPERA_AL_ENTRAR_MS = 600

export function AgentIntroModal({ pathname, suppressed = false }: AgentIntroModalProps) {
  const { estaVista, marcarVista } = usePanelPrefs()
  const [visibleId, setVisibleId] = useState<string | null>(null)
  /**
   * Radix devuelve el foco al disparador, y acá no hay disparador: se abre
   * sola. Se recuerda qué tenía el foco al abrir para devolverlo al cerrar.
   */
  const prevFocusRef = useRef<HTMLElement | null>(null)

  // El agente lo decide la MISMA función que las pestañas y el breadcrumb:
  // respeta el borde de segmento y el `excluir` (en /pagos/dispersiones no se
  // presenta el agente de Pagos; en /conciliacion-ia tampoco el de Conciliación).
  const slug = findAgentWorkspace(pathname)?.slug ?? null
  const agent = slug ? (AGENT_INTROS.find((a) => a.slug === slug) ?? null) : null
  const clave = agent ? claveDeLaPresentacionDelAgente(agent.id) : null
  // null = no se sabe si la agencia ya la vio → no se muestra.
  const vista = clave ? estaVista(clave) : null

  // Open with a small delay on the agency's first visit to the agent's workspace.
  useEffect(() => {
    if (suppressed || !agent || vista !== false) {
      setVisibleId(null)
      return
    }
    const timer = window.setTimeout(() => {
      prevFocusRef.current = document.activeElement as HTMLElement | null
      setVisibleId(agent.id)
    }, ESPERA_AL_ENTRAR_MS)
    return () => window.clearTimeout(timer)
  }, [suppressed, agent, vista])

  const cerrar = useCallback(
    (estado: EstadoDelOnboarding) => {
      if (visibleId) void marcarVista(claveDeLaPresentacionDelAgente(visibleId), estado)
      setVisibleId(null)
    },
    [visibleId, marcarVista],
  )

  const devolverElFoco = useCallback((e: Event) => {
    const previo = prevFocusRef.current
    prevFocusRef.current = null
    if (previo && previo.isConnected && previo !== document.body) {
      e.preventDefault()
      previo.focus()
    }
  }, [])

  const abierta = Boolean(agent && visibleId === agent.id)

  return (
    <PresentacionDelAgente
      agente={agent}
      abierta={abierta}
      onCerrar={cerrar}
      onCloseAutoFocus={devolverElFoco}
    />
  )
}

export interface PresentacionDelAgenteProps {
  /** El agente que se presenta (sin agente no se pinta nada). */
  agente: AgentIntroConfig | null
  abierta: boolean
  /** El fondo, Esc y la ✕: `omitido` · «Entendido»: `completo`. */
  onCerrar: (estado: EstadoDelOnboarding) => void
  /** Para devolver el foco a donde estaba (Radix lo devolvería al `body`). */
  onCloseAutoFocus?: (e: Event) => void
}

/**
 * La presentación de un agente, sin decidir cuándo sale. Desde el 05-10-2026
 * es la dirección A «Escenario» que eligió Nico (`PresentacionEscenario`,
 * `components/agentes/presentacion/`): el orbe del agente despierta en el
 * centro de la marca, con lo que hace por ti, lo que necesita de ti y su
 * modo. El modo y si el piloto automático está activo salen de la flota
 * (`usePilotoFlotaCompartida`, la misma lectura que la píldora del header);
 * sin flota, el modo con el que arranca todo agente: Copiloto. La usa
 * `AgentIntroModal` y la vista previa `/agentes-preview`.
 *
 * Un agente sin presentación propia (Pagos, que hoy no tiene espacio) no
 * pinta nada.
 */
export function PresentacionDelAgente({ agente, abierta, onCerrar, onCloseAutoFocus }: PresentacionDelAgenteProps) {
  const ficha = agente ? fichaDelAgente(agente.id) : null
  const { modo, pilotoActivo } = useModoDelAgente(agente?.id ?? null)
  if (!ficha) return null
  return (
    <PresentacionEscenario
      ficha={ficha}
      abierta={abierta}
      onCerrar={onCerrar}
      onCloseAutoFocus={onCloseAutoFocus}
      modo={modo}
      pilotoActivo={pilotoActivo}
      testid="presentacion-del-agente"
      testidCerrar="presentacion-del-agente-cerrar"
    />
  )
}

/**
 * El modo del agente para esta inmobiliaria y si el piloto automático está
 * activo, de la flota (`GET /ai-hub/autonomia`). Sin flota o sin su fila,
 * `undefined`: la presentación dice el modo con el que arranca (Copiloto).
 */
export function useModoDelAgente(id: IdDeAgente | null): { modo?: AutonomiaModo; pilotoActivo: boolean | null } {
  const flota = usePilotoFlotaCompartida().data
  if (!flota) return { pilotoActivo: null }
  const pilotoActivo = flota.piloto?.activo ?? flota.activo
  const clave = id ? agentePorId(id)?.autonomia : null
  const fila = clave ? flota.agentes.find((a) => a.agente === clave) : undefined
  const general = (MODOS_DEL_PILOTO as readonly string[]).includes(flota.modo) ? (flota.modo as AutonomiaModo) : undefined
  return { modo: fila?.modo ?? general, pilotoActivo }
}
