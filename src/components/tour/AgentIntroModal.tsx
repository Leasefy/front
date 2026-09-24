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
 * `/inmobiliaria/onboarding-visto`): el fondo o Esc la dejan `omitido`,
 * «Entendido» `completo`, y mientras no se sabe si la agencia ya la vio no se
 * muestra.
 *
 * A11y: role=dialog + aria-label, Escape dismisses, focus lands on the dialog
 * on open and is restored on close.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FeatureAnnouncement } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import { findAgentWorkspace } from '@/lib/nav/agentWorkspaceNav'
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext'
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

export function AgentIntroModal({ pathname, suppressed = false }: AgentIntroModalProps) {
  const { t } = useI18n()
  const { estaVista, marcarVista } = usePanelPrefs()
  const [mounted, setMounted] = useState(false)
  const [visibleId, setVisibleId] = useState<string | null>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // El agente lo decide la MISMA función que las pestañas y el breadcrumb:
  // respeta el borde de segmento y el `excluir` (en /pagos/dispersiones no se
  // presenta el agente de Pagos; en /conciliacion-ia tampoco el de Conciliación).
  const slug = findAgentWorkspace(pathname)?.slug ?? null
  const agent = slug ? (AGENT_INTROS.find((a) => a.slug === slug) ?? null) : null
  const clave = agent ? claveDeLaPresentacionDelAgente(agent.id) : null
  // null = no se sabe si la agencia ya la vio → no se muestra.
  const vista = clave ? estaVista(clave) : null

  useEffect(() => {
    setMounted(true)
  }, [])

  // Open with a small delay on the agency's first visit to the agent's workspace.
  useEffect(() => {
    if (!mounted || suppressed || !agent || vista !== false) {
      setVisibleId(null)
      return
    }
    const timer = window.setTimeout(() => {
      prevFocusRef.current = document.activeElement as HTMLElement | null
      setVisibleId(agent.id)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [mounted, suppressed, agent, vista])

  const cerrar = useCallback(
    (estado: EstadoDelOnboarding) => {
      if (visibleId) void marcarVista(claveDeLaPresentacionDelAgente(visibleId), estado)
      setVisibleId(null)
      setTimeout(() => {
        prevFocusRef.current?.focus?.()
      }, 0)
    },
    [visibleId, marcarVista],
  )
  // El fondo y Esc la dejan de lado; «Entendido» es haberla leído.
  const dismiss = useCallback(() => cerrar('omitido'), [cerrar])
  const entendido = useCallback(() => cerrar('completo'), [cerrar])

  // Escape dismisses; focus lands on the dialog when it opens.
  useEffect(() => {
    if (!visibleId) return
    const raf = requestAnimationFrame(() => dialogRef.current?.focus())
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismiss()
      }
    }
    document.addEventListener('keydown', handler)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handler)
    }
  }, [visibleId, dismiss])

  if (!mounted || !visibleId || !agent || visibleId !== agent.id) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-4 motion-reduce:transition-none"
      onClick={dismiss}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t(agent.titleKey)}
        className="outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <FeatureAnnouncement
          appName="Leasefy"
          appInitial="L"
          title={t(agent.titleKey)}
          description={t(agent.descriptionKey)}
          ctaLabel={t('inmobiliaria.ai.tour.finish')}
          onCta={entendido}
          className="max-w-[calc(100vw-2rem)]"
        />
      </div>
    </div>,
    document.body,
  )
}
