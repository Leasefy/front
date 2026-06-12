'use client'

/**
 * AgentIntroModal — per-agent presentation card (same Relume/Givingli format
 * as PanelTour via FeatureAnnouncementCard).
 *
 * The FIRST time the user enters an agent's workspace
 * (/panel/inmobiliaria/ai/<agente>/…) a centered announcement presents that
 * agent: what it does and how to work with it. Dismissal persists per agent in
 * localStorage (any close — X, backdrop, Escape or CTA — marks it as seen).
 *
 * Each agent uses a DISTINCT brand image from public/images/features/
 * (pool leasefy-brand-01..16; PanelTour uses 02/09/15 — see assignments below).
 *
 * A11y mirrors PanelTour: Escape dismisses, autoFocus on the CTA (inside the
 * shared card), focus restoration on close, no dangerouslySetInnerHTML.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { FeatureAnnouncementCard } from './FeatureAnnouncementCard'

export interface AgentIntroConfig {
  /** Agent id — also the localStorage suffix + i18n block name. */
  id: string
  /** Route prefix under which this agent's workspace lives. */
  pathPrefix: string
  titleKey: string
  descriptionKey: string
  image: string
}

// One DISTINCT brand image per agent (tour uses 02/09/15; free: 10-14, 16).
export const AGENT_INTROS: AgentIntroConfig[] = [
  {
    id: 'cobranza',
    pathPrefix: '/panel/inmobiliaria/ai/cobranza',
    titleKey: 'inmobiliaria.ai.intro.cobranza.title',
    descriptionKey: 'inmobiliaria.ai.intro.cobranza.description',
    image: '/images/features/leasefy-brand-01.jpg',
  },
  {
    id: 'cotizador',
    pathPrefix: '/panel/inmobiliaria/ai/cotizador',
    titleKey: 'inmobiliaria.ai.intro.cotizador.title',
    descriptionKey: 'inmobiliaria.ai.intro.cotizador.description',
    image: '/images/features/leasefy-brand-03.jpg',
  },
  {
    id: 'avaluos',
    pathPrefix: '/panel/inmobiliaria/ai/avaluos',
    titleKey: 'inmobiliaria.ai.intro.avaluos.title',
    descriptionKey: 'inmobiliaria.ai.intro.avaluos.description',
    image: '/images/features/leasefy-brand-04.jpg',
  },
  {
    id: 'conciliacion',
    pathPrefix: '/panel/inmobiliaria/ai/conciliacion',
    titleKey: 'inmobiliaria.ai.intro.conciliacion.title',
    descriptionKey: 'inmobiliaria.ai.intro.conciliacion.description',
    image: '/images/features/leasefy-brand-05.jpg',
  },
  {
    id: 'estudio',
    pathPrefix: '/panel/inmobiliaria/ai/estudio',
    titleKey: 'inmobiliaria.ai.intro.estudio.title',
    descriptionKey: 'inmobiliaria.ai.intro.estudio.description',
    image: '/images/features/leasefy-brand-06.jpg',
  },
  {
    id: 'matching',
    pathPrefix: '/panel/inmobiliaria/ai/matching',
    titleKey: 'inmobiliaria.ai.intro.matching.title',
    descriptionKey: 'inmobiliaria.ai.intro.matching.description',
    image: '/images/features/leasefy-brand-07.jpg',
  },
  {
    id: 'pagos',
    pathPrefix: '/panel/inmobiliaria/ai/pagos',
    titleKey: 'inmobiliaria.ai.intro.pagos.title',
    descriptionKey: 'inmobiliaria.ai.intro.pagos.description',
    image: '/images/features/leasefy-brand-08.jpg',
  },
]

const STORAGE_PREFIX = 'leasefy.agent-intro.'

function isDismissed(id: string): boolean {
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${id}`) === '1'
  } catch {
    return true // storage unavailable → never nag
  }
}

function persistDismissed(id: string): void {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${id}`, '1')
  } catch {
    /* storage unavailable — session-only dismissal */
  }
}

export interface AgentIntroModalProps {
  /** Current pathname (from usePathname in the host layout). */
  pathname: string
  /** Suppress while the panel tour is open/visible. */
  suppressed?: boolean
}

export function AgentIntroModal({ pathname, suppressed = false }: AgentIntroModalProps) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [visibleId, setVisibleId] = useState<string | null>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  const agent = AGENT_INTROS.find((a) => pathname.startsWith(a.pathPrefix)) ?? null

  useEffect(() => {
    setMounted(true)
  }, [])

  // Open with a small delay on first visit to the agent's workspace.
  useEffect(() => {
    if (!mounted || suppressed || !agent) {
      setVisibleId(null)
      return
    }
    if (isDismissed(agent.id)) {
      setVisibleId(null)
      return
    }
    const timer = window.setTimeout(() => {
      prevFocusRef.current = document.activeElement as HTMLElement | null
      setVisibleId(agent.id)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [mounted, suppressed, agent])

  const dismiss = useCallback(() => {
    if (visibleId) persistDismissed(visibleId)
    setVisibleId(null)
    setTimeout(() => {
      prevFocusRef.current?.focus?.()
    }, 0)
  }, [visibleId])

  // Escape dismisses.
  useEffect(() => {
    if (!visibleId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismiss()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visibleId, dismiss])

  if (!mounted || !visibleId || !agent || visibleId !== agent.id) return null

  const titleId = `agent-intro-${agent.id}-title`
  const descId = `agent-intro-${agent.id}-desc`

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 motion-reduce:transition-none"
      onClick={dismiss}
    >
      <FeatureAnnouncementCard
        title={t(agent.titleKey)}
        description={t(agent.descriptionKey)}
        image={agent.image}
        newBadge={t('common.new')}
        titleId={titleId}
        descId={descId}
        currentStep={0}
        total={1}
        primaryLabel={t('inmobiliaria.ai.tour.finish')}
        dismissLabel={t('inmobiliaria.ai.tour.dismiss')}
        onNext={dismiss}
        onDismiss={dismiss}
        style={{ width: 560, maxWidth: 'calc(100vw - 2rem)' }}
        centered
        onCardClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  )
}
