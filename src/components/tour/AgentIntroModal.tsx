'use client'

/**
 * AgentIntroModal — per-agent presentation card, rendered with the cadence
 * §Novedades `<FeatureAnnouncement>` (grainy aurora hero + glass Leasefy pill +
 * intro copy + "Empezar" CTA). Brand-photo hero was retired in favour of the
 * cadence aurora (Nico's call).
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
 * ── La cáscara (02-10-2026) ────────────────────────────────────────────────
 * El mismo patrón que `PilotoNovedad`, que ya resolvió la tarjeta dentro del
 * modal: el `Dialog` de Radix (foco atrapado y devuelto, Esc, velo, capa
 * `z-[300]` de los modales) con un Content transparente, y adentro la tarjeta
 * TAL CUAL la pinta `FeatureAnnouncement` —que trae su propio fondo, radio y
 * sombra— más la ✕ del producto (`ASPA_DE_CIERRE`). Antes era una cáscara
 * a mano (un portal con su capa en `z-[1000]`, sin ✕) con su propio Esc y su
 * propio manejo del foco. `FeatureAnnouncement` no se toca.
 *
 * A11y: título y descripción anunciados (sr-only: la tarjeta los pinta); el
 * foco vuelve a donde estaba al abrirse.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@phosphor-icons/react'
import { FeatureAnnouncement } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { findAgentWorkspace } from '@/lib/nav/agentWorkspaceNav'
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext'
import { ASPA_DE_CIERRE } from '@/components/ui/aspa-de-cierre'
import {
  claveDeLaPresentacionDelAgente,
  type EstadoDelOnboarding,
} from '@/lib/api/onboarding-visto.service'

export interface AgentIntroConfig {
  /** Agent id — the `agente:<id>` key of the agency's «ya la vio» + i18n block name. */
  id: string
  /** Route prefix under which this agent's workspace lives. */
  /** Slug del workspace en `agentWorkspaceNav.ts` (findAgentWorkspace decide cuál aplica). */
  slug: string
  titleKey: string
  descriptionKey: string
  image: string
}

// One DISTINCT brand image per agent (tour uses 02/09/15; free: 10-14, 16).
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
  const { t } = useI18n()
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
  const titulo = agent ? t(agent.titleKey) : ''
  const descripcion = agent ? t(agent.descriptionKey) : ''

  return (
    // El fondo, Esc y la ✕ la dejan de lado; «Entendido» es haberla leído.
    <DialogPrimitive.Root open={abierta} onOpenChange={(o) => !o && cerrar('omitido')}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[300] bg-black/60 motion-safe:animate-in motion-safe:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[300] max-h-[90dvh] w-[calc(100vw-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[20px] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          data-lenis-prevent
          data-testid="presentacion-del-agente"
          onCloseAutoFocus={devolverElFoco}
        >
          <DialogPrimitive.Title className="sr-only">{titulo}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{descripcion}</DialogPrimitive.Description>
          <FeatureAnnouncement
            appName="Leasefy"
            appInitial="L"
            title={titulo}
            description={descripcion}
            ctaLabel={t('inmobiliaria.ai.tour.finish')}
            onCta={() => cerrar('completo')}
            className="w-full"
          />
          <DialogPrimitive.Close
            aria-label={t('common.close')}
            className={`${ASPA_DE_CIERRE} absolute right-3 top-3`}
            data-testid="presentacion-del-agente-cerrar"
          >
            <X size={16} weight="bold" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
